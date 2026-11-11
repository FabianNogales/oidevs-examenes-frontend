describe('EIDA - HU35 - Distribucion offline', () => {
  it('HU35-FE-DIST-001 - Consultar distribucion preparada', () => {
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

    // Las consultas auxiliares del examen no
    // necesitan acceder a un backend real.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/42\/(?!offline\/assignments)/,
      },
      {
        statusCode: 503,
        body: {
          message: 'Consulta auxiliar aislada por QA.',
        },
      },
    ).as('consultaAuxiliar')

    // Simular detalle del examen.
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

    // Simular distribucion ya preparada.
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

    // Abrir la distribucion docente.
    cy.visit(
      '/teacher/exams/42/offline/assignments'
    )

    // Verificar la pantalla.
    cy.contains('h1', 'Distribución de estudiantes')
      .should('be.visible')

    // Confirmar detalle del examen.
    cy.get('@consultarExamen.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          ),
          'Detalle de examen recibido'
        ).to.eq(true)
      })

    // Confirmar distribucion recibida.
    cy.get('@consultarDistribucion.all')
      .should((calls) => {
        const correctas = calls.filter(
          (call) =>
            call.response?.statusCode === 200
        )

        expect(
          correctas.length,
          'Distribucion consultada'
        ).to.be.greaterThan(0)

        const datos = correctas[0].response?.body.data

        expect(datos.exam_id).to.eq(42)
        expect(datos.version).to.eq(1)
        expect(datos.lists).to.have.length(1)
        expect(datos.lists[0].student_count).to.eq(1)
      })

    // Verificar el responsable de la lista.
    cy.contains('Ana Pérez')
      .should('be.visible')

    // Verificar el rango de apellidos.
    cy.contains('García')
      .should('be.visible')

    // La consulta no debe preparar listas.
    cy.get('@preparacionBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU35-FE-DIST-001-distribucion-consultada'
    )
  })
})
