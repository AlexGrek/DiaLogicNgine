import { EDITOR_ROUTES, SIDEBAR_NAV_ITEMS } from "../support/app-routes";

describe("Editor routes (direct navigation)", () => {
  EDITOR_ROUTES.forEach(({ path }) => {
    it(`loads ${path}`, () => {
      cy.visit(path);
      cy.url({ timeout: 20000 }).should("include", path);
      cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
    });
  });
});

describe("Sidebar navigation", () => {
  beforeEach(() => {
    cy.visit("/dialog");
    cy.getByTestId("editor-layout", { timeout: 20000 }).should("be.visible");
  });

  SIDEBAR_NAV_ITEMS.forEach(({ testId, path }) => {
    it(`nav item ${testId} navigates to ${path}`, () => {
      cy.getByTestId(testId).should("be.visible").click();
      cy.url({ timeout: 20000 }).should("include", path);
      cy.getByTestId("editor-layout").should("be.visible");
    });
  });
});
