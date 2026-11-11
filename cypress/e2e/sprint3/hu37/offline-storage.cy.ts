describe('EIDA - HU37 - Eventos offline', () => {
  it('HU37-FE-STORE-001 - Conservar eventos y resultados locales', () => {

    // Abrir exclusivamente el entorno de prueba
    // de almacenamiento incluido en EIDA.
    cy.visit(
      '/src/features/offline-entry/tests/storage.browser.html'
    )

    cy.contains(
      'h1',
      'Prueba manual de IndexedDB real'
    ).should('be.visible')

    // Crear el paquete y eventos ficticios.
    cy.get('#create')
      .should('be.enabled')
      .click()

    // Comprobar persistencia inicial.
    cy.get('#output')
      .should(
        'contain',
        'El paquete fue persistido antes de informar éxito'
      )

    // No permitir dos eventos concurrentes
    // para el mismo estudiante.
    cy.get('#output')
      .should(
        'contain',
        'Dos capturas concurrentes generan un solo evento por estudiante'
      )

    cy.get('#output')
      .should(
        'contain',
        'Todos los eventos se leen desde IndexedDB'
      )

    // Verificar proteccion entre identidades.
    cy.get('#output')
      .should(
        'contain',
        'Otra identidad no puede leer los datos de prueba'
      )

    // Esperar la finalizacion de las transacciones.
    cy.get('#output')
      .should('contain', 'Ahora recarga esta página')

    cy.get('#output')
      .should('not.contain', 'ERROR:')

    // Recargar completamente la pagina.
    cy.reload()

    // Comprobar persistencia y ejecutar
    // la limpieza controlada.
    cy.get('#verify')
      .should('be.enabled')
      .click()

    cy.get('#output')
      .should(
        'contain',
        'El paquete sobrevive a la recarga de la aplicación'
      )

    cy.get('#output')
      .should(
        'contain',
        'Los eventos sobreviven a la recarga'
      )

    cy.get('#output')
      .should(
        'contain',
        'Conflictos y rechazos siguen disponibles'
      )

    cy.get('#output')
      .should(
        'contain',
        'Se eliminaron únicamente los datos reconocidos de esta cuenta y examen'
      )

    cy.get('#output')
      .should('not.contain', 'ERROR:')

    cy.screenshot(
      'HU37-FE-STORE-001-eventos-persistidos'
    )
  })
})
