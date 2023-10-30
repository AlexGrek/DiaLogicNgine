import { should } from "chai"

describe('dialog window edit', () => {
  beforeEach(() => {
    cy.useTestGame()
  })

  const dialogName = "cyTestingDialog"
  const widnowName = "cyTestingWindow"

  it('create dialog and window with text', () => {
    cy.get(`.rs-input-group > input[name='add-dialog']`).type(`${dialogName}{enter}`)
    cy.get(':last-child > .side-panel-dialog').should('contain.text', dialogName)
    cy.get(':last-child > .side-panel-dialog').click()
    cy.get('.window-editor-tools > :nth-child(1) > .rs-input-group > .rs-input').type(`${widnowName}{enter}`)

    // text widget
    cy.get('.window-widget-content').click()
    cy.get('.rs-drawer-header').should('contain.text', widnowName) // check header
    cy.get('.text-list-text-editor').type(`bla bla bla`) // input text
    cy.get('.rs-drawer-actions > .rs-btn').click() // save click
    cy.get('.window-widget-content').should('contain.text', 'bla bla bla')
  })

  it('swith link types', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")
    cy.get('.button-panel-selector > button').each(($btn) => {
      cy.wrap($btn).click();
      cy.wait(100)
    })
  })

  it('create links', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-text').should('contain.text', 'testlink')
  })

  it('push link directions', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")

    cy.get('.button-panel-selector > button:nth-child(2)').click() // push link
    cy.get('.rs-picker-toggle-value > :nth-child(3)').click()
    // dialog1.pushToMe
    cy.get('[data-key="dialog1"] > .rs-picker-cascader-menu-item').click()
    cy.get('[data-key="dialog1#~@~#pushToMe"] > .rs-picker-cascader-menu-item').click()
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'dialog1.pushToMe')
  })

  it('jump link directions', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")

    cy.get('.button-panel-selector > button:nth-child(4)').click() // push link
    cy.get('.rs-picker-toggle-value > :nth-child(3)').click()
    // dialog1.pushToMe
    cy.get('[data-key="dialog1"] > .rs-picker-cascader-menu-item').click()
    cy.get('[data-key="dialog1#~@~#pushToMe"] > .rs-picker-cascader-menu-item').click()
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'dialog1.pushToMe')
  })

  it('resetjump link directions', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")

    cy.get('.button-panel-selector > button:nth-child(5)').click() // push link
    cy.get('.rs-picker-toggle-value > :nth-child(3)').click()
    // dialog1.pushToMe
    cy.get('[data-key="dialog1"] > .rs-picker-cascader-menu-item').click()
    cy.get('[data-key="dialog1#~@~#pushToMe"] > .rs-picker-cascader-menu-item').click()
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'dialog1.pushToMe')
  })

  it('simple link (and follow) directions', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")

    cy.get('.button-panel-selector > button:nth-child(1)').click() // simple link
    cy.get('.link-editor-direction > :nth-child(2) > .rs-picker > .rs-picker-toggle').click() // choose 'success' window
    cy.get('[data-key="success"] > .rs-picker-select-menu-item').click()

    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'success')

    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink-create")
    cy.get('.link-editor-direction > :nth-child(2) > .rs-picker').type(`${widnowName}{enter}`) // choose 'success' window
    cy.get('.link-editor-direction span > .rs-btn').click()
    // we move to another window editor now
    cy.get('.rs-drawer-header').should('contain.text', widnowName) // check header
  })

  it('other link types - location', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")
    cy.get('.button-panel-selector > button:nth-child(6)').click() // loc link
    cy.get('.link-editor-direction > .rs-picker > .rs-picker-toggle').click()
    cy.get('[data-key="directors_office"] > .rs-picker-select-menu-item').click()
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'directors_office')
  })

  it('other link types - char dialog', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")
    cy.get('.button-panel-selector > button:nth-child(7)').click() // dialog link
    cy.get('.link-editor-direction > .rs-picker > .rs-picker-toggle').click()
    cy.get('[data-key="nurse"] > .rs-picker-select-menu-item').click()
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'nurse')
  })

  it('other link types - quick reply', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()
    cy.get('.links-editor-instrument-keys .rs-btn-group button').contains('Create link').click()
    cy.get('.link-editor-body > .rs-input').type("testlink")
    cy.get('.button-panel-selector > button:nth-child(8)').trigger("mouseover") // dialog link

    cy.get('.button-panel-selector > button:nth-child(8)').click()
    cy.get('.link-editor-direction > .rs-input').type("Hi, this is my quick reply text!")
    cy.get('.link-editor-toolbar > :nth-child(1) > .rs-btn-icon').click() // done
    cy.get(':nth-child(2) > .link-short-view-target').should('contain.text', 'quick reply text')
  })

  it('delete link', () => {
    cy.get('.side-panel-dialog').contains('dialog1').click()
    cy.get('.window-widget-content').contains('Success').click()

    cy.get('.links-editor-panel > :nth-child(1) > :nth-child(1)').click() // open first link
    cy.get(':nth-child(4) > .rs-btn-icon').click() // press "delete"
    cy.get('link-short-view-text').should('not.exist')
  })
})