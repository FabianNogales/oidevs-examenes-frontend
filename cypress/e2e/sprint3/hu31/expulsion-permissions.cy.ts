describe('EIDA - HU31 - Gestion de expulsiones', () => {
  it('HU31-FE-AUTH-001 - Restringir expulsiones sin autorizacion', () => {
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
            can_create: false,
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


    // El usuario debe visualizar el acceso restringido.
    cy.contains(
      'Este examen no permite registrar expulsiones en este momento.'
    ).should('be.visible')

    cy.contains(
      'La colaboración temporal no otorga este permiso.'
    ).should('be.visible')

    // El formulario no debe estar disponible.
    cy.contains('button', 'Confirmar expulsión')
      .should('not.exist')

    cy.contains('label', 'Motivo de expulsión *')
      .should('not.exist')

    cy.get('textarea[required]')
      .should('not.exist')

    // No debe enviarse ninguna solicitud de registro.
    cy.get('@registrarExpulsion.all')
      .should('have.length', 0)

    // La pagina mantiene su ruta original.
    cy.location('pathname')
      .should('eq', '/teacher/exams/4/expulsions/create')

    cy.screenshot('HU31-FE-AUTH-001-expulsion-restringida')
  })
})
