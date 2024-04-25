describe('gameplay', () => {
  before(() => {
    
  })

  beforeEach(() => {
    cy.useTestGame()
    cy.openMenu("player")
  })

  it('follows basic links', () => {
    cy.clickDialog("Basic forward link")
    cy.checkDialog("Success")

    cy.clickDialog("Home")
    cy.checkDialog("Welcome to the game")

    cy.clickDialog("Test push")
    cy.checkDialog("Pushed here, now use pop")

    cy.clickDialog("pop")
    cy.checkDialog("Welcome to the game")

    cy.clickDialog("To test playground (push)")
    cy.checkDialog("This is home page of the test playground")
    cy.clickDialog("Open main page")

    cy.clickDialog("To test playground (jump)")
    cy.checkDialog("This is home page of the test playground")
    cy.clickDialog("Open main page")

    cy.clickDialog("To test playground (resetjump)")
    cy.checkDialog("This is home page of the test playground")
    cy.clickDialog("Open main page")
  })

  it('disabled/hidden link', () => {
    cy.clickDialog("To test playground (push)")

    cy.clickDialog("TestRoom01")
    cy.get(':nth-child(1) > .dialog-button').should("be.disabled")
  })

  it('quick reply', () => {
    cy.clickDialog("To test playground (push)")
    cy.clickDialog("TestRoom01")
    cy.clickDialog("Room 02")
    cy.clickDialog("Quick reply")
    cy.checkDialog("hello")
    cy.get('.dialog-current-text').should('not.contain.text', "Room")
  })
})