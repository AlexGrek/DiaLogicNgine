import { UiObjectId } from "../exec/GameState";

export interface ProxyDest {
    destination: UiObjectId
    name?: string
}

export default interface Proxy {
    // Proxy is a portal to other dialogs/windows/anything
    destinations: ProxyDest[]
    proxyRouterScript: string
    onEntryScript?: string
}