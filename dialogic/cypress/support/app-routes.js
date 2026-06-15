/**
 * Editor routes and their sidebar nav test IDs.
 * All routes render inside the AppLayout (data-testid="editor-layout").
 */
export const EDITOR_ROUTES = [
  { path: "/dialog", navTestId: "nav-play" },
  { path: "/config", navTestId: "nav-config" },
  { path: "/visuals", navTestId: "nav-visuals" },
  { path: "/locs", navTestId: "nav-locs" },
  { path: "/chars", navTestId: "nav-chars" },
  { path: "/scripts", navTestId: "nav-scripts" },
  { path: "/facts", navTestId: "nav-facts" },
  { path: "/items", navTestId: "nav-items" },
  { path: "/ui", navTestId: "nav-ui" },
  { path: "/pac", navTestId: "nav-pac" },
  { path: "/player", navTestId: "nav-play" },
  { path: "/resources", navTestId: "nav-resources" },
  { path: "/saveload", navTestId: "nav-saveload" },
];

export const SIDEBAR_NAV_ITEMS = [
  { testId: "nav-config", path: "/config" },
  { testId: "nav-visuals", path: "/visuals" },
  { testId: "nav-chars", path: "/chars" },
  { testId: "nav-locs", path: "/locs" },
  { testId: "nav-scripts", path: "/scripts" },
  { testId: "nav-facts", path: "/facts" },
  { testId: "nav-items", path: "/items" },
  { testId: "nav-ui", path: "/ui" },
  { testId: "nav-pac", path: "/pac" },
  { testId: "nav-play", path: "/player" },
  { testId: "nav-resources", path: "/resources" },
  { testId: "nav-saveload", path: "/saveload" },
];
