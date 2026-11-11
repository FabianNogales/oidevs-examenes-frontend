describe('EIDA - HU27 - Registro exitoso', () => {
  it('HU27-FE-SAVE-001 - Registrar incidencia y navegar al detalle', () => {
    const examId = 4

    const incident = {
      id: 9,
      exam_id: examId,
      type: 'IDENTIFICATION',
      description: 'Documento ilegible.',
      origin: 'MANUAL',
      status: 'REPORTED',
      student: null,
      reported_by: {
        id: 2,
        name: 'Docente QA',
      },
      created_at: '2026-11-09T14:00:00Z',
    }

    // Simular autorización para registrar.
    cy.intercept('GET', `**/exams/${examId}/incidents?*`, {
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

    // Simular confirmación de registro.
    // No se envía ninguna escritura al backend real.
    cy.intercept('POST', `**/exams/${examId}/incidents`, {
      statusCode: 201,
      body: {
        data: incident,
      },
    }).as('crearIncidencia')

    // Simular consulta posterior del detalle.
    cy.intercept(
      'GET',
      `**/exams/${examId}/incidents/${incident.id}*`,
      {
        statusCode: 200,
        body: { data: incident },
      }
    ).as('consultarDetalle')

    cy.visit(`/exams/${examId}/incidents/create`)
    cy.wait('@consultarIncidencias')

    cy.contains('h1', 'Registrar incidencia')
      .should('be.visible')

    // Completar campos válidos.
    cy.get('select[required]')
      .select('IDENTIFICATION')

    cy.get('textarea[required]')
      .type('Documento ilegible.')

    // Registrar incidencia.
    cy.contains('button', 'Registrar incidencia')
      .click()

    // Verificar los datos enviados.
    cy.wait('@crearIncidencia')
      .its('request.body')
      .should('deep.include', {
        type: 'IDENTIFICATION',
        description: 'Documento ilegible.',
        student_id: null,
      })

    // Confirmar navegación al registro creado.
    cy.location('pathname')
      .should('eq', `/exams/${examId}/incidents/${incident.id}`)

    cy.screenshot('HU27-FE-SAVE-001-registro-simulado')
  })
})
