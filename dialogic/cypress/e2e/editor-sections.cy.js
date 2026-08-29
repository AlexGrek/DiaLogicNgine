/**
 * Smoke tests for key editor sections — verifies each route renders
 * its expected heading or primary UI element.
 */
describe("Editor section content", () => {
  beforeEach(() => {
    cy.openTestProject();
  });

  it("config page shows the tabbed game configuration menu", () => {
    cy.visit("/config");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.contains("Game configuration").should("be.visible");
    cy.getByTestId("pill-tabs").should("be.visible");
    cy.contains("About game").should("be.visible");
    cy.getByTestId("pill-tabs").contains("Sanity check").click();
    cy.getByTestId("sanity-rerun").should("be.visible");
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

  it("visuals page styles link-button categories", () => {
    cy.visit("/visuals");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("pill-tabs").contains("Link buttons").click();
    cy.getByTestId("link-category-tabs").should("be.visible");
    cy.getByTestId("link-category-preview").should("be.visible");

    // Styling a category must show up on the preview button right away.
    cy.getByTestId("link-category-tab-action").click();
    cy.getByTestId("link-category-font-size-large").click();
    cy.getByTestId("link-category-preview")
      .find("button")
      .should("have.attr", "style")
      .and("include", "--link-font-size");

    cy.getByTestId("link-category-reset").should("not.be.disabled").click();
    cy.getByTestId("link-category-preview")
      .find("button")
      .should("not.have.attr", "style", "--link-font-size");
  });

  it("visuals page configures link defaults and the visited look", () => {
    cy.visit("/visuals");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("pill-tabs").contains("Link defaults").click();
    cy.getByTestId("link-type-tabs").should("be.visible");

    // Styling a direction type must show up on its preview button right away.
    cy.getByTestId("link-type-tab-tolocation").click();
    cy.getByTestId("link-type-font-size-large").click();
    cy.getByTestId("link-type-preview")
      .find("button")
      .should("have.attr", "style")
      .and("include", "--link-font-size");

    cy.getByTestId("link-type-reset").should("not.be.disabled").click();
    cy.getByTestId("link-type-preview")
      .find("button")
      .should("not.have.attr", "style", "--link-font-size");

    // The visited section sits below the fold of the scrollable tab.
    cy.getByTestId("link-defaults-visited-preview").scrollIntoView().should("be.visible");
    cy.getByTestId("link-defaults-visited-preview")
      .find("button.dialog-button--visited")
      .should("have.attr", "style")
      .and("include", "--link-opacity");
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
