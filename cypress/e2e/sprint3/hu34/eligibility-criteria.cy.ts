describe('EIDA - HU34 - Habilitacion automatica', () => {
  it('HU34-FE-CRITERIA-001 - Validar y guardar criterios', () => {
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


    // Configuracion devuelta despues del guardado.
    const criterioActualizado = {
      ...criterioOpcional,
      parameters: {
        assessment_keys: ['SECOND_PARTIAL'],
      },
    }

    const configuracionActualizada = {
      ...configuracion,
      revision: 5,
      selected_criteria: [criterioActualizado],
      criteria: [
        criterioObligatorio,
        criterioActualizado,
      ],
    }

    // Consultas iniciales simuladas.
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

    // Aislar la consulta del detalle del examen.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/17(?:\/detail)?\/?$/,
      },
      {
        statusCode: 503,
        body: {
          message: 'Detalle excluido de esta prueba.',
        },
      },
    ).as('detalleAislado')

    // Simular exclusivamente el guardado.
    cy.intercept(
      'PUT',
      '**/exams/17/eligibility-automation/configuration*',
      {
        statusCode: 200,
        body: {
          data: configuracionActualizada,
        },
      },
    ).as('guardarConfiguracion')

    // Bloquear una evaluacion accidental.
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

    cy.visit(
      '/teacher/exams/17/eligibilities/automatic'
    )

    cy.contains('h2', 'Configuración')
      .should('be.visible')

    // Verificar la configuracion inicial.
    cy.contains('dt', 'Revisión de configuración')
      .parent()
      .should('contain.text', '4')

    // El criterio institucional obligatorio
    // no debe poder desactivarse.
    cy.contains('article', obligatorio.name)
      .find('label')
      .first()
      .find('input[type="checkbox"]')
      .should('be.checked')
      .and('be.disabled')

    // Localizar el criterio opcional.
    cy.contains('article', opcional.name)
      .find('label')
      .first()
      .find('input[type="checkbox"]')
      .should('be.checked')
      .and('be.enabled')

    // Primer parcial esta seleccionado inicialmente.
    cy.contains('article', opcional.name)
      .find('fieldset input[type="checkbox"]')
      .first()
      .should('be.checked')

    // Desmarcar el unico parametro seleccionado.
    cy.contains('article', opcional.name)
      .find('fieldset input[type="checkbox"]')
      .first()
      .uncheck()

    // Sin evaluaciones seleccionadas, no se
    // debe permitir guardar la configuracion.
    cy.contains('button', 'Guardar configuración')
      .should('be.disabled')

    cy.get('@guardarConfiguracion.all')
      .should('have.length', 0)

    // Seleccionar Segundo parcial.
    cy.contains('article', opcional.name)
      .find('fieldset input[type="checkbox"]')
      .eq(1)
      .check()

    // Comprobar los nuevos parametros.
    cy.contains('article', opcional.name)
      .find('fieldset input[type="checkbox"]')
      .first()
      .should('not.be.checked')

    cy.contains('article', opcional.name)
      .find('fieldset input[type="checkbox"]')
      .eq(1)
      .should('be.checked')

    // Ahora la configuracion es valida.
    cy.contains('button', 'Guardar configuración')
      .should('be.enabled')
      .click()

    // Comprobar que la solicitud PUT contiene
    // exactamente los parametros esperados.
    cy.get('@guardarConfiguracion.all')
      .should((calls) => {
        const completadas = calls.filter(
          (call) =>
            call.response?.statusCode === 200
        )

        expect(
          completadas.length,
          'Guardado simulado confirmado'
        ).to.eq(1)

        const payload = completadas[0].request.body

        expect(payload.revision)
          .to.eq(4)

        expect(payload.catalog_revision)
          .to.eq('catalog-r7')

        expect(payload.manual_review_conditions)
          .to.eq(
            'Revisar documentación presentada fuera de plazo.'
          )

        // El criterio obligatorio no debe
        // enviarse como criterio opcional.
        expect(payload.criteria).to.deep.equal([
          {
            code: 'PREVIOUS_ASSESSMENTS_TAKEN',
            parameters: {
              assessment_keys: ['SECOND_PARTIAL'],
            },
          },
        ])
      })

    // Verificar que EIDA muestre la nueva revision.
    cy.contains('dt', 'Revisión de configuración')
      .parent()
      .should('contain.text', '5')

    cy.contains(
      'Configuración guardada. La revisión vigente es'
    ).should('be.visible')

    // La seleccion debe conservarse despues
    // de recibir la respuesta del servidor.
    cy.contains('article', opcional.name)
      .find('fieldset input[type="checkbox"]')
      .eq(1)
      .should('be.checked')

    // Guardar criterios no debe ejecutar
    // automaticamente una evaluacion.
    cy.get('@evaluacionBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU34-FE-CRITERIA-001-criterios-guardados'
    )
  })
})
