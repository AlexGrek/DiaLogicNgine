import { DialogLink, DialogLinkDirection, LinkType } from "./Dialog";

export interface PointAndClickZone {
  id: string;
  name: string;
  x: number; // percentage of screen width
  y: number; // percentage of screen height
  width: number; // percentage of screen width
  height: number; // percentage of screen height
  image?: string; // optional zone image
  idleOpacity?: number; // opacity when not hovered (0-1)
  hoverOpacity?: number; // opacity when hovered (0-1)

  // scripting

  isDisabledIfScript?: string
  isVisibleIfScript?: string
  onClickScript?: string

  // navigation — lets a zone click do everything a dialog variant can.
  // When `mainDirection` is set the click follows it exactly like a dialog
  // link (push/pop/jump/tolocation/toperson/…), honouring alternatives.
  mainDirection?: DialogLinkDirection
  alternativeDirections?: DialogLinkDirection[]
  useAlternativeWhen?: string
}

/**
 * True when a zone click should navigate (follow a link) rather than just run
 * its onClickScript in place. A Local direction with no target is treated as
 * "no navigation".
 */
export function zoneHasNavigation(zone: PointAndClickZone): boolean {
  const dir = zone.mainDirection
  if (!dir) return false
  if (dir.type === LinkType.Local && !(dir.direction && dir.direction.length > 0)) return false
  return true
}

/**
 * Project a zone onto a synthetic DialogLink so the execution engine can follow
 * it through the very same code path as a dialog variant. The zone's
 * `onClickScript` plays the role of the link's `actionCode`.
 */
export function zoneAsDialogLink(zone: PointAndClickZone): DialogLink {
  const alternativeDirections = zone.alternativeDirections ?? []
  return {
    mainDirection: zone.mainDirection ?? { type: LinkType.Local, direction: "" },
    alternativeDirections,
    text: zone.name,
    actionCode: zone.onClickScript,
    useAlternativeWhen: zone.useAlternativeWhen,
    isAlternativeLink: alternativeDirections.length > 0 && Boolean(zone.useAlternativeWhen),
  }
}

export interface PointAndClick {
  id: string;
  background: string;
  zones: PointAndClickZone[];

  // events
  eventHosts: string[] | null
  canHostEventsScript?: string
}

export function createEmptyPac(uid: string): PointAndClick {
  return {
    id: uid,
    background: '',
    zones: [],
    eventHosts: [],
    canHostEventsScript: undefined
  }
}
