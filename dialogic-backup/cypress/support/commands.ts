/// <reference types="cypress" />

import { DialogWindowListUpdater, IUpds } from "../../src/App";
import Dialog, { DialogWindow } from "../../src/game/Dialog"
import Loc from "../../src/game/Loc";
import Prop from "../../src/game/Prop";

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --

export const IUpdsStubs: IUpds = {
  handleDialogEdit: (dialog: Dialog) => {
    // Implement stub for handleDialogEdit
  },
  handleDialogCreate: (dialog: Dialog) => {
    // Implement stub for handleDialogCreate
  },
  handleDialogApplyChange: (func: DialogWindowListUpdater, dialog_uid: string | null) => {
    // Implement stub for handleDialogApplyChange
  },
  handleDialogWindowChange: (window: DialogWindow, dialog_uid: string | null, create?: boolean) => {
    // Implement stub for handleDialogWindowChange
  },
  handleLocChange: (locs: Loc[]) => {
    // Implement stub for handleLocChange
  },
  handlePropChange: (props: Prop[]) => {
    // Implement stub for handlePropChange
  },
  createProp: (prop: Prop) => {
    // Implement stub for createProp
  },
  notify: (message: string) => {
    // Implement stub for notify
  },
  copy: (obj: any, typename: string) => {
    // Implement stub for copy
  },
  paste: () => {
    // Implement stub for paste
    return undefined;
  },
}

// Cypress.Commands.add('createHandlers', () => { 
//     return stubs
//  })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//

Cypress.Commands.add('useTestGame', () => {
  cy.visit('http://localhost:3000/')
  cy.get('[data-event-key="saveload"]').click()
  cy.get('#server-file-loader .rs-picker-toggle').click()
  cy.get('.rs-picker-select-menu-item').contains('testgame.json').click()
  cy.get('#load-server-file').click()
})

Cypress.Commands.add('openMenu', (menu: string) => {
  cy.get(`[data-event-key="${menu}"]`).click()
})

Cypress.Commands.add('clickDialog', (buttonText: string) => {
  cy.wait(200)
  cy.get('button.dialog-button').contains(buttonText).click()
})

Cypress.Commands.add('checkDialog', (text: string) => {
  cy.wait(200)
  cy.get('.dialog-current-text').should('contain.text', text)
})

declare global {
  namespace Cypress {
    interface Chainable {
      useTestGame(): Chainable<void>
      openMenu(menu: string): Chainable<void>
      clickDialog(buttonText: string): Chainable<void>
      checkDialog(buttonText: string): Chainable<void>
      // drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      // dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      // visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
    }
  }
}