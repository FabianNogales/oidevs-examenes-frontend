describe('EIDA - HU27 - Validaciones de incidencias', () => {
  it('HU27-FE-VAL-001 - Impedir registro con campos obligatorios vacios', () => {
    const examId = 4

    // Simular un listado vacio de incidencias con permiso de registro.
    cy.intercept('GET', `**/exams/${examId}/incidents*`, {
      statusCode: 200,
      body: {
        exam: {
          id: examId,
          name: 'Examen QA simulado',
          subject_name: 'Materia QA',
        },
        permissions: {
          can_create: true,
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

    // Bloquear cualquier intento de POST, evitando escrituras reales.
    cy.intercept('POST', `**/exams/${examId}/incidents`, {
      statusCode: 418,
      body: { message: 'Solicitud bloqueada por Cypress QA' },
    }).as('registrarIncidencia')

    cy.visit(`/exams/${examId}/incidents/create`)

    cy.wait('@consultarIncidencias')

    cy.contains('h1', 'Registrar incidencia').should('be.visible')

    // Comprobar que los campos comienzan vacios.
    cy.get('select[required]').should('have.value', '')
    cy.get('textarea[required]').should('have.value', '')

    // Intentar registrar sin completar los campos.
    cy.contains('button', 'Registrar incidencia').click()

    // Verificar validaciones visibles en los campos.
    cy.get('select[required]')
      .should('have.attr', 'aria-invalid', 'true')

    cy.get('textarea[required]')
      .should('have.attr', 'aria-invalid', 'true')

    // No debe existir ninguna solicitud POST.
    cy.get('@registrarIncidencia.all').should('have.length', 0)

    // Guardar captura de las validaciones.
    cy.screenshot('HU27-FE-VAL-001-validaciones')
  })
})
