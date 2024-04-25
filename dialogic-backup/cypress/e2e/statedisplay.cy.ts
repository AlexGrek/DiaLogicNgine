describe('state display', () => {


  it('shows state', () => {
    cy.useTestGame()
    cy.openMenu("player")
    cy.get('[name="statedisplay"]').click()
    cy.get('[name="stateasyaml"]').should('contain.text', 'positionStack: []')
    cy.get('[name="stateasyaml"]').should('contain.text', 'shortHistory: []')
    cy.get('[name="stateasyaml"]').should('contain.text', 'fatalError: null')
  })
})