describe('EIDA - HU27 - Prevencion de duplicados', () => {
  it('HU27-FE-DUP-001 - Evitar solicitudes duplicadas durante el registro', () => {
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

    cy.intercept('GET', `**/exams/${examId}/incidents?*`, {
      statusCode: 200,
      body: {
        exam: {
          id: examId,
          name: 'Examen QA simulado',
          subject_name: 'Materia QA',
        },
        permissions: { can_create: true },
        data: [],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 0,
        },
      },
    }).as('consultarIncidencias')

    // Respuesta lenta para observar el estado de guardado.
    cy.intercept('POST', `**/exams/${examId}/incidents`, {
      statusCode: 201,
      delay: 1500,
      body: { data: incident },
    }).as('crearIncidencia')

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

    cy.get('select[required]').select('IDENTIFICATION')
    cy.get('textarea[required]').type('Documento ilegible.')

    // Primer intento de registro.
    cy.contains('button', 'Registrar incidencia').click()

    // El formulario debe bloquear nuevos registros.
    cy.get('button[type="submit"]')
      .should('be.disabled')
      .and('contain.text', 'Registrando')

    // Forzar un segundo evento de envio mientras el POST esta pendiente.
    cy.get('form').trigger('submit')

    // Solo debe existir una solicitud.
    cy.get('@crearIncidencia.all').should('have.length', 1)

    cy.wait('@crearIncidencia')

    // Debe navegar al detalle confirmado.
    cy.location('pathname')
      .should('eq', `/exams/${examId}/incidents/${incident.id}`)

    // Comprobar que no se genero otro POST.
    cy.get('@crearIncidencia.all').should('have.length', 1)

    cy.screenshot('HU27-FE-DUP-001-sin-duplicados')
  })
})
