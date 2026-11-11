describe('EIDA - HU35 - Distribucion offline', () => {
  it('HU35-FE-ERROR-001 - Mostrar rechazo de preparacion', () => {
    const examen = {
      id: 42,
      name: 'Primer parcial',
      subject_code: 'PROG-01',
      subject_name: 'Programación I',
      exam_date: '2027-01-15',
      start_time: '10:00:00',
      duration_minutes: 60,
      status: 'SCHEDULED',
      course_offering_id: 8,
      rules: null,
      updated_at: '2026-11-10T14:00:00Z',
    }

    const distribucion = {
      exam_id: 42,
      version: 1,
      prepared_at: '2027-01-15T13:30:00.000000Z',
      lists: [
        {
          list_id: 8,
          responsible_id: 7,
          responsible_name: 'Ana Pérez',
          student_count: 1,
          surname_range: {
            from: 'García',
            to: 'García',
          },
          students: [
            {
              list_id: 8,
              student_id: 101,
              first_names: 'Luis',
              last_names: 'García',
              sis_code: '202600101',
            },
          ],
        },
      ],
    }


    // Detalle del examen.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/teacher\/exams\/42\/?$/,
      },
      {
        statusCode: 200,
        body: { data: examen },
      },
    ).as('consultarExamen')

    // Aun no existe una distribucion consultable.
    // Se excluye la ruta HTML /teacher/...
    cy.intercept(
      {
        method: 'GET',
        pathname: /^(?!\/teacher\/).*\/exams\/42\/offline\/assignments\/?$/,
      },
      {
        statusCode: 404,
        body: {
          code: 'DISTRIBUTION_NOT_FOUND',
          message: 'Distribucion no preparada.',
        },
      },
    ).as('consultarDistribucion')

    // El servidor rechaza la preparacion.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/42\/offline\/prepare\/?$/,
      },
      {
        statusCode: 409,
        body: {
          code: 'DISTRIBUTION_FROZEN',
          message:
            'La distribucion esta congelada en version 1.',
        },
      },
    ).as('preparacionRechazada')

    cy.visit(
      '/teacher/exams/42/offline/assignments'
    )

    cy.contains('h1', 'Distribución de estudiantes')
      .should('be.visible')

    // Confirmar estado inicial.
    cy.get('@consultarDistribucion.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 404
          )
        ).to.eq(true)
      })

    cy.contains('h2', 'Preparar listas del examen')
      .should('be.visible')

    cy.contains('button', 'Preparar listas')
      .should('be.enabled')

    // Solicitar preparacion.
    cy.contains('button', 'Preparar listas')
      .click()

    cy.contains('Preparar listas exclusivas')
      .should('be.visible')

    // No existe solicitud antes de confirmar.
    cy.get('@preparacionRechazada.all')
      .should('have.length', 0)

    cy.contains('button', 'Confirmar preparación')
      .click()

    // Verificar rechazo del servidor simulado.
    cy.wait('@preparacionRechazada')
      .then((interception) => {
        expect(interception.request.method)
          .to.eq('POST')

        expect(interception.request.body)
          .to.deep.equal({})

        expect(interception.response?.statusCode)
          .to.eq(409)

        expect(interception.response?.body.code)
          .to.eq('DISTRIBUTION_FROZEN')
      })

    // El usuario debe recibir un mensaje claro.
    cy.contains(
      '[role="alert"]',
      'La distribución está congelada en versión 1.'
    ).should('be.visible')

    cy.contains(
      '[role="alert"]',
      'El servidor no permite regenerarla'
    ).should('be.visible')

    // No debe mostrarse una preparacion exitosa.
    cy.contains('h2', 'Distribución preparada')
      .should('not.exist')

    cy.contains('h2', 'Preparar listas del examen')
      .should('be.visible')

    // El error bloquea una segunda preparacion
    // hasta que se actualice la consulta.
    cy.contains('button', 'Preparar listas')
      .should('be.disabled')

    // No debe mostrarse ninguna lista ficticia.
    cy.contains('Ana Pérez')
      .should('not.exist')

    // Solo hubo un intento de preparacion.
    cy.get('@preparacionRechazada.all')
      .should('have.length', 1)

    cy.screenshot(
      'HU35-FE-ERROR-001-preparacion-rechazada'
    )
  })
})
