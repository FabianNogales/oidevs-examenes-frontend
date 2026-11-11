describe('EIDA - HU32 - Seguimiento de asistencia', () => {
  it('HU32-FE-SEARCH-001 - Buscar estudiantes por nombre SIS y CI', () => {
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


    // Identidades diferenciadas para las busquedas simuladas.
    page.data[1].identity_number = '00098'
    page.data[2].identity_number = '00097'

    // Responder segun la busqueda solicitada.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/attendance\/students\/?$/,
      },
      (req) => {
        const search = String(req.query.search ?? '')
          .trim()
          .toLowerCase()

        const data = page.data.filter((s) => {
          const searchable = [
            s.first_names,
            s.last_names,
            s.sis_code,
            s.identity_number,
          ].join(' ').toLowerCase()

          return searchable.includes(search)
        })

        req.alias = search
          ? 'busqueda-' + search
          : 'busqueda-todos'

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

    cy.visit('/teacher/exams/4/attendance')
    cy.wait('@busqueda-todos')

    // Verificar el conjunto inicial.
    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('contain.text', 'Bruno Prueba')
      .and('contain.text', 'Carla Prueba')

    // Funcion auxiliar para buscar desde el formulario.
    const buscar = (valor: string) => {
      cy.contains('label', 'Buscar estudiante')
        .find('input[type="search"]')
        .clear()
        .type(valor)

      cy.contains('label', 'Buscar estudiante')
        .closest('form')
        .contains('button', 'Buscar')
        .click()

      cy.wait('@busqueda-' + valor.toLowerCase())

      cy.location('search')
        .should('include', 'search=' + valor)
    }

    // Busqueda por nombre.
    buscar('Ana')

    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('not.contain.text', 'Bruno Prueba')
      .and('not.contain.text', 'Carla Prueba')

    // Busqueda por SIS.
    buscar('00124')

    cy.get('table')
      .should('contain.text', 'Bruno Prueba')
      .and('not.contain.text', 'Ana Prueba')
      .and('not.contain.text', 'Carla Prueba')

    // Busqueda por CI.
    buscar('00097')

    cy.get('table')
      .should('contain.text', 'Carla Prueba')
      .and('not.contain.text', 'Ana Prueba')
      .and('not.contain.text', 'Bruno Prueba')

    // Busqueda sin coincidencias.
    buscar('ZZZ999')

    cy.contains('No hay estudiantes en esta consulta')
      .should('be.visible')

    // Los totales oficiales deben mantenerse.
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

    // Restaurar la busqueda inicial.
    cy.contains('label', 'Buscar estudiante')
      .find('input[type="search"]')
      .clear()

    cy.contains('label', 'Buscar estudiante')
      .closest('form')
      .contains('button', 'Buscar')
      .click()

    cy.wait('@busqueda-todos')

    cy.get('table')
      .should('contain.text', 'Ana Prueba')
      .and('contain.text', 'Bruno Prueba')
      .and('contain.text', 'Carla Prueba')

    cy.screenshot('HU32-FE-SEARCH-001-busqueda-estudiantes')
  })
})
