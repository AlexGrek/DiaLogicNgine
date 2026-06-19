/**
 * Smoke tests for key editor sections — verifies each route renders
 * its expected heading or primary UI element.
 */
describe("Editor section content", () => {
  beforeEach(() => {
    cy.openTestProject();
  });

  it("config page shows the game configuration menu", () => {
    cy.visit("/config");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.contains("Game configuration menu").should("be.visible");
    cy.contains("About game").should("be.visible");
  });

  it("scripts page shows tabbed editor with Props tab", () => {
    cy.visit("/scripts");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("pill-tabs").should("be.visible");
    cy.contains("Props").should("be.visible");
    cy.contains("Scripting").should("be.visible");
    cy.contains("Events").should("be.visible");
    cy.contains("Hooks").should("be.visible");
  });

  it("visuals page shows the custom CSS editor", () => {
    cy.visit("/visuals");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.contains("Visuals").should("be.visible");
    cy.getByTestId("pill-tabs").contains("Custom CSS").click();
    cy.getByTestId("visuals-custom-css").should("be.visible");
  });

  it("save/load page shows the current project panel", () => {
    cy.visit("/saveload");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.contains("Save / Load").should("be.visible");
    cy.contains("Current project").should("be.visible");
    cy.contains("Save to server").should("be.visible");
  });

  it("characters page loads inside the editor layout", () => {
    cy.visit("/chars");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("pill-tabs").should("be.visible");
  });

  it("facts page loads inside the editor layout", () => {
    cy.visit("/facts");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("pill-tabs").should("be.visible");
  });
});
