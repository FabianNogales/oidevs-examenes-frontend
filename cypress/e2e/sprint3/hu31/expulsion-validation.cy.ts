describe('EIDA - HU31 - Gestion de expulsiones', () => {
  it('HU31-FE-VAL-001 - Impedir expulsion con campos obligatorios vacios', () => {
    const examId = 4

    // Simular autorizacion para acceder al formulario.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/4\/expulsions\/?$/,
      },
      {
        statusCode: 200,
        body: {
          exam: {
            id: examId,
            name: 'Parcial HU31 simulado',
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
    ).as('listarExpulsiones')

    // Impedir cualquier registro real.
    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/4\/expulsions\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Solicitud bloqueada por Cypress QA.',
        },
      },
    ).as('registrarExpulsion')

    // Abrir la pagina de registro.
    cy.visit(`/teacher/exams/${examId}/expulsions/create`)

    cy.wait('@listarExpulsiones')

    // Comprobar que el formulario esta disponible.
    cy.contains('button', 'Confirmar expulsión')
      .should('be.visible')
      .closest('form')
      .as('formExpulsion')

    // Comprobar los datos inicialmente vacios.
    cy.get('@formExpulsion')
      .find('textarea[required]')
      .should('have.value', '')

    cy.get('@formExpulsion')
      .find('input[type="checkbox"]')
      .should('not.be.checked')

    // Intentar confirmar sin seleccionar estudiante,
    // sin motivo y sin marcar la confirmacion.
    cy.get('@formExpulsion')
      .contains('button', 'Confirmar expulsión')
      .click()

    // Verificar los mensajes de validacion.
    cy.contains('Selecciona un estudiante del examen.')
      .should('be.visible')

    cy.contains('El motivo de expulsión es obligatorio.')
      .should('be.visible')

    cy.contains('Confirma la decisión de expulsión.')
      .should('be.visible')

    // Verificar indicadores de campos invalidos.
    cy.get('@formExpulsion')
      .find('fieldset[aria-invalid="true"]')
      .should('exist')

    cy.get('@formExpulsion')
      .find('textarea[required]')
      .should('have.attr', 'aria-invalid', 'true')

    cy.get('@formExpulsion')
      .find('input[type="checkbox"]')
      .should('have.attr', 'aria-invalid', 'true')

    // No debe enviarse ninguna solicitud POST.
    cy.get('@registrarExpulsion.all')
      .should('have.length', 0)

    // Debe permanecer en el formulario.
    cy.location('pathname')
      .should(
        'eq',
        '/teacher/exams/4/expulsions/create'
      )

    cy.screenshot('HU31-FE-VAL-001-campos-obligatorios')
  })
})
