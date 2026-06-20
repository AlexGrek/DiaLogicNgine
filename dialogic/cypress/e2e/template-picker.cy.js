/**
 * Template picker: choosing the "Scripting Lab" template when creating a
 * project produces a project seeded from that template (verified via the API).
 */
describe("Template picker", () => {
  const projectName = `e2e-template-${Date.now()}`;

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

  it("shows both templates with Starter selected by default", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.getByTestId("template-picker").should("be.visible");
    cy.getByTestId("template-option-starter").should("have.attr", "aria-checked", "true");
    cy.getByTestId("template-option-scripting").should("have.attr", "aria-checked", "false");
  });

  it("selecting a template updates the selection", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.getByTestId("template-option-scripting").click();
    cy.getByTestId("template-option-scripting").should("have.attr", "aria-checked", "true");
    cy.getByTestId("template-option-starter").should("have.attr", "aria-checked", "false");
  });

  it("creates a project seeded from the Scripting Lab template", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.getByTestId("template-option-scripting").click();
    cy.getByTestId("new-project-input").type(projectName);
    cy.getByTestId("create-project-btn").should("not.be.disabled").click();

    cy.url({ timeout: 20000 }).should("include", "/dialog");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");

    // The saved project should contain the Scripting Lab template's content.
    cy.request(`/api/v1/projects/${encodeURIComponent(projectName)}/game`).then((res) => {
      expect(res.status).to.eq(200);
      const game = res.body;
      expect(game.general.name).to.eq(projectName);
      expect(game.dialogs.map((d) => d.name)).to.include("lab");
      expect(game.props.map((p) => p.name)).to.include("gold");
      expect(game.functions.map((f) => f.name)).to.include("earnGold");
      expect(game.hooks.length).to.be.greaterThan(0);
    });
  });

  it("plays the Scripting Lab template without script errors", () => {
    // Loads the saved project from the server and runs its entry script,
    // chooseTextScript and the reusable-functions preamble.
    cy.visit(`/play/${encodeURIComponent(projectName)}`);
    cy.getByTestId("play-only-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("main-menu-new-game", { timeout: 20000 }).should("be.visible").click();

    cy.getByTestId("dialog-window-view", { timeout: 20000 })
      .should("be.visible")
      .and("contain", "Scripting Lab");
  });
});
