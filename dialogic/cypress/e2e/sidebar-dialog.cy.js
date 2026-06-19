/**
 * Create a new dialog via the sidebar and verify navigation to its editor.
 */
describe("Sidebar dialog creation", () => {
  beforeEach(() => {
    cy.openTestProject();
  });

  it("creates a dialog and shows the editor tools", () => {
    const dialogName = `e2e-dialog-${Date.now()}`;

    cy.get(".sp-add-btn").click();
    cy.get(".sp-add-dialog-input").type(`${dialogName}{enter}`);

    cy.url({ timeout: 10000 }).should("include", encodeURIComponent(dialogName));
    cy.contains(".sp-dialog-label", dialogName).should("be.visible");
    cy.contains("Select dialog in the left panel").should("not.exist");
    cy.contains("Chain").should("be.visible");
    cy.contains("Generate").should("be.visible");
    cy.contains("Graph").should("be.visible");
  });
});
