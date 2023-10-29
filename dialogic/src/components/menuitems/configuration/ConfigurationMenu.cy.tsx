import React from 'react'
import ConfigurationMenu from './ConfigurationMenu'
import { GameDescription, createDefaultGame } from '../../../game/GameDescription'
import { IUpdsStubs } from '../../../../cypress/support/commands'

describe('<ConfigurationMenu />', () => {
  it('renders', () => {
    
    cy.mount(<ConfigurationMenu game={createDefaultGame()} onSetGame={() => cy} handlers={IUpdsStubs} visible={true} />)
  })
})