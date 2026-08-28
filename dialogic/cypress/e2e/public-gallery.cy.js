/**
 * Public gallery: the main page lists published games and lets anyone play
 * them without an account.
 *
 * "Published" is a per-project flag its owner flips from the dashboard; it both
 * lists the game publicly and opens its game.json to anonymous players.
 */
describe("Public gallery", () => {
  const E2E_PROJECT = Cypress.env("E2E_PROJECT") || "e2e-test-project";

  before(() => {
    cy.ensureTestProject();
    cy.setProjectPublished(E2E_PROJECT, true);
  });

  after(() => {
    cy.setProjectPublished(E2E_PROJECT, false);
  });

  describe("anonymous visitor", () => {
    beforeEach(() => {
      cy.clearCookies(); // no session at all
      cy.visit("/");
      cy.getByTestId("gallery-page", { timeout: 20000 }).should("be.visible");
    });

    it("shows the gallery instead of the editor on the main page", () => {
      cy.getByTestId("gallery-page").should("be.visible");
      cy.getByTestId("home-page").should("not.exist");
      cy.getByTestId("login-page").should("not.exist");
    });

    it("lists the published game", () => {
      cy.contains('[data-testid="published-game-card"]', E2E_PROJECT, {
        timeout: 20000,
      }).should("be.visible");
    });

    it("plays a published game without logging in", () => {
      cy.contains('[data-testid="published-game-card"]', E2E_PROJECT, {
        timeout: 20000,
      })
        .find('[data-testid="play-game-btn"]')
        .click();

      cy.url({ timeout: 20000 }).should(
        "include",
        `/play/${encodeURIComponent(E2E_PROJECT)}`
      );
      cy.getByTestId("play-only-page", { timeout: 20000 }).should("be.visible");
      cy.getByTestId("main-menu-overlay", { timeout: 20000 }).should("be.visible");
      cy.getByTestId("editor-layout").should("not.exist");
      cy.getCookie("dln_session").should("not.exist"); // still anonymous
    });

    it("filters games with the search box", () => {
      cy.getByTestId("gallery-search").type("definitely-no-such-game");
      cy.getByTestId("gallery-empty", { timeout: 20000 }).should("be.visible");
      cy.getByTestId("published-game-card").should("not.exist");
    });

    it("offers a way to sign in and reach the editor", () => {
      cy.getByTestId("gallery-signin-btn").click();
      cy.getByTestId("login-page", { timeout: 20000 }).should("be.visible");
    });

    it("keeps unpublished games private", () => {
      const privateProject = `e2e-private-${Date.now()}`;
      cy.login();
      cy.request({
        method: "PUT",
        url: `/api/v1/projects/${encodeURIComponent(privateProject)}/game`,
        body: { general: { name: privateProject }, dialogs: [], chars: [], locs: [] },
      });
      cy.clearCookies();

      cy.request({
        url: `/api/v1/projects/published`,
      }).then((res) => {
        const names = res.body.projects.map((p) => p.name);
        expect(names).to.not.include(privateProject);
      });
      cy.request({
        url: `/api/v1/projects/${encodeURIComponent(privateProject)}/game`,
        failOnStatusCode: false,
      })
        .its("status")
        .should("eq", 403);

      cy.login();
      cy.request({
        method: "DELETE",
        url: `/api/v1/projects/${encodeURIComponent(privateProject)}`,
        failOnStatusCode: false,
      });
    });
  });

  describe("signed-in owner", () => {
    beforeEach(() => {
      cy.login();
    });

    it("shows the dashboard on the main page, gallery on /games", () => {
      cy.visit("/");
      cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
      cy.getByTestId("browse-gallery-btn").click();
      cy.url().should("include", "/games");
      cy.getByTestId("gallery-page", { timeout: 20000 }).should("be.visible");
      cy.getByTestId("gallery-my-projects-btn").should("be.visible");
    });

    it("marks the published project on its dashboard card", () => {
      cy.visit("/");
      cy.contains('[data-testid="project-card"]', E2E_PROJECT, { timeout: 20000 })
        .find('[data-testid="publish-toggle-btn"]')
        .should("contain", "Published");
    });

    it("unpublishes and republishes from the dashboard", () => {
      cy.visit("/");
      cy.contains('[data-testid="project-card"]', E2E_PROJECT, { timeout: 20000 })
        .find('[data-testid="publish-toggle-btn"]')
        .click();

      cy.contains('[data-testid="project-card"]', E2E_PROJECT)
        .find('[data-testid="publish-toggle-btn"]')
        .should("contain", "Private");

      cy.request({ url: "/api/v1/projects/published" }).then((res) => {
        expect(res.body.projects.map((p) => p.name)).to.not.include(E2E_PROJECT);
      });

      cy.contains('[data-testid="project-card"]', E2E_PROJECT)
        .find('[data-testid="publish-toggle-btn"]')
        .click();
      cy.contains('[data-testid="project-card"]', E2E_PROJECT)
        .find('[data-testid="publish-toggle-btn"]')
        .should("contain", "Published");

      cy.request({ url: "/api/v1/projects/published" }).then((res) => {
        expect(res.body.projects.map((p) => p.name)).to.include(E2E_PROJECT);
      });
    });
  });
});
