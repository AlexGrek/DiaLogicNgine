import { GameExecManager } from "../../dialogic/src/exec/GameExecutor";
import {
  HistoryRecord,
  InGameNotification,
  State,
  UiObjectId,
  createInitialState,
  getVisitedLocations,
} from "../../dialogic/src/exec/GameState";
import {
  CharDialogRenderView,
  DialogRenderView,
  LocationRenderView,
  PacRenderView,
  RenderLink,
} from "../../dialogic/src/exec/RenderView";
import { createEmptyFact, getFact } from "../../dialogic/src/game/Fact";
import {
  ENGINE_VERSION,
  GameDescription,
  createDefaultConfig,
  createDefaultDevConfig,
  createDefaultVisuals,
} from "../../dialogic/src/game/GameDescription";
import { initGameUiElementDescr } from "../../dialogic/src/game/GameUiElementDescr";
import { getItemByIdOrUnknown } from "../../dialogic/src/game/Items";
import { getLoc } from "../../dialogic/src/game/Loc";
import { loadJsonStringAndPatch } from "../../dialogic/src/game/Patches";
import { createTranslations } from "../../dialogic/src/exec/Localization";
import type {
  ActPayload,
  DebugApplyOptions,
  DiscussTopicItem,
  InspectFactItem,
  InspectInventoryItem,
  InspectPersonItem,
  InspectPlaceItem,
  InspectResult,
  InspectSection,
  TurnAvailableImages,
  TurnDiscussTopics,
  TurnHudMeter,
  TurnLink,
  TurnPayload,
  TurnResult,
  TurnRoute,
  TurnUsableItem,
  TurnZone,
} from "./protocol";

function normalizeAndPatchGame(raw: unknown): GameDescription {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Game JSON must be an object");
  }
  const obj = { ...(raw as Record<string, unknown>) };
  if (typeof obj.engineVersion !== "string" || !obj.engineVersion) {
    obj.engineVersion = ENGINE_VERSION;
  }

  const patched = loadJsonStringAndPatch(JSON.stringify(obj), ENGINE_VERSION);

  // Fill optional collections for sparse or hand-crafted games.
  if (!patched.general) {
    patched.general = { name: "Untitled", version: "1.0", description: "", authors: [], extras: {} };
  }
  if (!patched.general.extras) {
    patched.general.extras = {};
  }
  if (!Array.isArray(patched.dialogs)) patched.dialogs = [];
  if (!Array.isArray(patched.chars)) patched.chars = [];
  if (!Array.isArray(patched.roles)) patched.roles = [];
  if (!Array.isArray(patched.locs)) patched.locs = [];
  if (!Array.isArray(patched.props)) patched.props = [];
  if (!Array.isArray(patched.facts)) patched.facts = [];
  if (!Array.isArray(patched.items)) patched.items = [];
  if (!Array.isArray(patched.events)) patched.events = [];
  if (!Array.isArray(patched.eventHosts)) patched.eventHosts = [];
  if (!Array.isArray(patched.objectives)) patched.objectives = [];
  if (!Array.isArray(patched.situations)) patched.situations = [];
  if (!Array.isArray(patched.pacWidgets)) patched.pacWidgets = [];
  if (!Array.isArray(patched.functions)) patched.functions = [];
  if (!Array.isArray(patched.hooks)) patched.hooks = [];
  if (!patched.uiElements) patched.uiElements = initGameUiElementDescr();
  if (!Array.isArray(patched.uiElements.meters)) patched.uiElements.meters = [];
  if (!patched.translations) patched.translations = createTranslations();
  if (!patched.config) patched.config = createDefaultConfig();
  if (!patched.dev) patched.dev = createDefaultDevConfig();
  if (!patched.visuals) patched.visuals = createDefaultVisuals();

  return patched;
}

function serializeLinks(links: RenderLink[]): TurnLink[] {
  return links.map((l) => ({
    index: l.index,
    text: l.text,
    disabled: l.disabled,
    disabled_reason: l.disabled ? l.disabledReason : "",
    visited: l.visited,
  }));
}

