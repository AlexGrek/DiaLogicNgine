/**
 * End-to-end test: home page → project creation → editor → player
 *
 * Covers:
 *  - Creating a new project from the home page
 *  - Verifying redirect to the dialog editor
 *  - Navigating between editor sections via the sidebar
 *  - Opening the player and verifying the main menu appears
 *  - Starting a new game in the player
 */
describe("Main path: home → create project → editor → player", () => {
  const projectName = `e2e-main-${Date.now()}`;

  beforeEach(() => {
    cy.login();
  });

  after(() => {
    cy.login();
    cy.request({
      method: "DELETE",
      url: `/api/v1/projects/${encodeURIComponent(projectName)}`,
      failOnStatusCode: false,
    });
  });

  it("creates a project from the home page and opens the editor", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.getByTestId("new-project-input").type(projectName);
    cy.getByTestId("create-project-btn").should("not.be.disabled").click();

    cy.url({ timeout: 20000 }).should("include", "/dialog");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
  });

  it("navigates between editor sections via the sidebar", () => {
    cy.visit("/dialog");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");

    cy.getByTestId("nav-chars").click();
    cy.url().should("include", "/chars");

    cy.getByTestId("nav-locs").click();
    cy.url().should("include", "/locs");

    cy.getByTestId("nav-facts").click();
    cy.url().should("include", "/facts");

    cy.getByTestId("nav-config").click();
    cy.url().should("include", "/config");

    cy.getByTestId("nav-scripts").click();
    cy.url().should("include", "/scripts");
  });

  it("opens the player and shows the main menu", () => {
    cy.visit("/player");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("main-menu-overlay", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("main-menu-new-game").should("be.visible");
  });

  it("starts a new game from the player main menu", () => {
    cy.visit("/player");
    cy.getByTestId("main-menu-overlay", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("main-menu-new-game").click();
    cy.getByTestId("main-menu-overlay", { timeout: 10000 }).should("not.exist");
  });
});
