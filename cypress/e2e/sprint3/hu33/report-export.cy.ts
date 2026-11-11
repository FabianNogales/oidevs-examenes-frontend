describe('EIDA - HU33 - Reportes de examenes', () => {
  it('HU33-FE-EXPORT-001 - Exportar PDF y CSV', () => {
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


    // Contenidos simulados para las exportaciones.
    const pdfBody = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n'

    const csvBody =
      'SIS,Nombre,Estado\n00123,Ana Prueba,ENROLLED\n'

    let invalidarPdf = false

    // Catalogo autorizado.
    cy.intercept(
      'GET',
      '**/exam-reports/catalog*',
      {
        statusCode: 200,
        body: catalog,
      },
    ).as('catalogoReportes')

    // Generacion del reporte oficial simulado.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/reports\/ENROLLED\/?$/,
      },
      {
        statusCode: 200,
        body: reporte,
      },
    ).as('generarReporte')

    // Simular el endpoint de exportacion.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/reports\/ENROLLED\/export\/?$/,
      },
      (req) => {
        const formato = String(req.query.format)
        const esPdf = formato === 'pdf'

        req.reply({
          statusCode: 200,
          headers: {
            'content-type': esPdf
              ? 'application/pdf'
              : 'text/csv',
            'x-report-id':
              esPdf && invalidarPdf
                ? 'snapshot-invalido'
                : 'snapshot-1',
            'x-report-generated-at':
              '2026-11-03T14:00:00Z',
            'access-control-expose-headers':
              'X-Report-Id, X-Report-Generated-At',
          },
          body: esPdf ? pdfBody : csvBody,
        })
      },
    ).as('exportacion')

    // Abrir el catalogo de reportes.
    cy.visit('/teacher/exam-reports')

    cy.contains('tr', 'Primer parcial de Redes')
      .should('be.visible')
      .find('button')
      .click()

    cy.contains('button', 'Generar reporte')
      .should('be.enabled')
      .click()

    cy.get('[aria-label="Reporte generado"]')
      .should('be.visible')

    // Comprobar los formatos autorizados.
    cy.contains('button', 'Exportar PDF')
      .should('be.enabled')

    cy.contains('button', 'Exportar CSV')
      .should('be.enabled')

    // Primera exportacion: PDF.
    cy.contains('button', 'Exportar PDF')
      .click()

    cy.get('@exportacion.all')
      .should((calls) => {
        const correctas = calls.filter((call) => {
          return (
            call.response?.statusCode === 200 &&
            String(call.request.query.format) === 'pdf' &&
            String(call.request.query.report_id) ===
              'snapshot-1'
          )
        })

        expect(
          correctas.length,
          'Exportacion PDF solicitada'
        ).to.be.greaterThan(0)
      })

    // Diagnosticar la respuesta visible del frontend.
    cy.get('[aria-label="Descarga del reporte generado"]')
      .should(($section) => {
        expect(
          $section.attr('aria-busy'),
          'La solicitud de exportacion debe finalizar'
        ).to.eq('false')

        expect(
          $section.find('[role="status"], [role="alert"]').length,
          'Debe existir un mensaje final de exportacion'
        ).to.be.greaterThan(0)
      })
      .then(($section) => {
        const mensaje = $section
          .find('[role="status"], [role="alert"]')
          .text()
          .replace(/\s+/g, ' ')
          .trim()

        cy.writeFile(
          'cypress/reports/HU33-export-diagnostico.txt',
          mensaje + '\n'
        )

        cy.then(() => {
          if (!mensaje.includes(
            'Descarga iniciada con los 1 registros'
          )) {
            throw new Error(
              'Mensaje real de EIDA: ' + mensaje
            )
          }
        })
      })

    // Comprobar que el navegador haya guardado el PDF.
    cy.readFile(
      'cypress/downloads/reporte-examen-4-enrolled-snapshot-1.pdf',
      { timeout: 15000 }
    ).should('match', /^%PDF-/)

    // Segunda exportacion: CSV.
    cy.contains('button', 'Exportar CSV')
      .should('be.enabled')
      .click()

    cy.get('@exportacion.all')
      .should((calls) => {
        const correctas = calls.filter((call) => {
          return (
            call.response?.statusCode === 200 &&
            String(call.request.query.format) === 'csv' &&
            String(call.request.query.report_id) ===
              'snapshot-1'
          )
        })

        expect(
          correctas.length,
          'Exportacion CSV solicitada'
        ).to.be.greaterThan(0)
      })

    cy.readFile(
      'cypress/downloads/reporte-examen-4-enrolled-snapshot-1.csv',
      { timeout: 15000 }
    ).should('contain', '00123,Ana Prueba,ENROLLED')

    cy.screenshot(
      'HU33-FE-EXPORT-001-exportaciones-exitosas'
    )

    // Tercera solicitud: metadatos PDF incorrectos.
    cy.then(() => {
      invalidarPdf = true
    })

    cy.contains('button', 'Exportar PDF')
      .should('be.enabled')
      .click()

    cy.get('@exportacion.all')
      .should((calls) => {
        const invalidas = calls.filter((call) => {
          return (
            String(call.request.query.format) === 'pdf' &&
            call.response?.headers?.['x-report-id'] ===
              'snapshot-invalido'
          )
        })

        expect(
          invalidas.length,
          'Respuesta con identificador incorrecto'
        ).to.be.greaterThan(0)
      })

    // EIDA debe rechazar el archivo incompatible.
    cy.get(
      '[aria-label="Descarga del reporte generado"] [role="alert"]'
    )
      .should('be.visible')
      .and(
        'contain.text',
        'La descarga no corresponde al reporte generado'
      )

    cy.screenshot(
      'HU33-FE-EXPORT-001-rechazo-metadatos'
    )
  })
})
