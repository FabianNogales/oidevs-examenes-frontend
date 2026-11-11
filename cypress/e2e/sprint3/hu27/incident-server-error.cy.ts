describe('EIDA - HU27 - Errores de consulta', () => {
  it('HU27-FE-ERR-001 - No permitir registro cuando falla la consulta', () => {
    const examId = 4

    // Simular un error HTTP 500 en la consulta.
    cy.intercept('GET', `**/exams/${examId}/incidents*`, {
      statusCode: 500,
      body: {
        message: 'Error de servidor simulado por QA',
      },
    }).as('consultaFallida')

    // Impedir cualquier escritura accidental.
    cy.intercept('POST', `**/exams/${examId}/incidents`, {
      statusCode: 500,
      body: { message: 'POST bloqueado por QA' },
    }).as('registroBloqueado')

    cy.visit(`/exams/${examId}/incidents/create`)

    cy.wait('@consultaFallida')

    cy.contains('h1', 'Registrar incidencia')
      .should('be.visible')

    // Debe informar que no se pudo consultar.
    cy.get('[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'No se pudo completar la operación')

    // Debe permitir intentar nuevamente.
    cy.contains('button', 'Reintentar')
      .should('be.visible')

    // No debe mostrar el formulario de registro.
    cy.contains('button', 'Registrar incidencia')
      .should('not.exist')

    // Verificar el comportamiento del reintento.
    cy.contains('button', 'Reintentar').click()
    cy.wait('@consultaFallida')

    cy.get('[role="alert"]').should('be.visible')

    // No debe haberse enviado un POST.
    cy.get('@registroBloqueado.all')
      .should('have.length', 0)

    cy.screenshot('HU27-FE-ERR-001-error-consulta')
  })
})
