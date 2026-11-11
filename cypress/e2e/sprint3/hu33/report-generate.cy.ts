describe('EIDA - HU33 - Reportes de examenes', () => {
  it('HU33-FE-GENERATE-001 - Generar reporte de inscritos', () => {
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

    // Simular catalogo autorizado.
    cy.intercept(
      'GET',
      '**/exam-reports/catalog*',
      {
        statusCode: 200,
        body: catalog,
      },
    ).as('catalogoReportes')

    // Simular generacion del reporte de inscritos.
    cy.intercept(
      'GET',
      '**/exams/4/reports/ENROLLED*',
      {
        statusCode: 200,
        body: reporte,
      },
    ).as('generarReporte')

    cy.visit('/teacher/exam-reports')

    cy.contains('h2', 'Selecciona un examen')
      .should('be.visible')

    cy.contains('tr', 'Primer parcial de Redes')
      .find('button')
      .click()

    // Verificar tipo de reporte seleccionado.
    cy.contains('label', 'Tipo de reporte')
      .find('select')
      .should('have.value', 'ENROLLED')

    // No generar reportes automaticamente.
    cy.get('@generarReporte.all')
      .should('have.length', 0)

    // Generar el reporte.
    cy.contains('button', 'Generar reporte')
      .should('be.enabled')
      .click()

    // Comprobar una respuesta completa HTTP 200.
    cy.get('@generarReporte.all')
      .should((calls) => {
        const completadas = calls.filter(
          (call) => call.response?.statusCode === 200
        )

        expect(completadas.length)
          .to.be.greaterThan(0)

        const request = completadas[0].request

        expect(String(request.query.subject_id))
          .to.eq('2')

        expect(String(request.query.academic_term_id))
          .to.eq('3')

        expect(String(request.query.page))
          .to.eq('1')

        expect(String(request.query.per_page))
          .to.eq('10')
      })

    // Verificar la visualizacion de los datos.
    cy.contains('00123')
      .should('be.visible')

    cy.contains('Ana')
      .should('be.visible')

    // Guardar evidencia.
    cy.screenshot(
      'HU33-FE-GENERATE-001-reporte-inscritos'
    )
  })
})
