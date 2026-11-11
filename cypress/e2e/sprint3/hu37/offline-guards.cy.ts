describe('EIDA - HU37 - Proteccion offline', () => {

  it('HU37-FE-CONTROL-001 - Bloquear control local sin identidad autorizada', () => {

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
    ).as('paqueteBloqueado')

    cy.visit('/exams/42/offline?view=control')

    cy.contains(
      'h1',
      'Verifica tu cuenta para acceder'
    ).should('be.visible')

    cy.contains(
      '[role="alert"]',
      'La autenticación simulada no habilita acceso local.'
    ).should('be.visible')

    // No debe mostrar herramientas de captura.
    cy.contains('button', 'Verificación manual')
      .should('not.exist')

    cy.contains('button', 'Captura QR')
      .should('not.exist')

    // No debe consultar paquetes protegidos.
    cy.get('@paqueteBloqueado.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU37-FE-CONTROL-001-control-protegido'
    )
  })

  it('HU37-FE-SYNC-001 - Bloquear sincronizacion sin identidad autorizada', () => {

    cy.intercept(
      {
        method: 'POST',
        pathname: /\/exams\/42\/offline\/sync\/?$/,
      },
      {
        statusCode: 418,
        body: {
          message: 'Sincronizacion bloqueada por QA.',
        },
      },
    ).as('sincronizacionBloqueada')

    cy.visit('/exams/42/offline?view=sync')

    cy.contains(
      'h1',
      'Verifica tu cuenta para acceder'
    ).should('be.visible')

    cy.contains(
      '[role="alert"]',
      'La autenticación simulada no habilita acceso local.'
    ).should('be.visible')

    // No debe habilitar el envio de eventos.
    cy.contains('button', 'Sincronizar ahora')
      .should('not.exist')

    // Ningun evento debe enviarse al servidor.
    cy.get('@sincronizacionBloqueada.all')
      .should('have.length', 0)

    cy.screenshot(
      'HU37-FE-SYNC-001-sincronizacion-protegida'
    )
  })
})
