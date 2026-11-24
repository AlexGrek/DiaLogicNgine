// Regression tests for three player/editor fixes:
//  - in-game Menu → New game runs the startup window's entry script,
//  - scripts can read `context.usedItem` without a guard (context is always an object),
//  - an image picked from another project is copied into this project.

const project = "player fixes test";
const root = "/api/v1/projects/player%20fixes%20test";

function local(text, direction, extra = {}) {
  return { text, mainDirection: { type: "local", direction }, alternativeDirections: [], ...extra };
}

function scene(uid, main, links, extra = {}) {
  return { uid, text: { main, list: [] }, links, backgrounds: { list: [] }, tags: [], specialWidget: null, ...extra };
}

function game() {
  return {
    engineVersion: "0.21", general: { name: project, version: "1" }, config: {},
    startupDialog: { kind: "window", dialog: "main", window: "start" },
    startMenu: {}, visuals: { typewriterEnabled: false },
    facts: [], chars: [], roles: [], locs: [], items: [], eventHosts: [], events: [],
    objectives: [], situations: [], translations: {}, pacWidgets: [], hooks: [], functions: [],
    props: [{ name: "mark", datatype: "string", defaultValue: "initial" }],
    uiElements: { meters: [{ uid: "mark", name: "Mark", value: "return rt.props.mark", layout: { opacity: 1 }, progressBar: null }] },
    dialogs: [{ name: "main", windows: [
      // Plain `context.usedItem`: threw "Cannot read properties of undefined" before the fix.
      scene("start", "Start screen", [local("Change the mark", "second", { actionCode: "rt.props.mark = 'changed'" })], {
        entryScript: "rt.props.mark = context.usedItem ? 'used' : 'entered'",
      }),
      scene("second", "Second screen", [local("Back", "start")]),
    ] }],
  };
}

describe("Player fixes", () => {
  it("runs the startup entry script on Menu → New game, with a defined script context", () => {
    cy.intercept("GET", root + "/game", { body: game() });
    cy.visit("/play/player%20fixes%20test");
    cy.getByTestId("main-menu-new-game").click();
    cy.contains("Start screen").should("be.visible");
    cy.contains("entered").should("exist");

    cy.contains("Change the mark").click();
    cy.contains("Second screen").should("be.visible");
    cy.contains("changed").should("exist");

    cy.get('[class*="game-menu-button-main"]').first().click();
    cy.contains("button", "Menu").click();
    cy.contains("button", "New game").click();
    cy.get('button[name="restart"]').click();
    cy.contains("Start screen").should("be.visible");
    cy.contains("entered").should("exist");
    cy.contains("changed").should("not.exist");
  });
});

describe("Image picker", () => {
  it("copies an image picked from another project into this one, renaming on a clash", () => {
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    cy.openTestProject();
    cy.intercept("GET", "/api/v1/projects", { body: { projects: [{ name: "e2e-test-project" }, { name: "zz-other" }] } });
    cy.intercept("GET", "/api/v1/projects/zz-other/images", { body: { images: ["shared.png"] } });
    cy.intercept("GET", "/api/v1/projects/zz-other/image_thumbs/*", { headers: { "content-type": "image/png" }, body: Cypress.Buffer.from(png, "base64") });
    cy.intercept("GET", "/api/v1/projects/zz-other/images/shared.png", { headers: { "content-type": "image/png" }, body: Cypress.Buffer.from(png, "base64") }).as("readOther");
    // this project already has a "shared.png": the copy must not overwrite it
    cy.intercept("GET", "/api/v1/projects/e2e-test-project/images", { body: { images: ["shared.png"] } });
    cy.intercept("PUT", "/api/v1/projects/e2e-test-project/images/*", { body: { status: "ok" } }).as("upload");

    cy.getByTestId("nav-config").click();
    cy.contains("Main menu").click();
    cy.contains("button", "Browse…").click();
    cy.contains("Other Projects").click();
    cy.get(".image-picker-modal-other-project").contains("zz-other").click();
    cy.get(".image-picker-modal-item").first().click();
    cy.contains("will be copied here").should("be.visible");
    cy.contains("button", "Select").click();

    cy.wait("@readOther");
    cy.wait("@upload").its("request.url").should("match", /\/images\/shared-2\.png$/);
    cy.get(".image-picker-value-label").should("contain", "shared-2.png");
  });
});
