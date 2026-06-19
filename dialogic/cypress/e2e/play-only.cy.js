/**
 * Play-only mode: home page → fullscreen player without editor chrome.
 */
describe("Play-only mode", () => {
  const E2E_PROJECT = Cypress.env("E2E_PROJECT") || "e2e-test-project";

  beforeEach(() => {
    cy.ensureTestProject();
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
  });

  it("opens play-only view from the home page", () => {
    cy.contains('[data-testid="project-card"]', E2E_PROJECT, { timeout: 20000 })
      .find('[data-testid="play-project-btn"]')
      .click();

    cy.url({ timeout: 20000 }).should("include", `/play/${encodeURIComponent(E2E_PROJECT)}`);
    cy.getByTestId("play-only-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("editor-layout").should("not.exist");
    cy.getByTestId("main-menu-overlay").should("be.visible");
  });

  it("shows exit on the main menu and returns home", () => {
    cy.contains('[data-testid="project-card"]', E2E_PROJECT, { timeout: 20000 })
      .find('[data-testid="play-project-btn"]')
      .click();

    cy.getByTestId("main-menu-exit", { timeout: 20000 }).should("be.visible").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
    cy.getByTestId("home-page").should("be.visible");
  });
});
