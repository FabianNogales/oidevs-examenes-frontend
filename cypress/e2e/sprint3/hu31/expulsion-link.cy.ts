
describe('EIDA - HU31 - Gestion de expulsiones', () => {
  it('HU31-FE-LINK-001 - Vincular infraccion a expulsion', () => {
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

    const meta = {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 1,
    }

    const related = {
      id: 9,
      exam_id: 4,
      student_id: 7,
      type: 'COPYING',
      status: 'REPORTED',
      description: 'Se observó uso de apuntes.',
    }

    const record = {
      id: 9,
      exam_id: 4,
      student,
      reason: 'Incumplimiento de las normas del examen.',
      expelled_at: '2026-11-03T14:10:00Z',
      expelled_by: {
        id: 2,
        name: 'Docente responsable',
      },
      status: 'EXPELLED',
      infraction: related,
    }

    // Permitir el formulario con autorizacion simulada.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/expulsions\/?$/,
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
    ).as('listarExpulsiones')

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


    // No hay infracciones relacionadas disponibles.
    cy.intercept(
      'GET',
      '**/exams/4/expulsions/eligible-infractions*',
      {
        statusCode: 200,
        body: {
          context: { exam_id: 4, student_id: 7 },
          data: [related],
          meta,
        },
      },
    ).as('infraccionesElegibles')

    // Simular el registro: ninguna escritura real.
    cy.intercept(
      'POST',
      '**/exams/4/expulsions',
      {
        statusCode: 201,
        body: { data: record },
      },
    ).as('registrarExpulsion')

    // Simular el detalle posterior.
    cy.intercept(
      'GET',
      '**/exams/4/expulsions/9',
      {
        statusCode: 200,
        body: { exam, data: record },
      },
    ).as('detalleExpulsion')

    // Simular el historial del estudiante.
    cy.intercept(
      'GET',
      '**/exams/4/students/7/expulsions*',
      {
        statusCode: 200,
        body: {
          context: { exam_id: 4, student_id: 7 },
          data: [{ exam, expulsion: record }],
          meta,
        },
      },
    ).as('historialExpulsiones')

    cy.visit('/teacher/exams/4/expulsions/create')
    cy.wait('@listarExpulsiones')

    cy.contains('button', 'Confirmar expulsión')
      .should('be.visible')

    // Buscar y seleccionar un estudiante del examen.
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

    // Esperar las infracciones del estudiante.
    cy.wait('@infraccionesElegibles')

    // Seleccionar la infraccion #9.
    cy.contains('button', 'Vincular #9')
      .should('be.visible')
      .click()

    // Verificar que quedo asociada.
    cy.contains('Quitar asociación')
      .should('be.visible')

    cy.contains('Sin infracción vinculada.')
      .should('not.exist')

    // Completar el motivo y confirmar la decision.
    cy.get('textarea[required]')
      .type('Incumplimiento de las normas del examen.')

    cy.get('input[type="checkbox"]')
      .check()

    cy.contains('button', 'Confirmar expulsión')
      .click()

    // Comprobar el contrato real del POST.
    cy.wait('@registrarExpulsion')
      .its('request.body')
      .should('deep.equal', {
        student_id: 7,
        reason: 'Incumplimiento de las normas del examen.',
        infraction_id: 9,
      })

    // Debe navegar al detalle creado.
    cy.location('pathname')
      .should('eq', '/teacher/exams/4/expulsions/9')

    cy.wait('@detalleExpulsion')

    cy.contains('a', 'Infracción #9 · Copia')
      .should('be.visible')
      .should(
        'have.attr',
        'href',
        '/teacher/exams/4/infractions/9'
      )

    cy.contains('Estado en este examen: Expulsado')
      .should('be.visible')

    // No debe duplicarse el registro.
    cy.get('@registrarExpulsion.all')
      .should('have.length', 1)

    cy.screenshot('HU31-FE-LINK-001-infraccion-vinculada')
  })
})