const STATE_ARRAYS = [
  "positionStack",
  "positionHistory",
  "shortHistory",
  "knownFacts",
  "knownPeople",
  "knownPlaces",
  "notifications",
  "carriedItems",
  "happenedEvents",
] as const;

/** Cheap structural guard so a bad debug patch fails loudly instead of corrupting a session. */
function validateStateShape(state: unknown): asserts state is State {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("State must be an object");
  }
  const s = state as Record<string, unknown>;
  if (!s.position || typeof s.position !== "object") {
    throw new Error("State.position must be an object");
  }
  if (!s.props || typeof s.props !== "object" || Array.isArray(s.props)) {
    throw new Error("State.props must be an object");
  }
  if (!s.progress || typeof s.progress !== "object") {
    throw new Error("State.progress must be an object");
  }
  if (typeof s.stepCount !== "number") {
    throw new Error("State.stepCount must be a number");
  }
  for (const key of STATE_ARRAYS) {
    if (!Array.isArray(s[key])) {
      throw new Error(`State.${key} must be an array`);
    }
  }
  for (const c of s.carriedItems as unknown[]) {
    const item = c as Record<string, unknown>;
    if (!item || typeof item.item !== "string" || typeof item.quantity !== "number") {
      throw new Error("State.carriedItems entries must be {item: string, quantity: number}");
    }
  }
}

export class GameSessionRunner {
  private game: GameDescription | null = null;
  private exec: GameExecManager | null = null;
  private state: State | null = null;
  private lastBg: string | null = null;

  private mustReady(): { game: GameDescription; exec: GameExecManager; state: State } {
    if (!this.game || !this.exec || !this.state) {
      throw new Error("Session is not initialized");
    }
    return { game: this.game, exec: this.exec, state: this.state };
  }

  public init(rawGame: unknown, savedState?: State | null): TurnResult {
    this.game = normalizeAndPatchGame(rawGame);
    this.exec = new GameExecManager(this.game);
    if (savedState) {
      this.state = savedState;
      this.lastBg = savedState.background ?? null;
      return { state: this.state, turn: this.buildTurn(null, []) };
    }
    const initial = createInitialState(this.game);
    this.state = this.exec.executeEntry(initial);
    this.lastBg = null;
    const initialNotifs = this.state.notifications ? [...this.state.notifications] : [];
    return { state: this.state, turn: this.buildTurn(null, initialNotifs) };
  }

  public render(): TurnResult {
    const { state } = this.mustReady();
    return { state, turn: this.buildTurn(this.lastBg, []) };
  }

  public loadState(savedState: State): TurnResult {
    this.mustReady();
    this.state = savedState;
    this.lastBg = null;
    return { state: this.state, turn: this.buildTurn(null, []) };
  }

  /**
   * Developer-only: load the game and build a fresh, NOT yet entered initial
   * state (startup entry scripts are skipped). The caller then patches it and
   * finishes with debugApply.
   */
  public debugInit(rawGame: unknown, position: UiObjectId | null): { state: State } {
    this.game = normalizeAndPatchGame(rawGame);
    this.exec = new GameExecManager(this.game);
    const initial = createInitialState(this.game);
    if (position) {
      initial.position = position;
    }
    this.state = initial;
    this.lastBg = null;
    return { state: initial };
  }

