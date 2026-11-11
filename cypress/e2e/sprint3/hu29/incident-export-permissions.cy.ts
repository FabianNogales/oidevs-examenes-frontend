import { INCIDENT_TYPE_LABELS } from '../../../../src/features/incidents/utils/incidentValidation'

describe('EIDA - HU29 - Consulta de incidencias', () => {
  it('HU29-FE-AUTH-001 - Ocultar exportaciones sin permiso', () => {
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
      query: { per_page: '10' },
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

    cy.location('pathname')
      .should('eq', `/exams/${examId}/incidents`)

    cy.contains('h1', 'Incidencias e ingresos irregulares')
      .should('be.visible')

    cy.wait('@consultarIncidencias')

    cy.contains('h1', 'Incidencias e ingresos irregulares')
      .should('be.visible')

    cy.get('form[aria-label="Filtros de incidencias"]')
      .should('be.visible')


    // Confirmar que la consulta carga con datos validos.
    cy.get('[aria-label="Resumen de la consulta"]')
      .should('be.visible')
      .and('contain.text', '1 incidencias')

    cy.contains('h2', 'Incidencias registradas')
      .should('be.visible')

    // Sin permiso, no deben mostrarse acciones de exportacion.
    cy.get('[aria-label="Exportación de incidencias"]')
      .should('not.exist')

    cy.contains('button', 'Exportar CSV')
      .should('not.exist')

    cy.contains('button', 'Exportar PDF')
      .should('not.exist')

    cy.screenshot('HU29-FE-AUTH-001-exportacion-restringida')
  })
})
