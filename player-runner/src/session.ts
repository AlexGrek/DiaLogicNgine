import { GameExecManager } from "../../dialogic/src/exec/GameExecutor";
import { InGameNotification, State, UiObjectId, createInitialState } from "../../dialogic/src/exec/GameState";
import {
  PlayerAction,
  availableActions,
  applyAction,
  debugApply,
  factList,
  inventoryList,
  newGame,
  newNotifications,
  peopleList,
  placeList,
  type DiscussTopics,
} from "../../dialogic/src/exec/PlayerTurn";
import {
  CharDialogRenderView,
  DialogRenderView,
  LocationRenderView,
  PacRenderView,
  RenderLink,
} from "../../dialogic/src/exec/RenderView";
import { GameDescription } from "../../dialogic/src/game/GameDescription";
import { getItemByIdOrUnknown } from "../../dialogic/src/game/Items";
import { normalizeGame } from "../../dialogic/src/game/Patches";
import type {
  ActPayload,
  DebugApplyOptions,
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
  TurnZone,
} from "./protocol";

function serializeLinks(links: RenderLink[]): TurnLink[] {
  return links.map((l) => ({
    index: l.index,
    text: l.text,
    disabled: l.disabled,
    disabled_reason: l.disabled ? l.disabledReason : "",
    visited: l.visited,
  }));
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
    this.game = normalizeGame(rawGame);
    this.exec = new GameExecManager(this.game);
    if (savedState) {
      this.state = savedState;
      this.lastBg = savedState.background ?? null;
      return { state: this.state, turn: this.buildTurn(null, []) };
    }
    this.state = newGame(this.exec);
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
    this.game = normalizeGame(rawGame);
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
    const state = debugApply(exec, base, options);
    const notifs = newNotifications(base, state);
    this.state = state;
    this.lastBg = null;
    return { state, turn: this.buildTurn(null, notifs) };
  }

  private getDiscussTopics(state: State, view: CharDialogRenderView): TurnDiscussTopics {
    const topics: DiscussTopics | null = availableActions(this.mustReady().exec, state, view).discussTopics;
    return topics ?? { people: [], facts: [], items: [], places: [] };
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
        usable_items: availableActions(exec, state, w).usableItems,
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
    const view = exec.renderer.render(state, prevBg).uiWidgetView;
    const nextState = applyAction(exec, state, toPlayerAction(payload), view);
    this.state = nextState;
    return { state: nextState, turn: this.buildTurn(prevBg, newNotifications(state, nextState)) };
  }

  public inspect(section: InspectSection): InspectResult {
    const { exec, state } = this.mustReady();

    const getInventory = (): InspectInventoryItem[] => inventoryList(exec, state);
    const getFacts = (): InspectFactItem[] => factList(exec, state);
    const getPeople = (): InspectPersonItem[] => peopleList(exec, state);
    const getPlaces = (): InspectPlaceItem[] => placeList(exec, state);

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

/** Map the MCP `act` payload onto the shared player action. */
function toPlayerAction(payload: ActPayload): PlayerAction {
  switch (payload.action) {
    case "continue":
      return { type: "continue" };
    case "choose_link":
      return { type: "link", index: payload.index as number };
    case "travel":
      return { type: "route", uid: payload.target_id ?? undefined, index: payload.index ?? undefined };
    case "click_zone":
      return { type: "zone", id: payload.target_id ?? undefined, index: payload.index ?? undefined };
    case "discuss":
      return {
        type: "discuss",
        topicType: payload.topic_type as Extract<PlayerAction, { type: "discuss" }>["topicType"],
        id: payload.target_id ?? "",
      };
    case "use_item":
      return { type: "useItem", uid: payload.target_id ?? "" };
    default:
      throw new Error(`Unknown action '${String((payload as { action?: unknown }).action)}'`);
  }
}