  /**
   * Developer-only: replace the session state with `base` (already patched by
   * the caller), optionally move to `position`, run `script`, then (optionally)
   * enter the current position. Throws instead of persisting a broken state.
   */
  public debugApply(base: State, options: DebugApplyOptions): TurnResult {
    const { exec } = this.mustReady();
    validateStateShape(base);
    let state: State = JSON.parse(JSON.stringify(base));
    const prevNotifLen = state.notifications.length;
    const hadError = Boolean(state.fatalError);

    if (options.position) {
      state.position = options.position;
      state.dialogPage = 0;
      state.quickReplyText = null;
    }
    this.requireValidPosition(state);
    if (state.position.kind === "location") {
      state.location = state.position.location;
    } else if (state.position.kind === "chardialog") {
      state.charDialog = state.position.char;
    }

    if (options.script && options.script.trim()) {
      state = exec.modifyStateScript(state, options.script);
      if (state.fatalError && !hadError) {
        throw new Error(`Debug script failed: ${state.fatalError.message}`);
      }
    }
    const runEntry = options.run_entry ?? Boolean(options.position);
    if (runEntry) {
      state = exec.executeEntry(state);
      if (state.fatalError && !hadError) {
        throw new Error(`Entry of ${JSON.stringify(state.position)} failed: ${state.fatalError.message}`);
      }
    }

    const newNotifications =
      state.notifications.length > prevNotifLen ? state.notifications.slice(prevNotifLen) : [];
    this.state = state;
    this.lastBg = null;
    return { state, turn: this.buildTurn(null, newNotifications) };
  }

  private requireValidPosition(state: State): void {
    const { exec } = this.mustReady();
    const pos = state.position as Partial<UiObjectId> & Record<string, unknown>;
    const shape = JSON.stringify(pos);
    if (pos.kind === "window") {
      if (!exec.getCurrentDialogWindow(state)) {
        throw new Error(`No dialog window ${shape}; expected {kind:'window', dialog, window} of an existing window`);
      }
    } else if (pos.kind === "location") {
      if (!exec.getCurrentLocation(state)) {
        throw new Error(`No location ${shape}; expected {kind:'location', location:<loc uid>}`);
      }
    } else if (pos.kind === "chardialog") {
      if (!exec.getCurrentCharDialog(state)) {
        throw new Error(`No character conversation ${shape}; expected {kind:'chardialog', char:<char uid with a dialog>}`);
      }
    } else {
      throw new Error(`Invalid position ${shape}; kind must be 'window', 'location' or 'chardialog'`);
    }
  }

  private getDiscussTopics(state: State, view: CharDialogRenderView): TurnDiscussTopics {
    const { game, exec } = this.mustReady();
    const people: DiscussTopicItem[] = view.dialogOptions.canDiscussChars
      ? state.knownPeople
          .map((uid) => {
            const descr = exec.renderer.getCharInfoDescription(state, uid);
            return { uid, name: descr.name, visible: descr.charObject.discussable };
          })
          .filter((x) => x.visible)
          .map(({ uid, name }) => ({ uid, name }))
      : [];

    const facts: DiscussTopicItem[] = view.dialogOptions.canDiscussFacts
      ? state.knownFacts
          .map((uid) => {
            const fact = getFact(game, uid) ?? createEmptyFact(uid);
            return { uid: fact.uid, name: fact.short || uid, visible: fact.discussable };
          })
          .filter((x) => x.visible)
          .map(({ uid, name }) => ({ uid, name }))
      : [];

    const items: DiscussTopicItem[] = view.dialogOptions.canDiscussItems
      ? state.carriedItems.map((carried) => {
          const item = getItemByIdOrUnknown(game.items, carried.item);
          return { uid: carried.item, name: item.name };
        })
      : [];

    const places: DiscussTopicItem[] = view.dialogOptions.canDiscussLocations
      ? state.knownPlaces
          .map((uid) => {
            const loc = getLoc(game, uid);
            if (!loc) return { uid, name: uid, visible: true };
            return { uid, name: loc.displayName || uid, visible: loc.discussable };
          })
          .filter((x) => x.visible)
          .map(({ uid, name }) => ({ uid, name }))
      : [];

    return { people, facts, items, places };
  }

  private getUsableItems(state: State, widget: string): TurnUsableItem[] {
    if (widget !== "dialog" || state.position.kind !== "window") {
      return [];
    }
    const { game } = this.mustReady();
    return state.carriedItems.map((carried) => {
      const item = getItemByIdOrUnknown(game.items, carried.item);
      return {
        uid: carried.item,
        name: item.name,
        quantity: carried.quantity,
      };
    });
  }

