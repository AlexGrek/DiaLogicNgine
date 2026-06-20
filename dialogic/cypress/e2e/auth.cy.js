/**
 * Authentication gate: login page, login, duplicate-register error, logout.
 *
 * Uses the `root` user (created by the backend startup migration). These tests
 * deliberately avoid registering new users so they don't pollute the store.
 */
describe("Authentication", () => {
  beforeEach(() => {
    cy.clearCookies();
  });

  it("shows the login page when logged out", () => {
    cy.visit("/");
    cy.getByTestId("login-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("home-page").should("not.exist");
  });

  it("logs in as root and reaches the home page", () => {
    cy.visit("/");
    cy.getByTestId("login-username").type("root");
    cy.getByTestId("login-password").type("000000");
    cy.getByTestId("login-submit").click();
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("current-user").should("contain", "root");
  });

  it("rejects an invalid password", () => {
    cy.visit("/");
    cy.getByTestId("login-username").type("root");
    cy.getByTestId("login-password").type("wrong-password");
    cy.getByTestId("login-submit").click();
    cy.contains("Invalid username or password", { timeout: 10000 }).should("be.visible");
    cy.getByTestId("login-page").should("be.visible");
  });

  it("rejects a duplicate username when registering", () => {
    cy.visit("/");
    cy.getByTestId("login-switch").click();
    cy.getByTestId("login-username").type("root");
    cy.getByTestId("login-password").type("whatever");
    cy.getByTestId("login-submit").click();
    cy.contains("already taken", { timeout: 10000 }).should("be.visible");
  });

  it("logs out from the user menu back to the login page", () => {
    cy.login();
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("current-user").click(); // open the user menu dropdown
    cy.contains("Log out").click();
    cy.getByTestId("login-page", { timeout: 20000 }).should("be.visible");
  });

  it("opens the change-password modal from the user menu", () => {
    cy.login();
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
    cy.getByTestId("current-user").click(); // open the user menu dropdown
    cy.contains("Change password").click();
    cy.getByTestId("change-password-modal").should("be.visible");

    // Client-side validation: confirmation must match the new password.
    cy.getByTestId("change-password-new").type("newsecret");
    cy.getByTestId("change-password-confirm").type("different");
    cy.getByTestId("change-password-mismatch").should("be.visible");
    cy.getByTestId("change-password-submit").should("be.disabled");
  });
});
