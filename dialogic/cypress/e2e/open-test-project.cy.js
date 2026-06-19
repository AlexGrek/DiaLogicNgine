/**
 * Verifies the cy.openTestProject() custom command:
 * seeds a minimal project via API and opens it through the home page UI.
 */
describe("Open seeded test project", () => {
  beforeEach(() => {
    cy.openTestProject();
  });

  it("lands on the dialog editor", () => {
    cy.url().should("include", "/dialog");
    cy.getByTestId("editor-layout").should("be.visible");
  });

  it("shows the placeholder when no dialog is selected", () => {
    cy.contains("Select dialog in the left panel").should("be.visible");
  });
});