  private collectItemImages(state: State): Record<string, string> {
    const { game } = this.mustReady();
    const out: Record<string, string> = {};
    for (const carried of state.carriedItems) {
      const item = getItemByIdOrUnknown(game.items, carried.item);
      const ref = (item.image || item.thumbnail || "").trim();
      if (ref) {
        out[carried.item] = ref;
      }
    }
    return out;
  }

  private buildTurn(prevBg: string | null, newNotifications: InGameNotification[]): TurnPayload {
    const { game, exec, state } = this.mustReady();
    const rendered = exec.renderer.render(state, prevBg);
    const w = rendered.uiWidgetView;

    let text = "";
    let pageIndex = 0;
    let pageCount = 1;
    let speaker: TurnPayload["scene"]["speaker"] = null;
    const stage: TurnPayload["scene"]["stage"] = [];
    const stageImages: Record<string, string> = {};
    let avatarRef: string | null = null;
    let locationInfo: TurnPayload["scene"]["location"] = null;
    let pacInfo: TurnPayload["scene"]["pac"] = null;
    let errorText: string | null = null;
    let canContinue = false;
    let continueMode: TurnPayload["actions"]["continue_mode"] = null;
    let links: TurnLink[] = [];
    let routes: TurnRoute[] = [];
    let zones: TurnZone[] = [];
    let discussTopics: TurnDiscussTopics | null = null;
    const routeImages: Record<string, string> = {};
    let effectiveBg: string | null = state.background?.trim() ? state.background.trim() : null;
    let positionSummary = "";

    if (w.widget === "dialog") {
      const dw = w as DialogRenderView;
      text = dw.text;
      pageIndex = dw.pageIndex;
      pageCount = dw.pageCount;
      if (dw.actor) {
        avatarRef = dw.actor.avatar?.trim() || null;
        speaker = {
          char_uid: dw.actor.char.uid,
          name: dw.actor.name,
          has_avatar: Boolean(avatarRef),
        };
      }
      for (const p of dw.stage ?? []) {
        stage.push({ char_uid: p.char, name: p.name, look: p.look ?? null, speaking: p.speaking });
        stageImages[p.char] = p.image;
      }
      if (dw.pageIndex < dw.pageCount - 1) {
        canContinue = true;
        continueMode = "next_page";
      } else if (dw.continueLink != null) {
        canContinue = !dw.continueLink.disabled;
        continueMode = "continue_link";
      } else {
        links = serializeLinks(dw.links);
      }
      if (state.position.kind === "window") {
        positionSummary = speaker
          ? `${speaker.name} (${state.position.dialog}/${state.position.window})`
          : `Dialog ${state.position.dialog}/${state.position.window}`;
      } else {
        positionSummary = "Dialog";
      }
    } else if (w.widget === "char") {
      const cw = w as CharDialogRenderView;
      const charInfo = exec.renderer.getCharInfoDescription(state, cw.char.uid);
      avatarRef = charInfo.avatar?.trim() || null;
      speaker = {
        char_uid: cw.char.uid,
        name: charInfo.name,
        has_avatar: Boolean(avatarRef),
      };
      text = cw.text;
      pageIndex = cw.pageIndex;
      pageCount = cw.pageCount;
      if (cw.pageIndex < cw.pageCount - 1) {
        canContinue = true;
        continueMode = "next_page";
      } else if (cw.continueLink != null) {
        canContinue = !cw.continueLink.disabled;
        continueMode = "continue_link";
      } else {
        links = serializeLinks(cw.links);
        discussTopics = this.getDiscussTopics(state, cw);
      }
      positionSummary = `Talking with ${charInfo.name}`;
    } else if (w.widget === "location") {
      const lw = w as LocationRenderView;
      locationInfo = {
        uid: lw.location.uid,
        name: lw.location.displayName || lw.location.uid,
      };
      text = lw.text;
      links = serializeLinks(lw.links);
      routes = lw.routes.map((r) => {
        const thumb = r.thumbnail?.trim() || null;
        if (thumb) {
          routeImages[r.destination.uid] = thumb;
        }
        return {
          index: r.index,
          uid: r.destination.uid,
          name: r.name,
          disabled: r.disabled,
          disabled_reason: r.disabled ? r.disabledReason : "",
          has_thumbnail: Boolean(thumb),
        };
      });
      positionSummary = `Location: ${locationInfo.name}`;
    } else if (w.widget === "pac") {
      const pw = w as PacRenderView;
      pacInfo = {
        id: pw.pac.id,
        name: pw.pac.id,
      };
      if (pw.pac.background?.trim()) {
        effectiveBg = pw.pac.background.trim();
      }
      zones = pw.items.map((z, idx) => ({
        index: idx,
        id: z.zone.id,
        name: z.zone.name || z.zone.id,
        disabled: z.disabled,
        disabled_reason: z.disabled ? z.disabledReason : "",
        image_ref: z.zone.image?.trim() || null,
        bounds: {
          x: z.zone.x,
          y: z.zone.y,
          width: z.zone.width,
          height: z.zone.height,
        },
      }));
      positionSummary = `Scene: ${pacInfo.name}`;
    } else {
      errorText = w.errorText;
      positionSummary = "Error";
    }

    const hud: TurnHudMeter[] = rendered.uiElements.map((el) => ({
      uid: el.description.uid,
      name: el.description.name,
      value: el.currentValue,
      ...(el.description.progressBar
        ? {
            min: el.description.progressBar.min,
            max: el.description.progressBar.max,
          }
        : {}),
    }));

    const backgroundChanged = effectiveBg !== null && effectiveBg !== prevBg;
    this.lastBg = effectiveBg;

    const availableImages: TurnAvailableImages = {
      scene: effectiveBg,
      avatar: avatarRef,
      stage: stageImages,
      items: this.collectItemImages(state),
      routes: routeImages,
    };

    return {
      game_name: game.general?.name || "",
      game_version: game.general?.version || "",
      step: state.stepCount,
      situation: state.situation ?? null,
      widget: w.widget,
      position_summary: positionSummary,
      scene: {
        text,
        page_index: pageIndex,
        page_count: pageCount,
        speaker,
        stage,
        location: locationInfo,
        pac: pacInfo,
        background_ref: effectiveBg,
        background_changed: backgroundChanged,
        error: errorText,
      },
      actions: {
        can_continue: canContinue,
        continue_mode: continueMode,
        links,
        routes,
        zones,
        discuss_topics: discussTopics,
        usable_items: this.getUsableItems(state, w.widget),
      },
      hud,
      new_notifications: newNotifications,
      counts: {
        items: state.carriedItems.length,
        facts: state.knownFacts.length,
        people: state.knownPeople.length,
        places: state.knownPlaces.length,
        open_quests: state.progress.openQuests.length,
        completed_quests: state.progress.completedQuests.length,
        failed_quests: state.progress.failedQuests.length,
      },
      available_images: availableImages,
    };
  }

