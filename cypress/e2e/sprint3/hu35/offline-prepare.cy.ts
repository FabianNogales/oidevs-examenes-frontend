describe('EIDA - HU35 - Distribucion offline', () => {
  it('HU35-FE-PREPARE-001 - Confirmar preparacion inicial', () => {
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


    // Simular el detalle del examen.
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

    // Todavia no existe una distribucion.
    // Excluir expresamente la ruta HTML del frontend.
    cy.intercept(
      {
        method: 'GET',
        pathname: /^(?!\/teacher\/).*\/exams\/42\/offline\/assignments\/?$/,
      },
      {
        statusCode: 404,
        body: {
          message: 'Distribucion aun no preparada.',
          code: 'DISTRIBUTION_NOT_FOUND',
        },
      },
    ).as('consultarDistribucion')

    // Simular exclusivamente la preparacion.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/42\/offline\/prepare\/?$/,
      },
      {
        statusCode: 200,
        body: { data: distribucion },
      },
    ).as('prepararListas')

    // Abrir la distribucion del examen.
    cy.visit(
      '/teacher/exams/42/offline/assignments'
    )

    cy.contains('h1', 'Distribución de estudiantes')
      .should('be.visible')

    // Confirmar que inicialmente no hay listas.
    cy.get('@consultarDistribucion.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 404
          ),
          'Distribucion inicial inexistente'
        ).to.eq(true)
      })

    cy.contains('h2', 'Preparar listas del examen')
      .should('be.visible')

    cy.contains('button', 'Preparar listas')
      .should('be.enabled')

    // No se debe preparar automaticamente.
    cy.get('@prepararListas.all')
      .should('have.length', 0)

    // Abrir la confirmacion.
    cy.contains('button', 'Preparar listas')
      .click()

    cy.contains('Preparar listas exclusivas')
      .should('be.visible')

    // La interfaz debe advertir que
    // la primera distribucion queda congelada.
    cy.contains(
      'La primera distribución queda congelada en versión 1'
    ).should('be.visible')

    cy.contains(
      'no permite reasignar ni regenerar estudiantes después'
    ).should('be.visible')

    // Cancelar no debe enviar ninguna solicitud.
    cy.contains('button', 'Cancelar')
      .click()

    cy.contains('button', 'Confirmar preparación')
      .should('not.exist')

    cy.get('@prepararListas.all')
      .should('have.length', 0)

    // Abrir nuevamente el modal.
    cy.contains('button', 'Preparar listas')
      .click()

    cy.contains('button', 'Confirmar preparación')
      .should('be.enabled')
      .click()

    // Comprobar la solicitud POST simulada.
    cy.wait('@prepararListas')
      .then((interception) => {
        expect(interception.response?.statusCode)
          .to.eq(200)

        expect(interception.request.method)
          .to.eq('POST')

        expect(interception.request.body)
          .to.deep.equal({})

        expect(interception.response?.body.data.version)
          .to.eq(1)
      })

    // La interfaz debe mostrar la
    // distribucion preparada.
    cy.contains('h2', 'Distribución preparada')
      .should('be.visible')

    cy.contains('Ana Pérez')
      .should('be.visible')

    cy.contains('García')
      .should('be.visible')

    // No debe ofrecer una segunda preparacion.
    cy.contains('button', 'Preparar listas')
      .should('not.exist')

    // Solo se permite un POST de preparacion.
    cy.get('@prepararListas.all')
      .should('have.length', 1)

    cy.screenshot(
      'HU35-FE-PREPARE-001-listas-preparadas'
    )
  })
})
