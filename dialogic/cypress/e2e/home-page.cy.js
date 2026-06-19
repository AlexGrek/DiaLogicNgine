describe("Home page", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/");
    cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
  });

  it("loads the home page", () => {
    cy.getByTestId("home-page").should("be.visible");
  });

  it("shows the create project form", () => {
    cy.getByTestId("new-project-input").should("be.visible");
    cy.getByTestId("create-project-btn").should("be.visible");
  });

  it("create button is disabled when input is empty", () => {
    cy.getByTestId("create-project-btn").should("be.disabled");
  });

  it("create button enables after typing a name", () => {
    cy.getByTestId("new-project-input").type("my story");
    cy.getByTestId("create-project-btn").should("not.be.disabled");
  });

  it("create button disables again when input is cleared", () => {
    cy.getByTestId("new-project-input").type("my story");
    cy.getByTestId("create-project-btn").should("not.be.disabled");
    cy.getByTestId("new-project-input").clear();
    cy.getByTestId("create-project-btn").should("be.disabled");
  });

  it("shows the saved projects section", () => {
    cy.contains("Saved projects").should("be.visible");
  });
});