  public act(payload: ActPayload): TurnResult {
    const { exec, state } = this.mustReady();
    const prevBg = this.lastBg;
    const prevNotifLen = state.notifications.length;
    const currentView = exec.renderer.render(state, prevBg);
    const w = currentView.uiWidgetView;

    if (w.widget === "error") {
      throw new Error(`Game is in an error state: ${w.errorText}`);
    }

    let nextState: State;

    switch (payload.action) {
      case "continue": {
        if (w.widget !== "dialog" && w.widget !== "char") {
          throw new Error(`'continue' is only available on dialog or character screens (current: ${w.widget})`);
        }
        if (w.pageIndex < w.pageCount - 1) {
          nextState = exec.advanceDialogPage(state, w.text);
        } else if (w.continueLink != null) {
          if (w.continueLink.disabled) {
            throw new Error(`Continue link is disabled: ${w.continueLink.disabledReason}`);
          }
          const clickData: HistoryRecord = {
            actor: w.widget === "dialog" ? w.actor?.name ?? null : null,
            text: w.text,
            answer: w.continueLink.text,
            step: currentView.step,
          };
          nextState = exec.dialogVariantApply(state, w.continueLink.link, clickData);
        } else {
          throw new Error("Nothing to continue on this screen; choose one of the available links or actions");
        }
        break;
      }

      case "choose_link": {
        if (w.widget !== "dialog" && w.widget !== "char" && w.widget !== "location") {
          throw new Error(`'choose_link' is not available on '${w.widget}' screens`);
        }
        if ((w.widget === "dialog" || w.widget === "char") && (w.pageIndex < w.pageCount - 1 || w.continueLink != null)) {
          throw new Error("Use action='continue' to advance the current text before choosing a link");
        }
        if (payload.index === undefined || payload.index === null) {
          throw new Error("'choose_link' requires 'index'");
        }
        const chosen = w.links.find((l) => l.index === payload.index);
        if (!chosen) {
          throw new Error(`Link index ${payload.index} is not available (valid: 0..${Math.max(0, w.links.length - 1)})`);
        }
        if (chosen.disabled) {
          throw new Error(`Link ${payload.index} ('${chosen.text}') is disabled`);
        }
        const clickData: HistoryRecord = {
          actor: w.widget === "dialog" ? w.actor?.name ?? null : null,
          text: w.text,
          answer: chosen.text,
          step: currentView.step,
        };
        nextState = exec.dialogVariantApply(state, chosen.link, clickData);
        break;
      }

      case "travel": {
        if (w.widget !== "location") {
          throw new Error(`'travel' is only available on location screens (current: ${w.widget})`);
        }
        const route =
          payload.target_id != null && payload.target_id !== ""
            ? w.routes.find((r) => r.destination.uid === payload.target_id)
            : payload.index !== undefined && payload.index !== null
              ? w.routes.find((r) => r.index === payload.index)
              : undefined;
        if (!route) {
          throw new Error("Matching location route not found; pass a valid route 'index' or 'target_id'");
        }
        if (route.disabled) {
          throw new Error(`Route to '${route.name}' (${route.destination.uid}) is disabled`);
        }
        nextState = exec.locRouteApply(state, route);
        break;
      }

      case "click_zone": {
        if (w.widget !== "pac") {
          throw new Error(`'click_zone' is only available on point-and-click screens (current: ${w.widget})`);
        }
        const zone =
          payload.target_id != null && payload.target_id !== ""
            ? w.items.find((z) => z.zone.id === payload.target_id)
            : payload.index !== undefined && payload.index !== null
              ? w.items[payload.index]
              : undefined;
        if (!zone) {
          throw new Error("Matching scene zone not found; pass a valid zone 'target_id' or 'index'");
        }
        if (zone.disabled) {
          throw new Error(`Zone '${zone.zone.name || zone.zone.id}' is disabled`);
        }
        const clickData: HistoryRecord = {
          actor: null,
          text: "",
          answer: zone.zone.name || zone.zone.id,
          step: currentView.step,
        };
        nextState = exec.pacZoneApply(state, zone.zone, clickData);
        break;
      }

      case "discuss": {
        if (w.widget !== "char") {
          throw new Error(`'discuss' is only available in character conversations (current: ${w.widget})`);
        }
        if (w.pageIndex < w.pageCount - 1 || w.continueLink != null) {
          throw new Error("Use action='continue' before starting a discussion topic");
        }
        const topicType = payload.topic_type;
        const targetId = payload.target_id;
        if (!topicType || !targetId) {
          throw new Error("'discuss' requires both 'topic_type' ('char'|'fact'|'item'|'loc') and 'target_id'");
        }
        const topics = this.getDiscussTopics(state, w);
        const topicPool: Record<string, DiscussTopicItem[]> = {
          char: topics.people,
          fact: topics.facts,
          item: topics.items,
          loc: topics.places,
        };
        const list = topicPool[topicType];
        if (!list) {
          throw new Error(`Unknown topic_type '${topicType}'`);
        }
        if (!list.some((t) => t.uid === targetId)) {
          throw new Error(`Topic '${targetId}' is not currently discussable under '${topicType}'`);
        }
        nextState = exec.discuss(state, topicType, targetId, w.char.uid);
        break;
      }

      case "use_item": {
        if (w.widget !== "dialog" || state.position.kind !== "window") {
          throw new Error(`'use_item' is only available on dialog screens (current: ${w.widget})`);
        }
        const itemUid = payload.target_id;
        if (!itemUid) {
          throw new Error("'use_item' requires 'target_id' (item uid)");
        }
        if (!state.carriedItems.some((c) => c.item === itemUid)) {
          throw new Error(`Item '${itemUid}' is not in inventory`);
        }
        nextState = exec.useItemInDialog(state, itemUid);
        break;
      }

      default:
        throw new Error(`Unknown action '${String((payload as { action?: unknown }).action)}'`);
    }

    const newNotifications =
      nextState.notifications.length > prevNotifLen
        ? nextState.notifications.slice(prevNotifLen)
        : [];
    this.state = nextState;
    return { state: this.state, turn: this.buildTurn(prevBg, newNotifications) };
  }

