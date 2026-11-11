import { INCIDENT_TYPE_LABELS } from '../../../../src/features/incidents/utils/incidentValidation'

describe('EIDA - HU29 - Consulta de incidencias', () => {
  it('HU29-FE-FILTER-001 - Aplicar filtros de consulta', () => {
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

    // Aplicar los filtros desde el formulario real.
    cy.get('form[aria-label="Filtros de incidencias"]')
      .within(() => {
        cy.get('input[name="search"]')
          .type('9')

        cy.get('select[name="type"]')
          .select('IDENTIFICATION')

        cy.get('select[name="status"]')
          .select('REPORTED')

        cy.get('input[name="date_from"]')
          .type('2026-11-09')

        cy.get('input[name="date_to"]')
          .type('2026-11-09')

        cy.contains('button', 'Buscar').click()
      })


    // Confirmar que el formulario actualiza la URL.
    cy.location('search').should('include', 'search=9')

    // Identificar la peticion filtrada, no la carga inicial.
    cy.get('@consultarIncidencias.all').should((peticiones) => {
      const filtrada = peticiones.find(({ request }) => {
        const params = new URL(request.url).searchParams
        return params.get('search') === '9'
      })

      expect(filtrada, 'Peticion GET con search=9').to.exist
      if (!filtrada) return

      const params = new URL(filtrada.request.url).searchParams

      expect(params.get('search')).to.eq('9')
      expect(params.get('type')).to.eq('IDENTIFICATION')
      expect(params.get('status')).to.eq('REPORTED')
      expect(params.get('date_from')).to.eq('2026-11-09')
      expect(params.get('date_to')).to.eq('2026-11-09')
    })

    // Verificar que los filtros se reflejan en la URL.
    cy.location('search')
      .should('include', 'from=teacher')
      .and('include', 'type=IDENTIFICATION')
      .and('include', 'status=REPORTED')

    // Verificar el resumen mostrado por la interfaz.
    cy.get('[aria-label="Resumen de la consulta"]')
      .should('be.visible')
      .and('contain.text', '1 incidencias')

    cy.screenshot('HU29-FE-FILTER-001-filtros-aplicados')
  })
})
