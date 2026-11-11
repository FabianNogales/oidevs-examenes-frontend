describe('EIDA - HU35 - Distribucion offline', () => {
  it('HU35-FE-REUSE-001 - Reutilizar distribucion existente', () => {
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

    // Distribucion existente en version 1.
    // No interceptar la ruta HTML del frontend.
    cy.intercept(
      {
        method: 'GET',
        pathname: /^(?!\/teacher\/).*\/exams\/42\/offline\/assignments\/?$/,
      },
      {
        statusCode: 200,
        body: { data: distribucion },
      },
    ).as('consultarDistribucion')

    // Bloquear cualquier preparacion accidental.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/42\/offline\/prepare\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Preparacion bloqueada por QA.',
        },
      },
    ).as('preparacionBloqueada')

    cy.visit(
      '/teacher/exams/42/offline/assignments'
    )

    cy.contains('h1', 'Distribución de estudiantes')
      .should('be.visible')

    cy.contains('h2', 'Distribución preparada')
      .should('be.visible')

    // Verificar que se consulte la distribucion.
    cy.get('@consultarDistribucion.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    // No debe ofrecer preparar nuevamente.
    cy.contains('button', 'Preparar listas')
      .should('not.exist')

    cy.contains('Ana Pérez')
      .should('be.visible')

    cy.contains('García')
      .should('be.visible')

    // Registrar las consultas iniciales.
    cy.get('@consultarDistribucion.all')
      .then((calls) => {
        const consultasIniciales = calls.length

        // Actualizar sin preparar nuevamente.
        cy.contains('button', 'Actualizar consulta')
          .should('be.enabled')
          .click()

        cy.get('@consultarDistribucion.all')
          .should((actualizadas) => {
            expect(actualizadas.length)
              .to.be.greaterThan(consultasIniciales)

            expect(
              actualizadas.some((call) =>
                call.response?.statusCode === 200
              )
            ).to.eq(true)
          })
      })

    // La distribucion debe continuar visible.
    cy.contains('h2', 'Distribución preparada')
      .should('be.visible')

    cy.contains('Ana Pérez')
      .should('be.visible')

    // Recargar la pagina.
    cy.reload()

    cy.contains('h2', 'Distribución preparada')
      .should('be.visible')

    cy.contains('Ana Pérez')
      .should('be.visible')

    cy.contains('button', 'Preparar listas')
      .should('not.exist')

    // Comprobar que se conserva la version.
    cy.get('@consultarDistribucion.all')
      .should((calls) => {
        const correctas = calls.filter(
          (call) =>
            call.response?.statusCode === 200
        )

        expect(
          correctas.length,
          'Consultas de distribucion'
        ).to.be.at.least(2)

        correctas.forEach((call) => {
          expect(call.response?.body.data.version)
            .to.eq(1)

          expect(call.response?.body.data.lists[0].list_id)
            .to.eq(8)
        })
      })

    // Nunca se preparo una segunda distribucion.
    cy.get('@preparacionBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU35-FE-REUSE-001-distribucion-conservada'
    )
  })
})
