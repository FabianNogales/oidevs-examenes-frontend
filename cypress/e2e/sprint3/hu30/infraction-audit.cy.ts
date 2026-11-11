describe('EIDA - HU30 - Gestion de infracciones', () => {
  it('HU30-FE-AUDIT-001 - Conservar historial de cambios', () => {
    const examId = 4

    const exam = {
      id: examId,
      name: 'Primer parcial',
      subject_name: 'Redes',
    }

    const student = {
      id: 7,
      first_names: 'Ana',
      last_names: 'Prueba',
      sis_code: '00123',
      identity_number: '00099',
    }

    const record = {
      id: 9,
      exam_id: examId,
      student,
      type: 'COPYING',
      description: 'Se observó uso de apuntes.',
      observations: 'Revisar con el estudiante.',
      status: 'REPORTED',
      occurred_at: '2026-11-03T14:00:00Z',
      updated_at: '2026-11-03T14:00:00Z',
      reported_by: {
        id: 2,
        name: 'Docente responsable',
      },
      permissions: {
        can_update: true,
        allowed_statuses: ['CONFIRMED', 'RESOLVED'],
      },
    }

    const history = [{
      id: 1,
      action: 'CREATED',
      from_status: null,
      to_status: 'REPORTED',
      reason: null,
      performed_by: record.reported_by,
      performed_at: record.occurred_at,
    }]

    const meta = {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 1,
    }

    // Autorizar el acceso al formulario.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/infractions\/?$/,
      },
      {
        statusCode: 200,
        body: {
          exam,
          permissions: { can_create: true },
          data: [],
          meta: { ...meta, total: 0 },
        },
      },
    ).as('listarInfracciones')

    // Simular la busqueda del estudiante.
    cy.intercept(
      'GET',
      '**/exams/4/entry-control/students*',
      {
        statusCode: 200,
        body: {
          exam: {
            ...exam,
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
          },
          permissions: { can_annul_entries: false },
          summary: {
            total_students: 1,
            registered: 0,
            pending: 1,
            not_applicable: 0,
          },
          filter_counts: {
            all: 1,
            registered: 0,
            pending: 1,
            incidents: 0,
          },
          data: [{
            student_id: student.id,
            first_names: student.first_names,
            last_names: student.last_names,
            sis_code: student.sis_code,
            identity_number: student.identity_number,
            historical_photo_url: null,
            profile_photo_url: null,
            student_status: 'ACTIVE',
            enrollment_status: 'ACTIVE',
            eligibility_status: 'ELIGIBLE',
            reason_code: null,
            reason: null,
            observations: null,
            assigned_room_id: 2,
            controlled_room_id: null,
            room_status: 'MATCH',
            entry_status: 'PENDING',
            entry: null,
            meets_entry_conditions: true,
            blockers: [],
          }],
          meta,
        },
      },
    ).as('buscarEstudiante')

    // Simular el registro: no se realiza ninguna escritura real.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/4\/infractions\/?$/,
      },
      {
        statusCode: 201,
        body: { data: record },
      },
    ).as('registrarInfraccion')

    // Simular la consulta posterior del detalle.
    cy.intercept(
      'GET',
      '**/exams/4/infractions/9',
      {
        statusCode: 200,
        body: {
          exam,
          data: record,
          history,
        },
      },
    ).as('detalleInfraccion')

    // Simular el historial del estudiante.
    cy.intercept(
      'GET',
      '**/exams/4/students/7/infractions*',
      {
        statusCode: 200,
        body: {
          context: {
            exam_id: examId,
            student_id: student.id,
          },
          data: [{
            exam,
            infraction: record,
          }],
          meta,
        },
      },
    ).as('historialEstudiante')

    // Abrir la pagina real de registro.
    cy.visit(`/teacher/exams/${examId}/infractions/create`)

    cy.contains('button', 'Registrar infracción')
      .should('be.visible')

    // Buscar y seleccionar el estudiante.
    cy.contains('label', 'Buscar estudiante por nombre, SIS o CI')
      .parent()
      .find('input[type="search"]')
      .type('00123')

    cy.wait('@buscarEstudiante')

    cy.get('[aria-label="Resultados de estudiantes"]')
      .contains('button', 'Ana Prueba')
      .click()

    cy.contains('Cambiar estudiante')
      .should('be.visible')

    // Completar los datos de la infraccion.
    cy.get('select[required]')
      .select('COPYING')

    cy.get('textarea[required]')
      .type('Se observó uso de apuntes.')

    cy.get('textarea:not([required])')
      .type('Revisar con el estudiante.')

    // Registrar la infraccion simulada.
    cy.contains('button', 'Registrar infracción')
      .click()

    // Verificar el contenido enviado al backend simulado.
    cy.wait('@registrarInfraccion')
      .its('request.body')
      .should('deep.equal', {
        student_id: 7,
        type: 'COPYING',
        description: 'Se observó uso de apuntes.',
        observations: 'Revisar con el estudiante.',
      })

    // Verificar la navegacion al detalle.
    cy.location('pathname')
      .should('eq', '/teacher/exams/4/infractions/9')

    cy.wait('@detalleInfraccion')

    cy.contains(
      'Infracción registrada. Consulta su estado vigente y seguimiento.'
    ).should('be.visible')

    cy.contains('Se observó uso de apuntes.')
      .should('be.visible')

    // Debe realizarse una sola solicitud de creacion.
    cy.get('@registrarInfraccion.all')
      .should('have.length', 1)



    // Simular el nuevo estado y su evento de auditoria.
    const confirmado = {
      exam,
      data: {
        ...record,
        status: 'CONFIRMED',
        updated_at: '2026-11-03T14:10:00Z',
        permissions: {
          can_update: true,
          allowed_statuses: ['RESOLVED'],
        },
      },
      history: [
        ...history,
        {
          id: 2,
          action: 'STATUS_CHANGED',
          from_status: 'REPORTED',
          to_status: 'CONFIRMED',
          reason: 'Se revisó la evidencia.',
          performed_by: record.reported_by,
          performed_at: '2026-11-03T14:10:00Z',
        },
      ],
    }

    // Simular el detalle actualizado despues del cambio.
    cy.intercept(
      'GET',
      '**/exams/4/infractions/9',
      {
        statusCode: 200,
        body: confirmado,
      },
    ).as('detalleActualizado')

    // Simular la actualizacion, sin escritura real.
    cy.intercept(
      'PATCH',
      '**/exams/4/infractions/9/status',
      {
        statusCode: 200,
        body: confirmado,
      },
    ).as('cambiarEstado')

    // Abrir el formulario de cambio de estado.
    cy.contains('button', 'Actualizar estado').click()

    cy.contains('h2', 'Actualizar estado')
      .closest('form')
      .as('formEstado')

    // Completar la operacion autorizada.
    cy.get('@formEstado')
      .find('select')
      .select('CONFIRMED')

    cy.get('@formEstado')
      .find('textarea')
      .type('Se revisó la evidencia.')

    cy.get('@formEstado')
      .find('input[type="checkbox"]')
      .check()

    cy.get('@formEstado')
      .contains('button', 'Confirmar cambio de estado')
      .click()

    // Verificar los datos enviados.
    cy.wait('@cambiarEstado')
      .its('request.body')
      .should('deep.equal', {
        status: 'CONFIRMED',
        reason: 'Se revisó la evidencia.',
        expected_updated_at: record.updated_at,
      })

    // Esperar que el detalle se actualice.
    cy.wait('@detalleActualizado')

    cy.contains(
      'El servidor confirmó el estado: Confirmada.'
    ).should('be.visible')

    // Verificar los dos eventos de auditoria.
    cy.get('[aria-label="Historial de seguimiento"]')
      .should('be.visible')
      .within(() => {
        cy.get('li').should('have.length', 2)

        cy.contains('Registro inicial')
          .should('be.visible')

        cy.contains('Cambio de estado')
          .should('be.visible')

        cy.contains('Reportada → Confirmada')
          .should('be.visible')

        cy.contains('Se revisó la evidencia.')
          .should('be.visible')

        cy.contains('Docente responsable')
          .should('be.visible')
      })

    // No debe duplicarse la actualizacion.
    cy.get('@cambiarEstado.all')
      .should('have.length', 1)

    cy.screenshot('HU30-FE-AUDIT-001-historial-conservado')
  })
})
