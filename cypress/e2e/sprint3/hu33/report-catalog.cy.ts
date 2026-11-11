describe('EIDA - HU33 - Reportes de examenes', () => {
  it('HU33-FE-CATALOG-001 - Seleccionar examen autorizado', () => {
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

    // Simular el catalogo autorizado.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exam-reports\/catalog\/?$/,
      },
      {
        statusCode: 200,
        body: catalog,
      },
    ).as('catalogoReportes')

    // Impedir consultas reales de generacion.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/reports\/[^/]+\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Generacion bloqueada por Cypress QA.',
        },
      },
    ).as('generarReporte')

    // Abrir el catalogo docente.
    cy.visit('/teacher/exam-reports')

    cy.get('@catalogoReportes.all')
      .should((calls) => {
        const confirmadas = calls.filter(
          (call) => call.response?.statusCode === 200
        )

        expect(
          confirmadas.length,
          'Solicitudes del catalogo con HTTP 200'
        ).to.be.greaterThan(0)

        const request = confirmadas[0].request

        expect(String(request.query.page)).to.eq('1')
        expect(String(request.query.per_page)).to.eq('10')
      })

    // Verificar titulo y catalogo.
    cy.contains('h1', 'Reportes de exámenes')
      .should('be.visible')

    cy.contains('h2', 'Selecciona un examen')
      .should('be.visible')

    // Verificar el examen autorizado.
    cy.get('table')
      .should('contain.text', 'Primer parcial de Redes')
      .and('contain.text', 'Redes de Computadoras')
      .and('contain.text', 'RED-01')
      .and('contain.text', '2/2026')
      .and('contain.text', '03/11/2026')

    cy.get('tbody tr')
      .should('have.length', 1)

    // Seleccionar el examen desde su fila.
    cy.contains('tr', 'Primer parcial de Redes')
      .find('button')
      .should('be.visible')
      .click()

    // Debe abrir el area de generacion.
    cy.contains('h2', 'Primer parcial de Redes')
      .should('be.visible')

    cy.contains('Redes de Computadoras')
      .should('be.visible')

    cy.contains('button', 'Generar reporte')
      .should('be.visible')

    // Comprobar los tipos autorizados.
    cy.contains('label', 'Tipo de reporte')
      .find('select')
      .should('have.value', 'ENROLLED')
      .find('option')
      .should('have.length', 5)

    // No debe generarse automaticamente un reporte.
    cy.get('@generarReporte.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU33-FE-CATALOG-001-examen-seleccionado'
    )

    // Regresar al catalogo.
    cy.contains('button', 'Cambiar examen')
      .should('be.visible')
      .click()

    cy.contains('h2', 'Selecciona un examen')
      .should('be.visible')

    cy.location('pathname')
      .should('eq', '/teacher/exam-reports')

    cy.contains('button', 'Generar reporte')
      .should('not.exist')
  })
})
