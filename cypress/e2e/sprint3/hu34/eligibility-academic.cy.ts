describe('EIDA - HU34 - Habilitacion automatica', () => {
  it('HU34-FE-ACADEMIC-001 - Consultar y corregir datos academicos', () => {
    const examId = 17

    const assessments = [
      { key: 'FIRST_PARTIAL', label: 'Primer parcial' },
      { key: 'SECOND_PARTIAL', label: 'Segundo parcial' },
    ]

    const obligatorio = {
      code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
      name: 'Promedio de parciales para segunda instancia',
      description: 'Requisito institucional para segunda instancia.',
      status: 'ACTIVE',
      revision: 6,
      parameters: [],
      fixed_parameters: {
        assessment_keys: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
        operator: 'GT',
        threshold: 25,
      },
      required: true,
      locked: true,
    }

    const opcional = {
      code: 'PREVIOUS_ASSESSMENTS_TAKEN',
      name: 'Evaluaciones previas rendidas',
      description: 'Verifica evaluaciones previas seleccionadas.',
      status: 'ACTIVE',
      revision: 3,
      parameters: [
        {
          key: 'assessment_keys',
          required: true,
          type: 'array',
          options: ['FIRST_PARTIAL', 'SECOND_PARTIAL'],
          min_items: 1,
        },
      ],
      required: false,
      locked: false,
    }

    const criterioObligatorio = {
      code: obligatorio.code,
      name: obligatorio.name,
      parameters: obligatorio.fixed_parameters,
      required: true,
      locked: true,
    }

    const criterioOpcional = {
      code: opcional.code,
      name: opcional.name,
      parameters: {
        assessment_keys: ['FIRST_PARTIAL'],
      },
      required: false,
      locked: false,
    }

    const configuracion = {
      exam_id: examId,
      evaluation_type: 'makeup',
      configured_evaluation_type: 'makeup',
      revision: 4,
      catalog_revision: 'catalog-r7',
      combination: 'ALL',
      manual_review_conditions:
        'Revisar documentación presentada fuera de plazo.',
      selected_criteria: [criterioOpcional],
      mandatory_criteria: [criterioObligatorio],
      inactive_criteria: [],
      criteria: [criterioObligatorio, criterioOpcional],
    }

    const opciones = {
      ...configuracion,
      criteria: [obligatorio, opcional],
      assessments,
    }


    const registro = {
      id: 81,
      course_offering_id: 8,
      student_id: 14,
      sis_code: 'QA-081',
      first_names: 'Estudiante',
      last_names: 'de prueba',
      assessments: {
        FIRST_PARTIAL: {
          was_taken: true,
          score: 25,
        },
        SECOND_PARTIAL: {
          was_taken: true,
          score: 25,
        },
      },
      attended_classes: 5,
      total_classes: 10,
      revision: 7,
    }

    const esquema = {
      columns: [
        'sis',
        'assessment_key',
        'was_taken',
        'score',
        'attended_classes',
        'total_classes',
      ],
      assessment_keys: [
        'FIRST_PARTIAL',
        'SECOND_PARTIAL',
      ],
      encoding: 'UTF-8',
      delimiter: ',',
      max_rows: 1000,
      max_file_kb: 5120,
      score_min: 0,
      score_max: 100,
      score_decimal_places: 2,
      was_taken_values: ['true', 'false'],
    }

    const examen = {
      id: 17,
      name: 'Examen de prueba HU34',
      subject_code: 'RED-01',
      subject_name: 'Redes de Computadoras',
      exam_date: '2026-11-03',
      start_time: '14:00:00',
      duration_minutes: 120,
      status: 'IN_PROGRESS',
      course_offering_id: 8,
      rules: null,
      updated_at: '2026-11-03T14:00:00Z',
    }

    let registroVigente = registro

    // Configuracion institucional simulada.
    cy.intercept(
      'GET',
      '**/exams/17/eligibility-automation/options*',
      {
        statusCode: 200,
        body: { data: opciones },
      },
    ).as('consultarOpciones')

    cy.intercept(
      'GET',
      '**/exams/17/eligibility-automation/configuration*',
      {
        statusCode: 200,
        body: { data: configuracion },
      },
    ).as('consultarConfiguracion')

    // Detalle autorizado del examen.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/teacher\/exams\/17\/?$/,
      },
      {
        statusCode: 200,
        body: { data: examen },
      },
    ).as('consultarExamen')

    // Esquema de datos academicos.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/academic-offerings\/8\/academic-records\/import-schema\/?$/,
      },
      {
        statusCode: 200,
        body: { data: esquema },
      },
    ).as('consultarEsquema')

    // Consulta de registros academicos.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/academic-offerings\/8\/academic-records\/?$/,
      },
      (req) => {
        req.reply({
          statusCode: 200,
          body: {
            data: [registroVigente],
            meta: {
              current_page: 1,
              last_page: 1,
              per_page: 10,
              total: 1,
            },
          },
        })
      },
    ).as('consultarRegistros')

    // Simular la correccion academica.
    cy.intercept(
      {
        method: 'PATCH',
        pathname: /\/academic-offerings\/8\/academic-records\/81\/?$/,
      },
      (req) => {
        registroVigente = {
          ...registroVigente,
          ...req.body,
          revision: 8,
        }

        req.reply({
          statusCode: 200,
          body: {
            data: registroVigente,
          },
        })
      },
    ).as('guardarCorreccion')

    // Impedir evaluaciones durante la correccion.
    cy.intercept(
      'POST',
      '**/exams/17/eligibility-automation/evaluations/**',
      {
        statusCode: 418,
        body: {
          message: 'Evaluacion bloqueada por QA.',
        },
      },
    ).as('evaluacionBloqueada')

    // Abrir HU34.
    cy.visit(
      '/teacher/exams/17/eligibilities/automatic'
    )

    cy.contains('h1', 'Habilitación automática')
      .should('be.visible')

    cy.contains('h2', 'Configuración')
      .should('be.visible')

    // Entrar a los datos academicos.
    cy.get(
      'nav[aria-label="Secciones de habilitación automática"]'
    )
      .contains('button', 'Datos académicos')
      .click()

    cy.contains('h2', 'Datos académicos')
      .should('be.visible')

    // Comprobar las consultas simuladas.
    cy.get('@consultarEsquema.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    cy.get('@consultarRegistros.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    // Verificar la tabla academica.
    cy.contains('h3', 'Registros académicos')
      .should('be.visible')

    cy.contains('tr', 'QA-081')
      .should('be.visible')
      .within(() => {
        cy.contains('Estudiante de prueba')
          .should('be.visible')

        cy.contains('5 / 10')
          .should('be.visible')

        cy.contains('50')
          .should('be.visible')
      })

    // Abrir la correccion del estudiante.
    cy.contains('tr', 'QA-081')
      .contains('button', 'Corregir')
      .click()

    cy.contains('h3', 'Corrección explícita del registro')
      .should('be.visible')

    // Sin motivo no puede guardarse.
    cy.contains('button', 'Guardar corrección')
      .should('be.disabled')

    // Corregir la nota del primer parcial.
    cy.contains('fieldset', 'Primer parcial')
      .find('input[type="number"]')
      .clear()
      .type('30')

    // Actualizar las clases asistidas.
    cy.contains('label', 'Clases asistidas')
      .find('input')
      .clear()
      .type('6')

    // Registrar el motivo obligatorio.
    cy.contains('label', 'Motivo obligatorio')
      .find('textarea')
      .type('Corrección académica de prueba QA HU34.')

    cy.contains('button', 'Guardar corrección')
      .should('be.enabled')
      .click()

    // Comprobar la solicitud PATCH y sus datos.
    cy.get('@guardarCorreccion.all')
      .should((calls) => {
        const correctas = calls.filter(
          (call) =>
            call.response?.statusCode === 200
        )

        expect(
          correctas.length,
          'Correccion academica registrada'
        ).to.eq(1)

        const payload = correctas[0].request.body

        expect(payload.revision).to.eq(7)

        expect(payload.reason)
          .to.eq(
            'Corrección académica de prueba QA HU34.'
          )

        expect(
          payload.assessments.FIRST_PARTIAL.score
        ).to.eq(30)

        expect(
          payload.assessments.SECOND_PARTIAL.score
        ).to.eq(25)

        expect(payload.attended_classes).to.eq(6)
        expect(payload.total_classes).to.eq(10)
      })

    // Verificar que la tabla refleje la correccion.
    cy.contains('tr', 'QA-081')
      .should('be.visible')
      .within(() => {
        cy.get('td').eq(2)
          .should('contain.text', '30')

        cy.get('td').eq(3)
          .should('contain.text', '25')

        cy.get('td').eq(4)
          .should('contain.text', '6 / 10')

        cy.get('td').eq(7)
          .should('contain.text', '8')
      })

    // La correccion no debe aplicar
    // automaticamente una habilitacion.
    cy.get('@evaluacionBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU34-FE-ACADEMIC-001-correccion-academica'
    )
  })
})
