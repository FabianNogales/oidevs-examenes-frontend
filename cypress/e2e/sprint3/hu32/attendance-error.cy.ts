describe('EIDA - HU32 - Seguimiento de asistencia', () => {
  it('HU32-FE-ERROR-001 - Recuperar asistencia despues de error del servidor', () => {
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


    // El servidor comienza con un error simulado.
    let permitirExito = false

    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/attendance\/students\/?$/,
      },
      (req) => {

        if (!permitirExito) {
          req.reply({
            statusCode: 503,
            body: {
              message: 'Servicio temporalmente no disponible.',
            },
          })
          return
        }

        req.reply({
          statusCode: 200,
          body: page,
        })
      },
    ).as('consultaAsistencia')

    // Abrir seguimiento de asistencia.
    cy.visit('/teacher/exams/4/attendance')

    // Confirmar el error inicial del servidor.
    cy.get('@consultaAsistencia.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 503
          ),
          'Al menos una respuesta HTTP 503'
        ).to.eq(true)
      })

    cy.contains(
      'h2',
      'No se pudo confirmar la asistencia vigente'
    ).should('be.visible')

    cy.contains(
      'No se pudo recuperar la asistencia vigente.'
    ).should('be.visible')

    // No presentar cifras como vigentes ante el error.
    cy.get('[aria-label="Asistencia oficial del examen"]')
      .should('not.exist')

    cy.screenshot(
      'HU32-FE-ERROR-001-error-servidor'
    )

    // Habilitar la respuesta exitosa del servidor.
    cy.then(() => {
      permitirExito = true
    })

    // Reintentar la consulta.
    cy.contains('button', 'Reintentar consulta')
      .should('be.visible')
      .click()

    cy.get('@consultaAsistencia.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          ),
          'Al menos una respuesta HTTP 200'
        ).to.eq(true)
      })

    // El resumen oficial debe recuperarse.
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

        cy.contains('33,33')
          .should('be.visible')
      })

    // El mensaje de error debe desaparecer.
    cy.contains(
      'h2',
      'No se pudo confirmar la asistencia vigente'
    ).should('not.exist')

    // Verificar actualizacion manual.
    cy.get('@consultaAsistencia.all').then((calls) => {
      const anteriores = calls.filter(
        (call) => call.response?.statusCode === 200
      ).length

      cy.contains('button', 'Actualizar ahora')
        .should('be.enabled')
        .click()

      cy.get('@consultaAsistencia.all')
        .should((nuevas) => {
          const confirmadas = nuevas.filter(
            (call) => call.response?.statusCode === 200
          ).length

          expect(confirmadas).to.be.greaterThan(
            anteriores
          )
        })
    })

    // El resumen sigue siendo consistente.
    cy.get('[aria-label="Asistencia oficial del examen"]')
      .should('be.visible')

    cy.screenshot(
      'HU32-FE-ERROR-001-asistencia-recuperada'
    )
  })
})
