describe('EIDA - HU30 - Gestion de infracciones', () => {
  it('HU30-FE-AUTH-001 - Restringir registro sin autorizacion', () => {
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


    // El usuario no debe tener acceso al formulario.
    cy.contains(
      'Solo el docente responsable autorizado puede registrar infracciones de este examen.'
    ).should('be.visible')

    // No debe existir el boton de registro.
    cy.contains('button', 'Registrar infracción')
      .should('not.exist')

    // No deben aparecer los campos de registro.
    cy.contains('label', 'Tipo de infracción *')
      .should('not.exist')

    cy.contains('label', 'Descripción de los hechos *')
      .should('not.exist')

    // No debe enviarse ninguna solicitud POST.
    cy.get('@registrarInfraccion.all')
      .should('have.length', 0)

    cy.screenshot('HU30-FE-AUTH-001-registro-restringido')
  })
})
