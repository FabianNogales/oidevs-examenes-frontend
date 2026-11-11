describe('EIDA - HU33 - Reportes de examenes', () => {
  it('HU33-FE-AUTH-001 - Rechazar reporte no autorizado', () => {
    const exam = {
      id: 4,
      name: 'Primer parcial de Redes',
      exam_date: '2026-11-03',
      status: 'IN_PROGRESS',
      subject: {
        id: 2,
        code: 'RED-01',
        name: 'Redes de Computadoras',
      },
      academic_term: {
        id: 3,
        name: '2/2026',
      },
      permissions: {
        report_types: [
          'ENROLLED',
          'ATTENDANCE',
          'PENDING_ABSENT',
          'INCIDENTS',
          'DISCIPLINARY',
        ],
        formats: ['pdf', 'csv'],
      },
    }

    const catalog = {
      data: [exam],
      filters: {
        subjects: [exam.subject],
        academic_terms: [exam.academic_term],
      },
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 1,
      },
    }


    const estudiante = {
      id: 7,
      first_names: 'Ana',
      last_names: 'Prueba',
      sis_code: '00123',
      identity_number: '00099',
    }

    const reporte = {
      exam,
      report: {
        id: 'snapshot-1',
        type: 'ENROLLED',
        scope: 'EXAM',
        generated_at: '2026-11-03T14:00:00Z',
        source: 'SERVER',
        offline_pending_included: false,
        total_records: 1,
        total_participants: 1,
        pending_classification: null,
        formats: ['pdf', 'csv'],
        filters: {
          exam_id: 4,
          subject_id: 2,
          academic_term_id: 3,
          date_from: null,
          date_to: null,
        },
      },
      data: [
        {
          source_id: 7,
          record_type: 'ENROLLMENT',
          exam_id: 4,
          student: estudiante,
          state: 'ENROLLED',
          category: null,
          description: null,
          occurred_at: null,
          method: null,
          origin: null,
          recorded_by: null,
          related_infraction_id: null,
        },
      ],
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 1,
      },
    }


    // Catalogo simulado con un examen visible.
    cy.intercept(
      'GET',
      '**/exam-reports/catalog*',
      {
        statusCode: 200,
        body: catalog,
      },
    ).as('catalogoReportes')

    // El servidor deniega la generacion del reporte.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/reports\/ENROLLED\/?$/,
      },
      {
        statusCode: 403,
        body: {
          message: 'No autorizado para consultar este reporte.',
        },
      },
    ).as('reporteDenegado')

    // Abrir el catalogo docente.
    cy.visit('/teacher/exam-reports')

    cy.contains('h2', 'Selecciona un examen')
      .should('be.visible')

    // Seleccionar el examen.
    cy.contains('tr', 'Primer parcial de Redes')
      .should('be.visible')
      .find('button')
      .click()

    cy.contains('h2', 'Primer parcial de Redes')
      .should('be.visible')

    // Solicitar el reporte de inscritos.
    cy.contains('label', 'Tipo de reporte')
      .find('select')
      .should('have.value', 'ENROLLED')

    cy.contains('button', 'Generar reporte')
      .should('be.enabled')
      .click()

    // Confirmar que la API devolvio HTTP 403.
    cy.get('@reporteDenegado.all')
      .should((calls) => {
        const denegadas = calls.filter(
          (call) => call.response?.statusCode === 403
        )

        expect(
          denegadas.length,
          'Solicitudes rechazadas con HTTP 403'
        ).to.be.greaterThan(0)

        const request = denegadas[0].request

        expect(String(request.query.subject_id))
          .to.eq('2')

        expect(String(request.query.academic_term_id))
          .to.eq('3')
      })

    // Debe mostrarse un error y no un reporte oficial.
    cy.get('[role="alert"]')
      .should('be.visible')
      .invoke('text')
      .should('match', /\S/)

    cy.contains('button', 'Reintentar consulta')
      .should('be.visible')

    cy.get('[aria-label="Reporte generado"]')
      .should('not.exist')

    // No deben mostrarse opciones de descarga.
    cy.contains('button', 'Exportar PDF')
      .should('not.exist')

    cy.contains('button', 'Exportar CSV')
      .should('not.exist')

    cy.screenshot(
      'HU33-FE-AUTH-001-reporte-denegado'
    )

    // Volver al catalogo de examenes.
    cy.contains('button', 'Cambiar examen')
      .should('be.visible')
      .click()

    cy.contains('h2', 'Selecciona un examen')
      .should('be.visible')

    cy.location('pathname')
      .should('eq', '/teacher/exam-reports')
  })
})
