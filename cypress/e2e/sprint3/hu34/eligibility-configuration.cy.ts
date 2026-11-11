describe('EIDA - HU34 - Habilitacion automatica', () => {
  it('HU34-FE-CONFIG-001 - Consultar criterios configurados', () => {
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

    // Simular las consultas oficiales de HU34.
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

    // Aislar la consulta de detalle del examen,
    // que no forma parte de esta prueba.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/17(?:\/detail)?\/?$/,
      },
      {
        statusCode: 503,
        body: {
          message: 'Detalle excluido de la prueba aislada.',
        },
      },
    ).as('detalleAislado')

    // Bloquear cualquier guardado accidental.
    cy.intercept(
      'PUT',
      '**/exams/17/eligibility-automation/configuration*',
      {
        statusCode: 418,
        body: {
          message: 'Escritura bloqueada por Cypress QA.',
        },
      },
    ).as('guardarBloqueado')

    cy.visit(
      '/teacher/exams/17/eligibilities/automatic'
    )

    // Esperar respuestas HTTP 200 completas.
    cy.get('@consultarOpciones.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          ),
          'Catalogo de criterios recibido'
        ).to.eq(true)
      })

    cy.get('@consultarConfiguracion.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          ),
          'Configuracion vigente recibida'
        ).to.eq(true)
      })

    // Comprobar la pantalla principal.
    cy.contains('h1', 'Habilitación automática')
      .should('be.visible')

    cy.contains('h2', 'Configuración')
      .should('be.visible')

    // Verificar las cuatro secciones.
    cy.get(
      'nav[aria-label="Secciones de habilitación automática"]'
    ).within(() => {
      cy.contains('button', 'Configurar criterios')
        .should('have.attr', 'aria-current', 'step')

      cy.contains('button', 'Datos académicos')
        .should('be.visible')

      cy.contains('button', 'Vista previa')
        .should('be.visible')

      cy.contains('button', 'Historial')
        .should('be.visible')
    })

    // Verificar datos de la configuracion.
    cy.contains('dt', 'Revisión de configuración')
      .parent()
      .should('contain.text', '4')

    cy.contains('dt', 'Combinación')
      .should('be.visible')

    // Criterios institucionales.
    cy.contains('h3', 'Criterios obligatorios')
      .should('be.visible')

    cy.contains(
      'Promedio de parciales para segunda instancia'
    ).should('be.visible')

    cy.contains('Evaluaciones previas rendidas')
      .should('be.visible')

    // Condiciones manuales conservadas.
    cy.get('#manual-review-conditions')
      .should(
        'have.value',
        'Revisar documentación presentada fuera de plazo.'
      )

    cy.contains('button', 'Guardar configuración')
      .should('be.visible')

    // No debe existir ninguna escritura.
    cy.get('@guardarBloqueado.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU34-FE-CONFIG-001-criterios-configurados'
    )
  })
})
