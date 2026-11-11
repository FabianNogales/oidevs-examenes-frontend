describe('EIDA - HU27 - Permisos de incidencias', () => {
  it('HU27-FE-AUTH-001 - Ocultar registro sin permiso vigente', () => {
    const examId = 4

    cy.intercept('GET', `**/exams/${examId}/incidents*`, {
      statusCode: 200,
      body: {
        exam: {
          id: examId,
          name: 'Examen QA simulado',
          subject_name: 'Materia QA',
        },
        permissions: {
          can_create: false,
        },
        data: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
        },
      },
    }).as('consultarIncidencias')

    // Evitar escrituras reales si ocurre un error de interfaz.
    cy.intercept('POST', `**/exams/${examId}/incidents`, {
      statusCode: 403,
      body: { message: 'Operación no autorizada' },
    }).as('registrarIncidencia')

    cy.visit(`/exams/${examId}/incidents/create`)

    cy.wait('@consultarIncidencias')

    cy.contains('h1', 'Registrar incidencia')
      .should('be.visible')

    cy.contains(
      'No tienes autorización vigente para registrar incidencias en este examen.'
    ).should('be.visible')

    // El formulario no debe estar disponible.
    cy.contains('button', 'Registrar incidencia')
      .should('not.exist')

    // No se debe enviar ninguna solicitud de registro.
    cy.get('@registrarIncidencia.all')
      .should('have.length', 0)

    cy.screenshot('HU27-FE-AUTH-001-sin-permiso')
  })
})
