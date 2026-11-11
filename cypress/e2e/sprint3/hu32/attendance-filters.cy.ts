describe('EIDA - HU32 - Seguimiento de asistencia', () => {
  it('HU32-FE-FILTER-001 - Filtrar estudiantes por estado de asistencia', () => {
    const examId = 4

    // Datos basados en attendanceFixtures.mjs.
    const student = {
      student_id: 7,
      first_names: 'Ana',
      last_names: 'Prueba',
      sis_code: '00123',
      identity_number: '00099',
      student_status: 'ACTIVE',
      attendance_status: 'SERVER_CONFIRMED',
      entry: {
        id: 9,
        entered_at: '2026-11-03T13:50:00Z',
        verified_by: 2,
        verification_method: 'QR',
      },
    }

    const pending = {
      ...student,
      student_id: 8,
      first_names: 'Bruno',
      sis_code: '00124',
      attendance_status: 'PENDING',
      entry: null,
    }

    const page = {
      exam: {
        id: examId,
        name: 'Primer parcial de Redes',
        status: 'IN_PROGRESS',
      },
      summary: {
        total_students: 3,
        registered: 1,
        pending: 2,
        attendance_percentage: 33.33,
      },
      roster_scope: 'ACTIVE_ENROLLMENTS',
      source: 'SERVER',
      is_current: true,
      poll_after_seconds: 60,
      last_updated_at: '2026-11-03T14:00:00Z',
      offline: {
        available_on_server: false,
        pending_count: null,
        included_in_official_attendance: false,
      },
      exclusive_lists: {
        available: false,
        reason: 'EXCLUSIVE_LISTS_NOT_CONFIGURED',
      },
      data: [
        student,
        pending,
        {
          ...pending,
          student_id: 9,
          first_names: 'Carla',
          sis_code: '00125',
        },
      ],
      meta: {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 3,
      },
    }


    // Responder segun el filtro solicitado.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/attendance\/students\/?$/,
      },
      (req) => {
        const view = String(req.query.view || 'all')

        const rowsByView = {
          all: page.data,
          registered: [student],
          pending: [pending, page.data[2]],
        }

        if (!(view in rowsByView)) {
          req.reply({
            statusCode: 422,
            body: { message: 'Filtro no valido.' },
          })
          return
        }

        const data =
          rowsByView[view as keyof typeof rowsByView]

        req.alias = 'asistencia-' + view

        req.reply({
          statusCode: 200,
          body: {
            ...page,
            data,
            meta: {
              ...page.meta,
              total: data.length,
            },
          },
        })
      },
    )

    // Abrir la pagina de asistencia.
    cy.visit('/teacher/exams/4/attendance')

    cy.wait('@asistencia-all')

    // El filtro inicial debe ser Todos.
    cy.contains('label', 'Asistencia')
      .find('select')
      .should('have.value', 'all')

    // Mostrar los tres estudiantes.
    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('contain.text', 'Bruno Prueba')
      .and('contain.text', 'Carla Prueba')

    // Filtrar por estudiantes con ingreso valido.
    cy.contains('label', 'Asistencia')
      .find('select')
      .select('registered')

    cy.wait('@asistencia-registered')

    cy.location('search')
      .should('include', 'view=registered')

    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('not.contain.text', 'Bruno Prueba')
      .and('not.contain.text', 'Carla Prueba')

    cy.get('table')
      .should('contain.text', 'Confirmada por servidor')

    // Filtrar por estudiantes pendientes.
    cy.contains('label', 'Asistencia')
      .find('select')
      .select('pending')

    cy.wait('@asistencia-pending')

    cy.location('search')
      .should('include', 'view=pending')

    cy.get('table')
      .should('contain.text', 'Bruno Prueba')
      .and('contain.text', 'Carla Prueba')
      .and('not.contain.text', 'Ana Prueba')

    cy.get('table')
      .should('contain.text', 'Pendiente de ingreso')

    // Los totales oficiales no deben cambiar.
    cy.get('[aria-label="Asistencia oficial del examen"]')
      .within(() => {
        cy.contains('span', 'Inscritos')
          .siblings('strong')
          .should('have.text', '3')

        cy.contains('span', 'Ingresos oficiales')
          .siblings('strong')
          .should('have.text', '1')

        cy.contains('span', 'Pendientes de ingreso')
          .siblings('strong')
          .should('have.text', '2')
      })

    // Restaurar el filtro Todos.
    cy.contains('label', 'Asistencia')
      .find('select')
      .select('all')

    cy.wait('@asistencia-all')

    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('contain.text', 'Bruno Prueba')
      .and('contain.text', 'Carla Prueba')

    cy.screenshot('HU32-FE-FILTER-001-filtros-asistencia')
  })
})
