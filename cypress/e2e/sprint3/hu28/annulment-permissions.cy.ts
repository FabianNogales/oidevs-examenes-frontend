describe('EIDA - HU28 - Validacion de anulaciones', () => {
  it('HU28-FE-AUTH-001 - Ocultar anulacion sin permiso', () => {
    const examId = 4
    const entryId = 9

    const student = {
      student_id: 7,
      first_names: 'Ana',
      last_names: 'Prueba',
      sis_code: '00123',
      identity_number: '12345',
      historical_photo_url: null,
      profile_photo_url: null,
    }

    const entry = {
      student,
      permissions: { can_annul: false },
      entry: {
        id: entryId,
        exam_id: examId,
        student_id: 7,
        room_id: 2,
        status: 'VALID',
        entered_at: '2026-11-03T14:00:00Z',
        verification_method: 'QR',
        verified_by: 3,
        verified_by_name: 'Colaborador QA',
        annulment: null,
      },
    }

    const exam = {
      id: examId,
      name: 'Parcial HU28 simulado',
      subject_name: 'Taller de Software',
      exam_date: '2026-11-03',
      start_time: '10:00:00',
      duration_minutes: 90,
      evaluation_type: 'partial',
      status: 'SCHEDULED',
      entry_available: true,
      entry_unavailable_reason: null,
      entry_opens_at: null,
      entry_closes_at: null,
      server_time: '2026-11-03T14:10:00Z',
      room: {
        id: 2,
        code: 'A-1',
        name: 'Aula QA',
      },
    }

    // Simular el listado de control de ingreso.
    cy.intercept('GET', `**/exams/${examId}/entry-control/students*`, {
      statusCode: 200,
      body: {
        exam,
        permissions: { can_annul_entries: true },
        summary: {
          total_students: 1,
          registered: 1,
          pending: 0,
          not_applicable: 0,
        },
        filter_counts: {
          all: 1,
          registered: 1,
          pending: 0,
          incidents: 0,
        },
        data: [{
          ...student,
          student_status: 'ACTIVE',
          enrollment_status: 'ACTIVE',
          eligibility_status: 'ELIGIBLE',
          reason_code: null,
          reason: null,
          observations: null,
          assigned_room_id: 2,
          controlled_room_id: 2,
          room_status: 'MATCH',
          entry_status: 'REGISTERED',
          entry: entry.entry,
          meets_entry_conditions: false,
          blockers: [{
            code: 'ALREADY_REGISTERED',
            message: 'Ingreso existente.',
          }],
        }],
        meta: {
          current_page: 1,
          last_page: 1,
          total: 1,
          per_page: 10,
        },
      },
    }).as('listaIngresos')

    // Simular el historial de ingresos.
    cy.intercept('GET', `**/exams/${examId}/entry-control/entries*`, {
      statusCode: 200,
      body: {
        data: [entry],
        meta: {
          current_page: 1,
          last_page: 1,
          total: 1,
          per_page: 10,
        },
      },
    }).as('historialIngresos')

    // Interceptar cualquier intento de anulacion.
    // Ningun POST de anulacion llegara a Laravel.
    cy.intercept(
      'POST',
      `**/exams/${examId}/entry-control/entries/${entryId}/annulment`,
      {
        statusCode: 418,
        body: { message: 'Bloqueado por Cypress QA' },
      },
    ).as('anularIngreso')

    // Acceder al control de ingreso.
    cy.visit(`/exams/${examId}/entry-control`)

    cy.wait('@listaIngresos')

    // Abrir el historial.
    cy.contains('button', 'Gestionar ingresos').click()

    cy.wait('@historialIngresos')

    cy.get('[role="dialog"] table').should('be.visible')


    // El historial se muestra, pero no permite anular.
    cy.get('[role="dialog"] table')
      .should('be.visible')

    cy.get('[role="dialog"] button[aria-label^="Anular ingreso de"]')
      .should('not.exist')

    // No debe generarse ninguna solicitud de anulacion.
    cy.get('@anularIngreso.all')
      .should('have.length', 0)

    cy.screenshot('HU28-FE-AUTH-001-sin-permiso')
  })
})
