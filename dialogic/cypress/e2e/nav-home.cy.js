/**
 * Navigate back to the home page from the editor via the sidebar Home button.
 */
describe("Navigate home from editor", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/dialog");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
  });

  it("shows a confirmation dialog when clicking Home", () => {
    cy.getByTestId("nav-home").click();
    cy.contains("Go to Home?").should("be.visible");
    cy.contains("Any unsaved changes will be lost").should("be.visible");
  });

  it("stays on the editor when cancelling", () => {
    cy.getByTestId("nav-home").click();
    cy.contains("Go to Home?").should("be.visible");
    cy.contains("button", "Cancel").click();
    cy.url().should("include", "/dialog");
    cy.getByTestId("editor-layout").should("be.visible");
  });

  it("returns to the home page when confirming", () => {
    cy.getByTestId("nav-home").click();
    cy.contains("Go to Home?").should("be.visible");
    cy.contains("button", "Ok").click();
    cy.url({ timeout: 10000 }).should("match", /\/$/);
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
  });
});