  public inspect(section: InspectSection): InspectResult {
    const { game, exec, state } = this.mustReady();

    const getInventory = (): InspectInventoryItem[] =>
      state.carriedItems.map((carried) => {
        const item = getItemByIdOrUnknown(game.items, carried.item);
        return {
          uid: carried.item,
          name: item.name,
          description: item.description,
          quantity: carried.quantity,
          tags: item.tags ?? [],
          stats: item.stats ?? {},
          has_image: Boolean((item.image || item.thumbnail || "").trim()),
        };
      });

    const getFacts = (): InspectFactItem[] =>
      state.knownFacts.map((uid) => {
        const fact = getFact(game, uid) ?? createEmptyFact(uid);
        return {
          uid: fact.uid,
          short: fact.short,
          full: fact.full,
          discussable: fact.discussable,
        };
      });

    const getPeople = (): InspectPersonItem[] =>
      state.knownPeople.map((uid) => {
        const descr = exec.renderer.getCharInfoDescription(state, uid);
        return {
          uid,
          name: descr.name,
          description: descr.description,
          has_avatar: Boolean(descr.avatar?.trim()),
          discussable: descr.charObject.discussable,
        };
      });

    const getPlaces = (): InspectPlaceItem[] => {
      const visited = new Set(getVisitedLocations(state));
      return state.knownPlaces.map((uid) => {
        const loc = getLoc(game, uid);
        return {
          uid,
          name: loc?.displayName || uid,
          discussable: loc?.discussable ?? true,
          visited: visited.has(uid),
        };
      });
    };

    switch (section) {
      case "inventory":
        return { section, data: getInventory() };
      case "facts":
        return { section, data: getFacts() };
      case "people":
        return { section, data: getPeople() };
      case "places":
        return { section, data: getPlaces() };
      case "objectives":
        return { section, data: exec.renderer.renderProgress(state) };
      case "history":
        return { section, data: state.shortHistory };
      case "summary":
        return {
          section,
          data: {
            step: state.stepCount,
            situation: state.situation ?? null,
            inventory: getInventory(),
            facts: getFacts(),
            people: getPeople(),
            places: getPlaces(),
            objectives: exec.renderer.renderProgress(state),
            recent_history: state.shortHistory.slice(-5),
          },
        };
      default:
        throw new Error(`Unknown inspect section '${String(section)}'`);
    }
  }
}
