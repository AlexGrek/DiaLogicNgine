/**
 * Switch between tabs in the Scripts editor and verify tab-specific content.
 */
describe("Scripts editor tabs", () => {
  beforeEach(() => {
    cy.openTestProject();
    cy.visit("/scripts");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("pill-tabs").should("be.visible");
  });

  it("shows the Scripting tab with functions editor", () => {
    cy.getByTestId("pill-tabs").contains("Scripting").click();
    cy.getByTestId("functions-editor-tab").should("be.visible");
  });

  it("shows the Hooks tab with hooks editor", () => {
    cy.getByTestId("pill-tabs").contains("Hooks").click();
    cy.getByTestId("hooks-editor-tab").should("be.visible");
  });

  it("shows the Events tab with create button", () => {
    cy.getByTestId("pill-tabs").contains("Events").click();
    cy.contains("Create event").should("be.visible");
  });
});
