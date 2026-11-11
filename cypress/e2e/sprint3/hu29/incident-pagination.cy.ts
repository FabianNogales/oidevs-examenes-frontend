import { INCIDENT_TYPE_LABELS } from '../../../../src/features/incidents/utils/incidentValidation'

describe('EIDA - HU29 - Consulta de incidencias', () => {
  it('HU29-FE-PAGE-001 - Conservar filtros al paginar', () => {
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


    // Dos paginas: 10 registros en la primera y 1 en la segunda.
    const byType = Object.fromEntries(
      Object.keys(INCIDENT_TYPE_LABELS).map((type) => [
        type,
        type === 'IDENTIFICATION' ? 11 : 0,
      ]),
    )

    cy.intercept(
      {
        method: 'GET',
        url: `**/exams/${examId}/incidents*`,
        headers: { accept: 'application/json' },
      },
      (req) => {
        const params = new URL(req.url).searchParams
        const page = Number(params.get('page') || '1')

        const data = page === 2
          ? [{
              ...incident,
              id: 11,
              description: 'Incidencia de la segunda pagina.',
            }]
          : Array.from({ length: 10 }, (_, index) => ({
              ...incident,
              id: index + 1,
              description: `Incidencia QA ${index + 1}.`,
            }))

        req.reply({
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
            data,
            meta: {
              current_page: page,
              last_page: 2,
              per_page: 10,
              total: 11,
            },
            summary: {
              total: 11,
              by_type: byType,
            },
            filters: {
              statuses: [
                { value: 'REPORTED', label: 'Reportada' },
              ],
            },
          },
        })
      },
    ).as('consultarIncidencias')

    // Abrir la consulta avanzada del docente.
    cy.visit(`/exams/${examId}/incidents?from=teacher`)

    cy.wait('@consultarIncidencias')

    cy.contains('h1', 'Incidencias e ingresos irregulares')
      .should('be.visible')

    cy.get('form[aria-label="Filtros de incidencias"]')
      .should('be.visible')


    // Aplicar un filtro por tipo de incidencia.
    cy.get('form[aria-label="Filtros de incidencias"]')
      .within(() => {
        cy.get('select[name="type"]')
          .select('IDENTIFICATION')

        cy.contains('button', 'Buscar').click()
      })

    cy.location('search')
      .should('include', 'type=IDENTIFICATION')

    // Confirmar que la API recibio el filtro.
    cy.get('@consultarIncidencias.all').should((peticiones) => {
      const filtrada = peticiones.find(({ request }) => {
        const params = new URL(request.url).searchParams
        return params.get('type') === 'IDENTIFICATION' &&
          params.get('page') === '1'
      })

      expect(filtrada, 'Consulta filtrada de pagina 1').to.exist
    })

    // Verificar la primera pagina.
    cy.contains('#10 ·').should('be.visible')
    cy.contains('#11 ·').should('not.exist')

    // Avanzar a la siguiente pagina.
    cy.contains('button', 'Siguiente')
      .should('be.enabled')
      .click()

    // El filtro debe permanecer en la URL.
    cy.location('search')
      .should('include', 'page=2')
      .and('include', 'type=IDENTIFICATION')

    // Confirmar que la API recibio pagina 2 y el filtro.
    cy.get('@consultarIncidencias.all').should((peticiones) => {
      const segundaPagina = peticiones.find(({ request }) => {
        const params = new URL(request.url).searchParams

        return params.get('page') === '2' &&
          params.get('type') === 'IDENTIFICATION'
      })

      expect(
        segundaPagina,
        'Consulta de pagina 2 conservando el filtro'
      ).to.exist
    })

    // La tabla debe mostrar el registro de la segunda pagina.
    cy.contains('#11 ·').should('be.visible')
    cy.contains('#10 ·').should('not.exist')

    // El resumen incluye todos los registros filtrados.
    cy.get('[aria-label="Resumen de la consulta"]')
      .should('contain.text', '11 incidencias')

    cy.screenshot('HU29-FE-PAGE-001-paginacion-filtrada')
  })
})
