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
}

export interface PointAndClick {
  id: string;
  background?: string;
  zones: PointAndClickZone[];

  // events
  eventHosts: string[] | null
  canHostEventsScript?: string
}
