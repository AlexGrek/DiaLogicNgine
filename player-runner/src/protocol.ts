import type { InGameNotification, State, UiObjectId } from "../../dialogic/src/exec/GameState";
import type { DiscussionTopicType } from "../../dialogic/src/exec/GameExecutor";
import type { ProgressRenderView } from "../../dialogic/src/exec/RenderView";

export type ActionKind =
  | "choose_link"
  | "continue"
  | "travel"
  | "click_zone"
  | "discuss"
  | "use_item";

export type InspectSection =
  | "inventory"
  | "facts"
  | "people"
  | "places"
  | "objectives"
  | "history"
  | "summary";

export interface ActPayload {
  action: ActionKind;
  index?: number | null;
  target_id?: string | null;
  topic_type?: DiscussionTopicType | null;
}

export type RpcRequest =
  | { id: number; op: "ping" }
  | { id: number; op: "init"; game: unknown; state?: State | null }
  | { id: number; op: "render" }
  | { id: number; op: "act"; payload: ActPayload }
  | { id: number; op: "inspect"; section: InspectSection }
  | { id: number; op: "load_state"; state: State }
  | { id: number; op: "debug_init"; game: unknown; position?: UiObjectId | null }
  | { id: number; op: "debug_apply"; state: State; options: DebugApplyOptions };

/** Developer-only state surgery: see GameSessionRunner.debugApply. */
export interface DebugApplyOptions {
  /** Move here before the script/entry run; validated against the game. */
  position?: UiObjectId | null;
  /** JS body run with the usual (rt, state, ...) runtime; fires hooks/notifications. */
  script?: string | null;
  /** Run the current position's entry (entryScript/onEntryScript, background, known places). */
  run_entry?: boolean;
}

export interface TurnLink {
  index: number;
  text: string;
  disabled: boolean;
  disabled_reason: string;
  visited: boolean;
}

export interface TurnRoute {
  index: number;
  uid: string;
  name: string;
  disabled: boolean;
  disabled_reason: string;
  has_thumbnail: boolean;
}

export interface TurnZone {
  index: number;
  id: string;
  name: string;
  disabled: boolean;
  disabled_reason: string;
  image_ref: string | null;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DiscussTopicItem {
  uid: string;
  name: string;
}

export interface TurnDiscussTopics {
  people: DiscussTopicItem[];
  facts: DiscussTopicItem[];
  items: DiscussTopicItem[];
  places: DiscussTopicItem[];
}

export interface TurnUsableItem {
  uid: string;
  name: string;
  quantity: number;
}

export interface TurnHudMeter {
  uid: string;
  name: string;
  value: string | number;
  min?: number;
  max?: number;
}

export interface TurnAvailableImages {
  scene: string | null;
  avatar: string | null;
  items: Record<string, string>;
  routes: Record<string, string>;
}

export interface TurnPayload {
  game_name: string;
  game_version: string;
  step: number;
  situation: string | null;
  widget: "dialog" | "char" | "location" | "pac" | "error";
  position_summary: string;
  scene: {
    text: string;
    page_index: number;
    page_count: number;
    speaker: {
      char_uid: string;
      name: string;
      has_avatar: boolean;
    } | null;
    location: {
      uid: string;
      name: string;
    } | null;
    pac: {
      id: string;
      name: string;
    } | null;
    background_ref: string | null;
    background_changed: boolean;
    error: string | null;
  };
  actions: {
    can_continue: boolean;
    continue_mode: "next_page" | "continue_link" | null;
    links: TurnLink[];
    routes: TurnRoute[];
    zones: TurnZone[];
    discuss_topics: TurnDiscussTopics | null;
    usable_items: TurnUsableItem[];
  };
  hud: TurnHudMeter[];
  new_notifications: InGameNotification[];
  counts: {
    items: number;
    facts: number;
    people: number;
    places: number;
    open_quests: number;
    completed_quests: number;
    failed_quests: number;
  };
  available_images: TurnAvailableImages;
}

export interface TurnResult {
  state: State;
  turn: TurnPayload;
}

export interface InspectInventoryItem {
  uid: string;
  name: string;
  description: string;
  quantity: number;
  tags: string[];
  stats: Record<string, string | number | boolean>;
  has_image: boolean;
}

export interface InspectFactItem {
  uid: string;
  short: string;
  full: string;
  discussable: boolean;
}

export interface InspectPersonItem {
  uid: string;
  name: string;
  description: string;
  has_avatar: boolean;
  discussable: boolean;
}

export interface InspectPlaceItem {
  uid: string;
  name: string;
  discussable: boolean;
  visited: boolean;
}

export interface InspectResult {
  section: InspectSection;
  data: unknown;
  available_images?: TurnAvailableImages;
}

export type ObjectivesSnapshot = ProgressRenderView;

export type RpcResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };
