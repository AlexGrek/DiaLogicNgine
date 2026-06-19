// TEMPORARY visual-verification spec for the player overhaul. Safe to delete.
const PROJECT = "player-overhaul-demo";

function seedGame(alignment) {
  const win = (uid, main, links) => ({
    uid,
    text: { main, list: [] },
    links: links.map((l) => ({
      mainDirection: { type: "local", direction: l.to },
      text: l.text,
      alternativeDirections: [],
    })),
    backgrounds: { list: [] },
    tags: [],
    specialWidget: null,
  });

  return cy.request({
    method: "PUT",
    url: `/api/v1/projects/${encodeURIComponent(PROJECT)}/game`,
    headers: { "Content-Type": "application/json" },
    body: {
      engineVersion: "0.20",
      buildVersion: 1,
      general: { name: PROJECT, description: "A short demo to verify the player overhaul.", authors: ["qa"], version: "1.0" },
      startMenu: {},
      dialogs: [
        {
          name: "start",
          windows: [
            win(
              "w1",
              "Welcome, traveler. The road ahead splits into shadow and light. A cold wind carries the scent of pine and something older, something waiting just beyond the treeline. Which path calls to you tonight?",
              [
                { to: "w2", text: "Take the shadowed path into the woods" },
                { to: "w3", text: "Walk toward the distant light" },
              ]
            ),
            win("w2", "Shadows coil around your boots as the canopy swallows the stars. Somewhere ahead, a branch snaps.", [
              { to: "w1", text: "Turn back to the crossroads" },
              { to: "w3", text: "Press on regardless" },
            ]),
            win("w3", "Warm light spills across a quiet meadow. A lantern sways on a wooden post, though no hand tends it.", [
              { to: "w1", text: "Return to the crossroads" },
              { to: "w2", text: "Step into the dark instead" },
            ]),
          ],
        },
      ],
      facts: [], chars: [], roles: [], locs: [], props: [], items: [],
      events: [], eventHosts: [], objectives: [], situations: [], pacWidgets: [], hooks: [],
      uiElements: { meters: [] }, translations: {}, config: {}, dev: {},
      visuals: {
        dialogTextAlignment: alignment,
        responseAlignment: "column",
        shortHistoryVisible: true,
        typewriterEnabled: true,
        typewriterSpeedMs: 12,
      },
      startupDialog: { dialogName: "start", windowUid: "w1" },
    },
    failOnStatusCode: false,
  });
}

function openInPlayer() {
  // open the project from home so the app loads OUR seeded game into state,
  // then navigate to the player client-side (no reload) so that state survives.
  cy.visit("/");
  cy.getByTestId("home-page", { timeout: 20000 }).should("be.visible");
  cy.contains('[data-testid="project-card"]', PROJECT, { timeout: 20000 })
    .find('[data-testid="open-project-btn"]')
    .click();
  cy.url({ timeout: 20000 }).should("include", "/dialog");
  cy.getByTestId("nav-play").click();
  cy.getByTestId("main-menu-overlay", { timeout: 20000 }).should("be.visible");
  cy.getByTestId("main-menu-new-game").click();
  cy.getByTestId("dialog-window-view", { timeout: 20000 }).should("be.visible");
}

describe("Player overhaul visual check", () => {
  ["right", "left", "full"].forEach((alignment) => {
    it(`renders the ${alignment} layout and the short-history morph`, () => {
      seedGame(alignment);
      openInPlayer();

      // confirm we actually loaded the seeded game, not the default template
      cy.getByTestId("dialog-window-view").should("contain.text", "traveler");

      // let the (fast) typewriter finish
      cy.wait(1800);
      cy.getByTestId("player-core").screenshot(`overhaul-${alignment}-1-initial`);

      // pick a choice -> the line should morph into short history
      cy.get(".dialog-button").first().click();
      cy.wait(1500);
      cy.getByTestId("player-core").screenshot(`overhaul-${alignment}-2-after-choice`);

      // advance again to accumulate more history
      cy.get(".dialog-button").first().click();
      cy.wait(1500);
      cy.getByTestId("player-core").screenshot(`overhaul-${alignment}-3-history`);
    });
  });
});
