describe('EIDA - HU28 - Validacion de anulaciones', () => {
  it('HU28-FE-SAVE-001 - Confirmar anulacion y actualizar historial', () => {
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
      permissions: { can_annul: true },
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

    let actualizado = false

    const registroAnulado = {
      ...entry,
      permissions: { can_annul: false },
      entry: {
        ...entry.entry,
        status: 'ANNULLED',
        annulment: {
          reason: 'Ingreso registrado por equivocacion.',
          annulled_at: '2026-11-03T14:10:00Z',
          annulled_by: {
            id: 2,
            name: 'Docente responsable',
          },
        },
      },
    }


    // Construir la respuesta en cada consulta del historial.
    cy.intercept(
      'GET',
      `**/exams/${examId}/entry-control/entries*`,
      (req) => {
        req.reply({
          statusCode: 200,
          body: {
            data: [actualizado ? registroAnulado : entry],
            meta: {
              current_page: 1,
              last_page: 1,
              total: 1,
              per_page: 10,
            },
          },
        })
      },
    ).as('historialIngresos')

    // Simular confirmacion del backend, sin escritura real.
    cy.intercept(
      'POST',
      `**/exams/${examId}/entry-control/entries/${entryId}/annulment`,
      (req) => {
        actualizado = true
        req.reply({
          statusCode: 200,
          body: { data: registroAnulado },
        })
      },
    ).as('anularIngreso')

    cy.visit(`/exams/${examId}/entry-control`)
    cy.wait('@listaIngresos')

    cy.contains('button', 'Gestionar ingresos').click()
    cy.wait('@historialIngresos')

    cy.get('[role="dialog"] button[aria-label^="Anular ingreso de"]')
      .filter(':visible')
      .first()
      .click()

    cy.contains('h3', `Anular ingreso #${entryId}`)
      .should('be.visible')

    // Completar motivo y confirmacion.
    cy.get('[role="dialog"] textarea[required]')
      .type('Ingreso registrado por equivocacion.')

    cy.get('[role="dialog"] input[type="checkbox"]')
      .check()

    cy.contains('button', 'Confirmar anulación').click()

    // Verificar el motivo enviado.
    cy.wait('@anularIngreso')
      .its('request.body')
      .should('deep.include', {
        reason: 'Ingreso registrado por equivocacion.',
      })

    // Esperar la consulta posterior y verificar su estado.
    cy.wait('@historialIngresos')
      .its('response.body.data.0.entry.status')
      .should('eq', 'ANNULLED')

    // Debe volver al historial con la confirmacion.
    cy.get('[role="dialog"] table')
      .should('be.visible')

    cy.contains('Ingreso #9 anulado.')
      .should('be.visible')

    cy.get('[role="dialog"]')
      .should('contain.text', 'Anulado')

    // No debe poder anular nuevamente el mismo ingreso.
    cy.get('[role="dialog"] button[aria-label^="Anular ingreso de"]')
      .should('not.exist')

    cy.get('@anularIngreso.all')
      .should('have.length', 1)

    cy.screenshot('HU28-FE-SAVE-001-anulacion-simulada')
  })
})
