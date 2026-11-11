import { INCIDENT_TYPE_LABELS } from '../../../../src/features/incidents/utils/incidentValidation'

describe('EIDA - HU29 - Consulta de incidencias', () => {
  it('HU29-FE-DATE-001 - Rechazar rango de fechas invalido', () => {
    const examId = 4

    const incident = {
      id: 9,
      exam_id: examId,
      type: 'IDENTIFICATION',
      description: 'Documento ilegible.',
      origin: 'MANUAL',
      status: 'REPORTED',
      student: null,
      reported_by: {
        id: 2,
        name: 'Docente QA',
      },
      created_at: '2026-11-09T14:00:00Z',
    }

    // Generar los contadores utilizando los tipos reales de EIDA.
    const byType = Object.fromEntries(
      Object.keys(INCIDENT_TYPE_LABELS).map((type) => [
        type,
        type === 'IDENTIFICATION' ? 1 : 0,
      ]),
    )

    // Simular una respuesta compatible con HU29.
    cy.intercept({
      method: 'GET',
      url: `**/exams/${examId}/incidents*`,
      headers: { accept: 'application/json' },
    }, {
      statusCode: 200,
      body: {
        exam: {
          id: examId,
          name: 'Examen QA simulado',
          subject_name: 'Materia QA',
        },
        permissions: {
          can_create: true,
          can_export: false,
        },
        data: [incident],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: 1,
        },
        summary: {
          total: 1,
          by_type: byType,
        },
        filters: {
          statuses: [
            {
              value: 'REPORTED',
              label: 'Reportada',
            },
          ],
        },
      },
    }).as('consultarIncidencias')

    // Abrir la consulta avanzada del docente.
    cy.visit(`/exams/${examId}/incidents?from=teacher`)

    cy.wait('@consultarIncidencias')

    cy.contains('h1', 'Incidencias e ingresos irregulares')
      .should('be.visible')

    cy.get('form[aria-label="Filtros de incidencias"]')
      .should('be.visible')


    // Registrar cuantas consultas se realizaron inicialmente.
    let solicitudesIniciales = 0

    cy.get('@consultarIncidencias.all').then((peticiones) => {
      solicitudesIniciales = peticiones.length
    })

    // Introducir un rango de fechas invalido.
    cy.get('form[aria-label="Filtros de incidencias"]')
      .within(() => {
        cy.get('input[name="date_from"]')
          .type('2026-11-10')

        cy.get('input[name="date_to"]')
          .type('2026-11-09')

        cy.contains('button', 'Buscar').click()
      })

    // Comprobar el mensaje de validacion.
    cy.contains(
      'La fecha final debe ser igual o posterior a la inicial.'
    ).should('be.visible')

    // Comprobar la identificacion del campo invalido.
    cy.get('input[name="date_to"]')
      .should('have.attr', 'aria-invalid', 'true')

    // Los filtros no deben aplicarse a la URL.
    cy.location('search')
      .should('eq', '?from=teacher')

    // No debe enviarse una nueva consulta a la API.
    cy.get('@consultarIncidencias.all').should((peticiones) => {
      expect(
        peticiones,
        'No deben generarse nuevas consultas al usar fechas invalidas'
      ).to.have.length(solicitudesIniciales)
    })

    cy.screenshot('HU29-FE-DATE-001-rango-invalido')
  })
})
