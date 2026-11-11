describe('EIDA - RUN-S3-FE-001 - Smoke', () => {
  it('SMOKE-FE-001 - Cargar la pagina principal publica', () => {
    cy.visit('/')

    // Verificar la ruta principal
    cy.location('pathname').should('eq', '/')

    // Verificar que React renderiza contenido
    cy.get('#root')
      .should('exist')
      .and('not.be.empty')

    // Verificar que la pagina es visible
    cy.get('body').should('be.visible')
  })
})
