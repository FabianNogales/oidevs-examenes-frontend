describe('EIDA - HU32 - Seguimiento de asistencia', () => {
  it('HU32-FE-SUMMARY-001 - Mostrar resumen oficial de asistencia', () => {
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

    // Simular exclusivamente la consulta de asistencia.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/attendance\/students\/?$/,
      },
      {
        statusCode: 200,
        body: page,
      },
    ).as('consultarAsistencia')

    // Abrir seguimiento del examen.
    cy.visit(`/teacher/exams/${examId}/attendance`)

    // Esperar una respuesta simulada.
    cy.wait('@consultarAsistencia')
      .its('request.url')
      .should(
        'include',
        '/exams/4/attendance/students'
      )

    // Verificar el titulo y examen.
    cy.contains('h1', 'Asistencia del examen')
      .should('be.visible')

    cy.contains('Primer parcial de Redes')
      .should('be.visible')

    // Verificar los indicadores oficiales.
    cy.get('[aria-label="Asistencia oficial del examen"]')
      .should('be.visible')
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

        // Verificar el porcentaje mostrado.
        cy.contains('33,33')
          .should('be.visible')

        // Verificar la barra de progreso.
        cy.get(
          'progress[aria-label="Porcentaje de asistencia oficial"]'
        )
          .should('have.attr', 'value', '1')
          .and('have.attr', 'max', '3')

        // La cantidad offline no esta disponible.
        cy.contains(
          'Pendientes de sincronización: información no disponible'
        ).should('be.visible')

        // Confirmar que se identifica el origen oficial.
        cy.contains('solo ingresos válidos del servidor')
          .should('be.visible')
      })

    // La pantalla permite actualizar manualmente.
    cy.contains('button', 'Actualizar ahora')
      .should('be.visible')

    // No deben presentarse errores de consulta.
    cy.contains('No se pudo confirmar la asistencia vigente')
      .should('not.exist')

    cy.screenshot('HU32-FE-SUMMARY-001-resumen-asistencia')
  })
})
