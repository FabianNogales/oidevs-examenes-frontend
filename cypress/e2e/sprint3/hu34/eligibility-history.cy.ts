describe('EIDA - HU34 - Habilitacion automatica', () => {
  it('HU34-FE-HISTORY-001 - Consultar historial de habilitaciones', () => {
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

    const meta = {
      current_page: 1,
      last_page: 1,
      per_page: 10,
      total: 2,
    }

    const historialAcademico = {
      data: [
        {
          id: 201,
          user_id: 9,
          action: 'ACADEMIC_RECORD_CORRECTED',
          entity_type: 'academic_record',
          entity_id: 81,
          old_values: {
            student_id: 14,
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
          },
          new_values: {
            student_id: 14,
            assessments: {
              FIRST_PARTIAL: {
                was_taken: true,
                score: 30,
              },
              SECOND_PARTIAL: {
                was_taken: true,
                score: 25,
              },
            },
            attended_classes: 6,
            total_classes: 10,
            reason: 'Correccion academica justificada.',
          },
          created_at: '2026-11-03T21:37:33Z',
        },
        {
          id: 202,
          user_id: 9,
          action: 'ACADEMIC_RECORD_IMPORTED',
          entity_type: 'academic_record',
          entity_id: 81,
          old_values: null,
          new_values: {
            student_id: 14,
          },
          created_at: '2026-11-03T20:00:00Z',
        },
      ],
      meta,
    }

    const confirmacion = {
      evaluation_id: 71,
      updated: 1,
      unchanged: 2,
      manual_preserved: 1,
      pending: 1,
    }

    const historialEvaluaciones = {
      data: [
        {
          id: 71,
          preview_id:
            '00000000-0000-4000-a000-000000000071',
          exam_id: 17,
          created_by: 2,
          created_at: '2026-11-03T14:00:00Z',
          confirmed_at: '2026-11-03T14:05:00Z',
          confirmation: confirmacion,
        },
        {
          id: 70,
          preview_id:
            '00000000-0000-4000-a000-000000000070',
          exam_id: 17,
          created_by: 2,
          created_at: '2026-11-02T14:00:00Z',
          confirmed_at: null,
          confirmation: null,
        },
      ],
      meta,
    }

    const detalleHistorico = {
      id: 71,
      preview_id:
        '00000000-0000-4000-a000-000000000071',
      exam_id: 17,
      created_at: '2026-11-03T14:00:00Z',
      expires_at: '2026-11-04T14:00:00Z',
      confirmed_at: '2026-11-03T14:05:00Z',
      configuration: configuracion,
      catalog: null,
      confirmation: confirmacion,
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
              'Decision manual del docente preservada.',
            missing_fields: [],
            eligibility_revision: 5,
            criteria_results: [],
          },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 100,
          total: 1,
        },
      },
      summary: {
        total: 1,
        eligible: 0,
        ineligible: 1,
        pending: 0,
      },
    }

    // Configuracion inicial simulada.
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

    // Examen con oferta academica.
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

    // Historial de registros academicos.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/academic-offerings\/8\/academic-records\/history\/?$/,
      },
      {
        statusCode: 200,
        body: historialAcademico,
      },
    ).as('consultarHistorialAcademico')

    // Historial de evaluaciones.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/17\/eligibility-automation\/evaluations\/?$/,
      },
      {
        statusCode: 200,
        body: historialEvaluaciones,
      },
    ).as('consultarHistorialEvaluaciones')

    // Detalle historico de la evaluacion 71.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/17\/eligibility-automation\/evaluations\/71\/?$/,
      },
      {
        statusCode: 200,
        body: { data: detalleHistorico },
      },
    ).as('consultarDetalleHistorico')

    // Bloquear escrituras accidentales.
    cy.intercept(
      'POST',
      '**/exams/17/eligibility-automation/evaluations/**',
      {
        statusCode: 418,
        body: {
          message: 'Operacion bloqueada por QA.',
        },
      },
    ).as('escrituraBloqueada')

    // Abrir HU34.
    cy.visit(
      '/teacher/exams/17/eligibilities/automatic'
    )

    cy.contains('h2', 'Configuración')
      .should('be.visible')

    // Entrar a Historial.
    cy.get(
      'nav[aria-label="Secciones de habilitación automática"]'
    )
      .contains('button', 'Historial')
      .click()

    cy.contains('h2', 'Historial consultivo')
      .should('be.visible')

    // Comprobar respuestas HTTP.
    cy.get('@consultarHistorialAcademico.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    cy.get('@consultarHistorialEvaluaciones.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    // Verificar las secciones de historial.
    cy.contains(
      'h3',
      'Importaciones y correcciones académicas'
    ).should('be.visible')

    cy.contains(
      'h3',
      'Evaluaciones de habilitación'
    ).should('be.visible')

    // Debe mostrar dos evaluaciones anteriores.
    cy.get('h4')
      .filter(':contains("Evaluación de habilitación")')
      .should('have.length', 2)

    // Una evaluacion confirmada y otra pendiente.
    cy.contains('strong', 'Confirmada')
      .should('be.visible')

    cy.contains('strong', 'Pendiente de confirmación')
      .should('be.visible')

    // Abrir el detalle de la primera evaluacion.
    cy.contains('button', 'Ver resultados')
      .first()
      .click()

    cy.get('@consultarDetalleHistorico.all')
      .should((calls) => {
        expect(
          calls.some((call) =>
            call.response?.statusCode === 200
          )
        ).to.eq(true)
      })

    cy.contains(
      'h3',
      'Detalle histórico de la evaluación'
    ).should('be.visible')

    cy.contains(
      'Resultado de confirmación: actualizadas'
    ).should('be.visible')

    // Verificar que la decision manual se muestre
    // en el detalle historico.
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
      })

    // Consultar historial no debe confirmar
    // ni modificar habilitaciones.
    cy.get('@escrituraBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU34-FE-HISTORY-001-historial-consultivo'
    )
  })
})
