describe('smoke test', () => {
  it('passes', () => {
    cy.visit('http://localhost:3000/')
    cy.get('[data-event-key="saveload"]').click()
    cy.get('h1').contains("Save/Load menu")

    cy.get('[data-event-key="config"]').click()
    cy.get('h3').contains('Game configuration menu')

    cy.get('[data-event-key="player"]').click()
    cy.get('.rs-sidenav-item-active').should('contain.text', "Play")

    // enter 1st dialog
    cy.get('.rs-dropdown-menu > :nth-child(2) > .rs-dropdown-item').click()
    cy.get('.window-editor-tools > :nth-child(1) > .rs-input-group > .rs-input').type("smokewindow{enter}")
    cy.get(':nth-child(2) > .window-widget-header > .rs-stack').contains('smokewindow').and('be.visible')

    cy.get('[data-event-key="scripts"]').click()
    cy.get('.rs-table-cell-group > :nth-child(1) > .rs-table-cell > .rs-table-cell-content').should('contain.text', 'ID')

    cy.get('[data-event-key="chars"]').click()
    cy.get('.rs-sidenav-item-active').contains("Characters")
    cy.get('[style="display: block;"] > .static-tabs > .rs-nav-subtle > .rs-nav-item-active').contains('Characters')

    cy.get('[data-event-key="locs"]').click()
    cy.get('.locItemsPlus > .rs-btn').click()
    cy.get('.rs-btn-blue').contains('Discard')
    cy.get('.rs-drawer-actions > .rs-btn-red').click()

    cy.get('[data-event-key="facts"]').click()
    cy.get('[style="display: block;"] > .static-tabs > .rs-nav > .rs-nav-item-active').contains('Facts')

    cy.get('[data-event-key="items"]').click()
    cy.contains('Create').click()
    cy.get('.items-create-uid-input').type('testitem{enter}')
    cy.get('.rs-btn-primary').contains('Save').click()
    cy.get('.items-container > :nth-child(1)').should('contain.text', "Testitem")
  }),

  it('loads test game', () => {
    cy.useTestGame()
    cy.openMenu("config")
    cy.get('#general-prop-description').should('contain.text', "This is a test game")
  })
})