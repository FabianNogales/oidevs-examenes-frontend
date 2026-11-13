import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  sourceHarness,
  nodes,
  textContent,
  settle,
} from '../../../shared/tests/sourceHarness.mjs'
import { record } from '../../infractions/tests/infractionFixtures.mjs'

test('a measure found beyond the first history page prevents duplicate expulsion', async () => {
  const pages = []
  const h = sourceHarness({
    'react-router': { Link: 'link' },
    '@/shared/components/ui/Button/Button': { Button: 'button' },
    '@/shared/components/PortalDialog/PortalDialog': { PortalDialog: 'dialog' },
    './ExpulsionForm': { ExpulsionForm: 'expulsion-form' },
    '../api/expulsionsApi': {
      getExpulsionHistory: async (exam, student, page) => {
        pages.push(page)
        return {
          meta: { last_page: 2 },
          data:
            page === 2
              ? [
                  {
                    expulsion: {
                      id: 7,
                      exam_id: exam,
                      reason: 'Motivo conservado',
                      expelled_at: record.occurred_at,
                      expelled_by: record.reported_by,
                      infraction: { id: record.id + 1 },
                    },
                  },
                ]
              : [],
        }
      },
      getExpulsions: async () => {
        throw new Error('Existing expulsion must block another')
      },
    },
  })
  const { CaseExpulsion } = h.load(
    'features/expulsions/components/CaseExpulsion.tsx',
  )
  h.render(() => CaseExpulsion({ record, refresh: () => {} }))
  await settle()
  const tree = h.render()
  assert.deepEqual(pages, [1, 2])
  assert.match(textContent(tree), /Expulsado del examen/)
  assert.match(textContent(tree), /otro caso/)
  assert.equal(nodes(tree, (n) => n.type === 'button').length, 0)
  h.unmount()
})
