const project = "preloader test";
const root = "/api/v1/projects/preloader%20test";
const art = root + "/images/";
const image = {
  headers: { "content-type": "image/svg+xml" },
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
};

function local(text, direction) {
  return { text, mainDirection: { type: "local", direction }, alternativeDirections: [] };
}

function scene(uid, main, links, extra = {}) {
  return { uid, text: { main, list: [] }, links, backgrounds: { list: [] }, ...extra };
}

function openGame() {
  const game = {
    engineVersion: "0.21", general: { name: project, version: "1" }, config: {},
    startupDialog: { kind: "window", dialog: "main", window: "start" },
    startMenu: { menuBackground: "menu.svg" }, visuals: { typewriterEnabled: false },
    facts: [], chars: [], roles: [], locs: [], props: [], items: [], eventHosts: [],
    events: [], objectives: [], situations: [], translations: {}, uiElements: { meters: [] },
    dialogs: [{ name: "main", windows: [
      scene("start", "Opening scene", [local("Enter room", "room"), local("Finish now", "end")]),
      scene("room", "Room", [], { specialWidget: "pac::room" }),
      scene("end", "Arrived", [local("Back to start", "start")], {
        backgrounds: { main: "end.svg", list: [{ uri: "end-alt.svg" }] },
      }),
      scene("secret", "Secret room", [], { backgrounds: { main: "secret.svg", list: [] } }),
    ] }],
    pacWidgets: [{ id: "room", background: "room.svg", zones: [{
      id: "door", name: "Door", image: "door.svg", x: 10, y: 10, width: 25, height: 25,
      mainDirection: { type: "local", direction: "secret" },
    }] }],
  };
  cy.intercept("GET", root + "/game", { body: game });
  cy.visit("/play/preloader%20test");
  cy.getByTestId("main-menu-new-game").should("be.visible");
}

function checkLog(check) {
  cy.get('input[type="hidden"]#player-preloader-log').should(($input) => {
    const log = JSON.parse($input.val());
    expect(log.project).to.equal(project);
    check(log.entries, log);
  });
}

describe("Player image preloader", () => {
  beforeEach(() => cy.intercept("GET", art + "*", image));

  it("preloads project art before navigation and reuses it through zone links", () => {
    openGame();
    checkLog((entries, log) => {
      expect(log.pending + log.queued).to.equal(0);
      for (const file of ["room.svg", "door.svg", "menu.svg", "end.svg", "end-alt.svg"]) {
        const loaded = entries.find(e => e.url === art + file && e.status === "loaded");
        expect(loaded, file).to.have.property("purpose", "lookahead");
      }
    });
    cy.getByTestId("main-menu-new-game").click();
    cy.contains("Enter room").click();
    cy.getByTestId("pac-zone-door").should("have.css", "background-image").and("include", art + "door.svg");
    checkLog(entries => {
      expect(entries.filter(e => e.url === art + "secret.svg" && e.status === "loaded")).to.have.length(1);
      expect(entries.filter(e => e.url === art + "room.svg" && e.status === "started")).to.have.length(1);
    });
  });

  it("holds the old scene during an in-flight request and releases it after a 404", () => {
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    cy.intercept("GET", art + "end.svg", req => {
      return gate.then(() => req.reply({ statusCode: 404 }));
    });
    openGame();
    checkLog(entries => expect(entries.some(e => e.url === art + "end.svg" && e.status === "started")).to.equal(true));
    cy.getByTestId("main-menu-new-game").click();
    cy.contains("Finish now").click();
    cy.get("#player-core").should("have.attr", "aria-busy", "true");
    cy.contains("Opening scene").should("be.visible");
    cy.contains("Arrived").should("not.exist");
    cy.then(() => release());
    cy.contains("Arrived").should("be.visible");
    checkLog(entries => expect(entries.some(e => e.url === art + "end.svg" && e.status === "error")).to.equal(true));
  });
  it("releases the scene and reports a timeout when an image stalls", () => {
    cy.intercept("GET", art + "end.svg", { ...image, delay: 12000 });
    openGame();
    cy.getByTestId("main-menu-new-game").click();
    cy.contains("Finish now").click();
    cy.get("#player-core").should("have.attr", "aria-busy", "true");
    cy.contains("Arrived", { timeout: 10000 }).should("be.visible");
    checkLog(entries => expect(entries.some(e => e.url === art + "end.svg" && e.status === "timeout")).to.equal(true));
  });
});
