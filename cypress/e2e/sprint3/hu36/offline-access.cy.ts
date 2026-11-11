describe('EIDA - HU36 - Preparacion offline', () => {
  it('HU36-FE-ACCESS-001 - Bloquear acceso con autenticacion simulada', () => {

    // Registrar cualquier intento de descargar
    // un paquete desde la API.
    cy.intercept(
      {
        method: 'GET',
        pathname: /\/exams\/42\/offline\/package\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Descarga bloqueada por QA.',
        },
      },
    ).as('descargaBloqueada')

    // Abrir la ruta real de preparacion.
    cy.visit('/exams/42/offline?view=prepare')

    // La identidad mock no debe habilitar
    // el acceso a las listas locales.
    cy.contains(
      'h1',
      'Verifica tu cuenta para acceder'
    ).should('be.visible')

    // Validar el mensaje de seguridad.
    cy.contains(
      '[role="alert"]',
      'La autenticación simulada no habilita acceso local.'
    ).should('be.visible')

    // Debe explicar que los datos pertenecen
    // al responsable que descargo la lista.
    cy.contains(
      'Los datos locales pertenecen al responsable'
    ).should('be.visible')

    // Debe ofrecer autenticacion real.
    cy.contains('a', 'Iniciar sesión')
      .should('be.visible')

    // No debe mostrar las herramientas de descarga.
    cy.contains(
      'button',
      'Descargar lista para uso sin conexión'
    ).should('not.exist')

    cy.contains(
      'button',
      'Descargar una copia actualizada'
    ).should('not.exist')

    // No debe presentar el paquete como preparado.
    cy.contains(
      'Lista disponible sin conexión'
    ).should('not.exist')

    // No debe enviar ninguna solicitud de paquete.
    cy.get('@descargaBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU36-FE-ACCESS-001-acceso-protegido'
    )
  })
})
