describe('EIDA - HU30 - Gestion de infracciones', () => {
  it('HU30-FE-VAL-001 - Impedir registro con campos obligatorios vacios', () => {
    const examId = 4

    // Simular el listado utilizado para verificar permisos.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/infractions\/?$/,
      },
      {
        statusCode: 200,
        body: {
          exam: {
            id: examId,
            name: 'Parcial HU30 simulado',
            subject_name: 'Taller de Software',
          },
          permissions: {
            can_create: true,
          },
          data: [],
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
          },
        },
      },
    ).as('listarInfracciones')

    // Bloquear cualquier escritura real.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/4\/infractions\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Solicitud bloqueada por Cypress QA.',
        },
      },
    ).as('registrarInfraccion')

    // Abrir la pagina real de registro.
    cy.visit(`/teacher/exams/${examId}/infractions/create`)

    // Verificar que aparece el formulario autorizado.
    cy.contains('button', 'Registrar infracción')
      .should('be.visible')

    // Comprobar los campos inicialmente vacios.
    cy.get('select[required]')
      .should('have.value', '')

    cy.get('textarea[required]')
      .should('have.value', '')

    // Intentar registrar sin completar los campos.
    cy.contains('button', 'Registrar infracción')
      .click()

    // Comprobar las tres validaciones.
    cy.contains('Selecciona un estudiante del examen.')
      .should('be.visible')

    cy.contains('Selecciona un tipo de infracción.')
      .should('be.visible')

    cy.contains('Describe lo ocurrido.')
      .should('be.visible')

    // Comprobar los indicadores de campos invalidos.
    cy.get('fieldset[aria-invalid="true"]')
      .should('exist')

    cy.get('select[required]')
      .should('have.attr', 'aria-invalid', 'true')

    cy.get('textarea[required]')
      .should('have.attr', 'aria-invalid', 'true')

    // No debe existir ninguna solicitud de registro.
    cy.get('@registrarInfraccion.all')
      .should('have.length', 0)

    cy.screenshot('HU30-FE-VAL-001-campos-obligatorios')
  })
})
