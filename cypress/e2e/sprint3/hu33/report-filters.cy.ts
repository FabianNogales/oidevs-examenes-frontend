describe('EIDA - HU33 - Reportes de examenes', () => {
  it('HU33-FE-FILTER-001 - Aplicar filtros en reportes', () => {
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


    const desde = '2026-11-01'
    const hasta = '2026-11-05'

    // Reporte compatible con las fechas solicitadas.
    const reporteFiltrado = {
      ...reporte,
      report: {
        ...reporte.report,
        filters: {
          ...reporte.report.filters,
          date_from: desde,
          date_to: hasta,
        },
      },
    }

    // Interceptar el catalogo, sin consultar backend real.
    cy.intercept(
      'GET',
      '**/exam-reports/catalog*',
      {
        statusCode: 200,
        body: catalog,
      },
    ).as('catalogoReportes')

    // Interceptar la generacion del reporte.
    cy.intercept(
      'GET',
      '**/exams/4/reports/ENROLLED*',
      {
        statusCode: 200,
        body: reporteFiltrado,
      },
    ).as('reporteFiltrado')

    cy.visit('/teacher/exam-reports')

    // Esperar que el catalogo se muestre.
    cy.contains('h2', 'Selecciona un examen')
      .should('be.visible')

    cy.contains('tr', 'Primer parcial de Redes')
      .should('be.visible')

    // Aplicar filtros de catalogo.
    cy.contains('label', 'Materia')
      .find('select')
      .select('2')

    cy.contains('label', 'Periodo académico')
      .find('select')
      .select('3')

    cy.contains('label', 'Buscar examen')
      .find('input')
      .type('Redes')

    cy.contains('button', 'Buscar')
      .click()

    // Verificar que los filtros lleguen a la API.
    cy.get('@catalogoReportes.all')
      .should((calls) => {
        const filtradas = calls.filter((call) => {
          const q = call.request.query

          return (
            call.response?.statusCode === 200 &&
            String(q.subject_id) === '2' &&
            String(q.academic_term_id) === '3' &&
            String(q.search) === 'Redes' &&
            String(q.page) === '1'
          )
        })

        expect(
          filtradas.length,
          'Consulta con filtros aplicados'
        ).to.be.greaterThan(0)
      })

    // El examen correspondiente debe permanecer.
    cy.contains('tr', 'Primer parcial de Redes')
      .should('be.visible')
      .find('button')
      .click()

    cy.contains('h2', 'Primer parcial de Redes')
      .should('be.visible')

    // Seleccionar el intervalo de fechas.
    cy.contains('label', 'Desde')
      .find('input')
      .type(desde)

    cy.contains('label', 'Hasta')
      .find('input')
      .type(hasta)

    cy.contains('label', 'Tipo de reporte')
      .find('select')
      .should('have.value', 'ENROLLED')

    // Generar reporte con filtros.
    cy.contains('button', 'Generar reporte')
      .should('be.enabled')
      .click()

    // Comprobar los parametros enviados.
    cy.get('@reporteFiltrado.all')
      .should((calls) => {
        const correctas = calls.filter((call) => {
          const q = call.request.query

          return (
            call.response?.statusCode === 200 &&
            String(q.subject_id) === '2' &&
            String(q.academic_term_id) === '3' &&
            String(q.date_from) === desde &&
            String(q.date_to) === hasta &&
            String(q.page) === '1'
          )
        })

        expect(
          correctas.length,
          'Reporte generado con fechas correctas'
        ).to.be.greaterThan(0)
      })

    // Verificar resultados visibles.
    cy.contains('00123')
      .should('be.visible')

    cy.contains('Ana')
      .should('be.visible')

    // Guardar evidencia.
    cy.screenshot(
      'HU33-FE-FILTER-001-filtros-reporte'
    )
  })
})
