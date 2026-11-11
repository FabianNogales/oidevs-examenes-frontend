describe('EIDA - HU32 - Seguimiento de asistencia', () => {
  it('HU32-FE-ACTIVITY-001 - Consultar colaboradores y listas', () => {
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


    // Lista exclusiva simulada.
    const lista = {
      id: 12,
      name: 'Lista A–M',
      collaborator: {
        id: 2,
        name: 'Docente responsable',
      },
      ...page.summary,
    }

    const exclusiveLists = {
      available: true,
      data: [lista],
    }

    // Simular consultas generales y por lista.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/attendance\/students\/?$/,
      },
      (req) => {
        const listId = String(req.query.list_id ?? '')

        req.alias =
          listId === '12'
            ? 'consultaLista12'
            : 'consultaGeneral'

        req.reply({
          statusCode: 200,
          body: {
            ...page,
            exclusive_lists: exclusiveLists,
            ...(listId === '12'
              ? { selected_list: lista }
              : {}),
          },
        })
      },
    )

    // Simular actividad realista por responsable.
    const actividad = {
      ...page,
      exclusive_lists: exclusiveLists,
      collaborators: {
        available: true,
        metric: 'VALID_ENTRIES_VERIFIED_BY_USER',
        progress_by_assigned_list_available: false,
        data: [
          {
            user_id: 2,
            name: 'Docente responsable',
            role: 'RESPONSIBLE_TEACHER',
            assignment_status: null,
            valid_registered: 1,
            assigned_total: null,
            pending: null,
            attendance_percentage: null,
          },
        ],
      },
    }

    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/attendance\/collaborators\/?$/,
      },
      {
        statusCode: 200,
        body: actividad,
      },
    ).as('consultarActividad')

    // Abrir seguimiento de asistencia.
    cy.visit('/teacher/exams/4/attendance')

    cy.wait('@consultaGeneral')

    cy.contains('h1', 'Asistencia del examen')
      .should('be.visible')

    // La consulta de colaboradores se realiza
    // unicamente cuando se abre la vista.
    cy.get('@consultarActividad.all')
      .should('have.length', 0)

    // Cambiar a la vista de colaboradores.
    cy.contains('button', 'Colaboradores y listas')
      .should('be.visible')
      .click()

    cy.wait('@consultarActividad')

    cy.contains('h2', 'Actividad por colaborador')
      .should('be.visible')

    // Verificar la actividad del docente.
    cy.get('table')
      .should('contain.text', 'Docente responsable')
      .and('contain.text', 'Ingresos válidos registrados')

    cy.contains('tbody tr', 'Docente responsable')
      .within(() => {
        cy.get('td')
          .eq(2)
          .should('contain.text', '1')
      })

    // No mostrar columnas de avance no disponible.
    cy.contains('th', 'Asignados')
      .should('not.exist')

    cy.contains('th', 'Avance de lista')
      .should('not.exist')

    // Verificar la lista disponible.
    cy.contains('button', 'Lista A–M')
      .should('be.visible')
      .click()

    cy.wait('@consultaLista12')

    // Debe regresar a la vista de estudiantes.
    cy.contains('h2', 'Estudiantes del examen')
      .should('be.visible')

    cy.location('search')
      .should('include', 'list_id=12')

    // Presentar la lista y sus estudiantes.
    cy.contains('Lista A–M')
      .should('be.visible')

    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('contain.text', 'Bruno Prueba')
      .and('contain.text', 'Carla Prueba')

    // Conservar los indicadores oficiales.
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

    // Volver a todas las listas.
    cy.contains('button', 'Ver todas las listas')
      .click()

    cy.wait('@consultaGeneral')

    cy.location('search')
      .should('not.include', 'list_id=')

    cy.screenshot(
      'HU32-FE-ACTIVITY-001-colaboradores-listas'
    )
  })
})
