/**
 * Create a project from the home page, verify it appears in the list,
 * then delete it through the confirmation modal.
 */
describe("Project lifecycle", () => {
  const projectName = `e2e-lifecycle-${Date.now()}`;

  beforeEach(() => {
    cy.login();
  });

  before(() => {
    cy.login();
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("new-project-input").type(projectName);
    cy.getByTestId("create-project-btn").click();
    cy.url({ timeout: 20000 }).should("include", "/dialog");
  });

  after(() => {
    cy.login();
    cy.request({
      method: "DELETE",
      url: `/api/v1/projects/${encodeURIComponent(projectName)}`,
      failOnStatusCode: false,
    });
  });

  it("shows the new project in the saved projects list", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.contains('[data-testid="project-card"]', projectName, { timeout: 20000 })
      .should("be.visible")
      .find('[data-testid="open-project-btn"]')
      .should("be.visible");
  });

  it("reopens the project from the home page", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.contains('[data-testid="project-card"]', projectName, { timeout: 20000 })
      .find('[data-testid="open-project-btn"]')
      .click();

    cy.url({ timeout: 20000 }).should("include", "/dialog");
    cy.getByTestId("editor-layout").should("be.visible");
  });

  it("deletes the project after confirmation", () => {
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");

    cy.contains('[data-testid="project-card"]', projectName, { timeout: 20000 })
      .find('[data-testid="delete-project-btn"]')
      .click();

    cy.getByTestId("delete-confirm-modal").should("be.visible");
    cy.getByTestId("confirm-delete-btn").click();

    cy.getByTestId("delete-confirm-modal").should("not.exist");
    cy.contains('[data-testid="project-card"]', projectName).should("not.exist");
  });
});
