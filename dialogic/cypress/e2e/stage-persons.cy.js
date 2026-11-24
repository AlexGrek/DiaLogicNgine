// Full-size character "looks" on a dialog window's stage, played through /play/{project}.
const project = "stage test";
const root = "/api/v1/projects/stage%20test";
const art = root + "/images/";
const image = {
  headers: { "content-type": "image/svg+xml" },
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="60"/>',
};

function local(text, direction) {
  return { text, mainDirection: { type: "local", direction }, alternativeDirections: [] };
}

function scene(uid, main, links, extra = {}) {
  return { uid, text: { main, list: [] }, links, backgrounds: { list: [] }, tags: [], specialWidget: null, ...extra };
}

function char(uid, looks, extra = {}) {
  return {
    uid, displayName: { main: uid.toUpperCase(), list: [] }, description: { main: "", list: [] },
    traits: [], props: [], overrideProps: [], roles: [], avatar: { list: [] }, discussable: true,
    looks, ...extra,
  };
}

function openGame() {
  const game = {
    engineVersion: "0.21", general: { name: project, version: "1" }, config: {},
    startupDialog: { kind: "window", dialog: "main", window: "start" },
    startMenu: {}, visuals: { typewriterEnabled: false },
    facts: [], roles: [], locs: [], props: [], items: [], eventHosts: [],
    events: [], objectives: [], situations: [], translations: {}, uiElements: { meters: [] }, pacWidgets: [],
    chars: [
      char("anna", { main: "anna.svg", list: [{ name: "smile", uri: "anna-smile.svg" }] }),
      char("boris", { main: "boris.svg", list: [] }),
      char("cid", { main: "cid.svg", list: [] }),
      char("dora", { main: "dora.svg", list: [] }),
    ],
    dialogs: [{ name: "main", windows: [
      scene("start", "Two on stage", [local("Next", "scripted")], {
        actor: { character: "anna", currentCharacter: false },
        stage: [{ character: "anna", look: "smile" }, { character: "boris" }],
      }),
      scene("scripted", "Scripted stage", [local("Empty", "empty")], {
        stage: [{ character: "anna" }],
        chooseStageScript: "return ['cid', 'dora', 'anna:smile', 'boris']",
      }),
      scene("empty", "Nobody", [local("Back", "start")]),
    ] }],
  };
  cy.intercept("GET", root + "/game", { body: game });
  cy.visit("/play/stage%20test");
  cy.getByTestId("main-menu-new-game").should("be.visible").click();
}

describe("Stage persons (character looks)", () => {
  beforeEach(() => cy.intercept("GET", art + "*", image));

  it("shows static looks right-to-left, highlights the actor, and follows chooseStageScript", () => {
    openGame();

    cy.getByTestId("stage-persons").should("be.visible");
    cy.getByTestId("stage-person-anna").find("img").should("have.attr", "src", art + "anna-smile.svg");
    cy.getByTestId("stage-person-boris").should("have.class", "stage-person--idle");
    cy.getByTestId("stage-person-anna").should("not.have.class", "stage-person--idle");
    // persons[0] stands rightmost
    cy.getByTestId("stage-person-anna").then(($anna) => {
      cy.getByTestId("stage-person-boris").should(($boris) => {
        expect($anna[0].getBoundingClientRect().left).to.be.greaterThan($boris[0].getBoundingClientRect().left);
      });
    });

    cy.contains("Next").click();
    cy.contains("Scripted stage").should("be.visible");
    // script returns four persons: only the first three are shown
    cy.getByTestId("stage-persons").children().should("have.length", 3);
    cy.getByTestId("stage-person-cid").should("exist");
    cy.getByTestId("stage-person-dora").should("exist");
    cy.getByTestId("stage-person-anna").find("img").should("have.attr", "src", art + "anna-smile.svg");
    cy.getByTestId("stage-person-boris").should("not.exist");

    cy.contains("Empty").click();
    cy.contains("Nobody").should("be.visible");
    cy.getByTestId("stage-persons").should("not.exist");
  });
});
