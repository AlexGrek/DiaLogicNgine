Cypress.Commands.add("getByTestId", (testId, options = {}) => {
  return cy.get(`[data-testid="${testId}"]`, options);
});

const E2E_PROJECT = Cypress.env("E2E_PROJECT") || "e2e-test-project";

/**
 * Ensure the e2e test project exists in the backend via API (idempotent).
 */
Cypress.Commands.add("ensureTestProject", () => {
  cy.request({
    method: "PUT",
    url: `/api/v1/projects/${encodeURIComponent(E2E_PROJECT)}/game`,
    headers: { "Content-Type": "application/json" },
    body: {
      engineVersion: "0.20",
      buildVersion: 1,
      general: { name: E2E_PROJECT, description: "", authors: [] },
      startMenu: {},
      dialogs: [],
      facts: [],
      chars: [],
      roles: [],
      locs: [],
      props: [],
      items: [],
      events: [],
      eventHosts: [],
      objectives: [],
      situations: [],
      pacWidgets: [],
      hooks: [],
      uiElements: { meters: [] },
      translations: {},
      visuals: {},
      config: {},
      dev: {},
      startupDialog: { dialogName: "", windowUid: "" },
    },
    failOnStatusCode: false,
  });
});

/**
 * Seed a test project via API and open it through the home page UI.
 */
Cypress.Commands.add("openTestProject", () => {
  cy.ensureTestProject();
  cy.visit("/");
  cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
  cy.contains('[data-testid="project-card"]', E2E_PROJECT, { timeout: 20000 })
    .find('[data-testid="open-project-btn"]')
    .click();
  cy.url({ timeout: 20000 }).should("include", "/dialog");
  cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
});
