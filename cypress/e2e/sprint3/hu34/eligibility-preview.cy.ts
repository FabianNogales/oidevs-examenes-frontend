describe('EIDA - HU34 - Habilitacion automatica', () => {
  it('HU34-FE-PREVIEW-001 - Preservar decisiones manuales', () => {
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

    const evaluacion = {
      id: 71,
      preview_id: '00000000-0000-4000-a000-000000000071',
      exam_id: 17,
      created_at: '2026-11-10T21:00:00Z',
      expires_at: '2026-11-11T23:59:59Z',
      confirmed_at: null,
      configuration: configuracion,
      catalog: null,
      confirmation: null,
      results: {
        data: [
          {
            student: {
              id: 14,
              display_name: 'Bruno Inscrito Demo',
              sis: 'QA-014',
            },
            computed_status: 'INELIGIBLE',
            current_status: 'ELIGIBLE',
            effective_status: 'ELIGIBLE',
            manual_override_preserved: true,
            will_update: false,
            reason:
              'Se conserva la decision manual vigente del docente.',
            missing_fields: [],
            eligibility_revision: 5,
            criteria_results: [
              {
                code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
                name: obligatorio.name,
                status: 'FAILED',
                actual_value: 20,
                required_value: 25,
                operator: 'GT',
                reason: 'Promedio inferior al requerido.',
              },
            ],
          },
          {
            student: {
              id: 15,
              display_name: 'Estudiante de prueba',
              sis: 'QA-015',
            },
            computed_status: 'PENDING',
            current_status: 'INELIGIBLE',
            effective_status: 'INELIGIBLE',
            manual_override_preserved: false,
            will_update: false,
            reason:
              'Faltan datos academicos para resolver el criterio.',
            missing_fields: [
              'assessments.FIRST_PARTIAL',
              'assessments.SECOND_PARTIAL',
            ],
            eligibility_revision: 2,
            criteria_results: [
              {
                code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
                name: obligatorio.name,
                status: 'PENDING',
                actual_value: null,
                required_value: 25,
                reason: 'Faltan notas de evaluaciones.',
              },
            ],
          },
          {
            student: {
              id: 16,
              display_name: 'Carla Demo',
              sis: 'QA-016',
            },
            computed_status: 'ELIGIBLE',
            current_status: 'INELIGIBLE',
            effective_status: 'ELIGIBLE',
            manual_override_preserved: false,
            will_update: true,
            reason: 'Cumple los criterios configurados.',
            missing_fields: [],
            eligibility_revision: 3,
            criteria_results: [
              {
                code: 'SECOND_INSTANCE_PARTIAL_AVERAGE',
                name: obligatorio.name,
                status: 'PASSED',
                actual_value: 40,
                required_value: 25,
                operator: 'GT',
                reason: 'Promedio suficiente.',
              },
            ],
          },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 100,
          total: 3,
        },
      },
      summary: {
        total: 3,
        eligible: 1,
        ineligible: 1,
        pending: 1,
      },
    }

    // Consultas iniciales de configuracion.
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

    // Detalle del examen.
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

    // Generar una vista previa simulada.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/17\/eligibility-automation\/evaluations\/preview\/?$/,
      },
      {
        statusCode: 200,
        body: { data: evaluacion },
      },
    ).as('generarVistaPrevia')

    // Bloquear cualquier confirmacion real.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/17\/eligibility-automation\/evaluations\/[^/]+\/confirm\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Confirmacion bloqueada por Cypress QA.',
        },
      },
    ).as('confirmacionBloqueada')

    cy.visit(
      '/teacher/exams/17/eligibilities/automatic'
    )

    // Verificar que se cargue la configuracion.
    cy.contains('h2', 'Configuración')
      .should('be.visible')

    cy.get('@consultarConfiguracion.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    // Abrir la seccion de vista previa.
    cy.get(
      'nav[aria-label="Secciones de habilitación automática"]'
    )
      .contains('button', 'Vista previa')
      .click()

    cy.contains('h2', 'Resultado de evaluación')
      .should('be.visible')

    cy.contains(
      'button',
      'Generar vista previa de habilitaciones'
    )
      .should('be.enabled')
      .click()

    // Confirmar la solicitud con la revision vigente.
    cy.get('@generarVistaPrevia.all')
      .should((calls) => {
        const correctas = calls.filter(
          (call) =>
            call.response?.statusCode === 200
        )

        expect(
          correctas.length,
          'Vista previa generada'
        ).to.be.greaterThan(0)

        const payload = correctas[0].request.body

        expect(payload.configuration_revision).to.eq(4)

        expect(payload.catalog_revision)
          .to.eq('catalog-r7')
      })

    // Comprobar el resumen.
    cy.contains('h3', 'Resumen antes de confirmar')
      .should('be.visible')

    cy.contains('dt', 'Se actualizarán')
      .parent()
      .contains('dd', '1')

    cy.contains('dt', 'Sin cambios')
      .parent()
      .contains('dd', '2')

    cy.contains('dt', 'Decisiones manuales preservadas')
      .parent()
      .contains('dd', '1')

    cy.contains('dt', 'Pendientes')
      .parent()
      .contains('dd', '1')

    cy.contains('dt', 'Estudiantes totales')
      .parent()
      .contains('dd', '3')

    // La decision manual de Bruno prevalece.
    cy.contains('article', 'Bruno Inscrito Demo')
      .within(() => {
        cy.contains('Decisión vigente: Habilitado')
          .should('be.visible')

        cy.contains(
          'Se conserva la decisión manual vigente.'
        ).should('be.visible')

        cy.contains('dt', 'Resultado calculado')
          .parent()
          .contains('dd', 'Inhabilitado')

        cy.contains('dt', 'Estado efectivo')
          .parent()
          .contains('dd', 'Habilitado')

        cy.contains('dt', 'Se actualizará')
          .parent()
          .contains('dd', 'No')
      })

    // Los datos insuficientes quedan pendientes.
    cy.contains('article', 'Estudiante de prueba')
      .within(() => {
        cy.contains('dt', 'Resultado calculado')
          .parent()
          .contains('dd', 'Pendiente')

        cy.contains('dt', 'Estado efectivo')
          .parent()
          .contains('dd', 'Inhabilitado')

        cy.contains('Información faltante:')
          .should('be.visible')

        cy.contains('dt', 'Se actualizará')
          .parent()
          .contains('dd', 'No')
      })

    // Carla es candidata a una actualizacion.
    cy.contains('article', 'Carla Demo')
      .within(() => {
        cy.contains('dt', 'Resultado calculado')
          .parent()
          .contains('dd', 'Habilitado')

        cy.contains('dt', 'Se actualizará')
          .parent()
          .contains('dd', 'Sí')
      })

    // La confirmacion debe ser explicita.
    cy.contains('button', 'Confirmar evaluación')
      .should('be.visible')
      .and('be.enabled')

    // No se ha confirmado ninguna evaluacion.
    cy.get('@confirmacionBloqueada.all')
      .should('have.length', 0)

    cy.contains('h3', 'Proceso confirmado')
      .should('not.exist')

    cy.screenshot(
      'HU34-FE-PREVIEW-001-decision-manual-preservada'
    )
  })
})
