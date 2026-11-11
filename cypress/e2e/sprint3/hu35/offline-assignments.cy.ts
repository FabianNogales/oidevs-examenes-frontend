describe('EIDA - HU35 - Distribucion offline', () => {
  it('HU35-FE-ASSIGN-001 - Consultar estudiantes asignados', () => {
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


    // Detalle del examen simulado.
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

    // Consultar la distribucion existente.
    // Excluir la ruta HTML del frontend.
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

    // Impedir preparaciones accidentales.
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

    // Confirmar la distribucion recibida.
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

        expect(datos.lists[0].list_id).to.eq(8)
        expect(datos.lists[0].responsible_id).to.eq(7)

        expect(datos.lists[0].responsible_name)
          .to.eq('Ana Pérez')

        expect(datos.lists[0].student_count)
          .to.eq(1)

        expect(datos.lists[0].students[0].student_id)
          .to.eq(101)
      })

    // La tarjeta debe presentar al responsable.
    cy.contains('Ana Pérez')
      .should('be.visible')

    cy.contains('García')
      .should('be.visible')

    // Abrir la lista de estudiantes asignados.
    cy.contains('button', 'Consultar estudiantes')
      .should('be.visible')
      .click()

    // Verificar que se abre la lista seleccionada.
    cy.location('search')
      .should('include', 'listId=8')

    // Verificar los datos del estudiante.
    cy.contains('202600101')
      .should('be.visible')

    cy.contains('Luis')
      .should('be.visible')

    cy.contains('García')
      .should('be.visible')

    // Consultar estudiantes no debe preparar listas.
    cy.get('@preparacionBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU35-FE-ASSIGN-001-estudiantes-asignados'
    )
  })
})
