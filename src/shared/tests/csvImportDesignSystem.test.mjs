// DS4.2a contract: the shared CSV import panels use Design System buttons and tokens only.
// Covers both style families (CsvImport.module.css and the students import styles) and every consumer.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const src = resolve(import.meta.dirname, '../..')
const read = (file) => readFileSync(resolve(src, file), 'utf8')
const css = (file) => read(file).replace(/\/\*[\s\S]*?\*\//g, '')

const styleFiles = [
  'shared/styles/CsvImport.module.css',
  'shared/styles/CsvImportReport.module.css',
  'features/students/pages/ImportStudentsPage.module.css',
  'features/students/components/StudentImportDesign.module.css',
  'features/course-offerings/components/OfferingImport.module.css',
]

// Panels rendered by the five import screens (rooms, subjects, students, offerings, teacher enrollment)
// plus the eligibility panel that reuses the students import styles.
const consumers = [
  'features/rooms/components/import/RoomCsvDropzone.tsx',
  'features/rooms/components/import/RoomImportPanel.tsx',
  'features/rooms/components/import/RoomImportTable.tsx',
  'features/subjects/components/import/SubjectCsvDropzone.tsx',
  'features/subjects/components/import/SubjectImportPanel.tsx',
  'features/subjects/components/import/SubjectImportTable.tsx',
  'features/students/components/EnrollmentImportPanel.tsx',
  'features/students/components/StudentImportPanel.tsx',
  'features/students/components/CsvDropzone.tsx',
  'features/students/components/StudentImportSuccess.tsx',
  'features/course-offerings/components/OfferingImportPanel.tsx',
  'features/course-offerings/components/OfferingImportReport.tsx',
  'features/eligibility-automation/components/AcademicCsvImportPanel.tsx',
]

const legacyButtons = ['templateButton', 'cancelButton', 'continueButton', 'selectFileButton', 'removeFileButton',
  'changeFileButton', 'downloadViewButton', 'pagerButton', 'confirmButton', 'secondaryButton']

test('import styles use tokens only: no literal colours, px font sizes, :global or non-canonical breakpoints', () => {
  for (const file of styleFiles) {
    const source = css(file)
    assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i, `${file}: literal colour`)
    assert.doesNotMatch(source, /font-size:\s*[\d.]+px/, `${file}: px font size`)
    assert.doesNotMatch(source, /:global|!important/, `${file}: global override`)
    assert.doesNotMatch(source, /var\(--brand-/, `${file}: brand palette instead of a semantic token`)
    for (const [, value] of source.matchAll(/@media[^{]*?(\d+)px/g))
      assert.ok(['480', '640', '768', '1024'].includes(value), `${file}: breakpoint ${value}px`)
  }
})

test('legacy button classes keep layout only: the look comes from Button', () => {
  const visual = /^\s*(background|border|color|padding|height|min-height|font-size|font-weight|border-radius|opacity|cursor)\s*:/m
  for (const file of styleFiles) {
    const source = css(file)
    for (const [, selector, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const names = legacyButtons.filter((name) => new RegExp(`\\.${name}(?![\\w-])(?!\\s+svg)`).test(selector))
      if (!names.length || /svg/.test(selector)) continue
      assert.doesNotMatch(body, visual, `${file}: ${selector.trim()} still styles a button`)
    }
  }
})

test('the legacy page header of CsvImport.module.css is gone (PageHeader owns it since DS4.1a)', () => {
  const source = css('shared/styles/CsvImport.module.css')
  for (const name of ['page', 'content', 'breadcrumb', 'pageHeader'])
    assert.doesNotMatch(source, new RegExp(`\\.${name}\\b(?!\\w)`), `.${name}`)
})

test('import panels render Design System buttons, never native buttons with legacy classes', () => {
  for (const file of consumers) {
    const source = read(file)
    for (const match of source.matchAll(/<button\b([^>]*)>/g)) {
      const attrs = match[1]
      assert.ok(!legacyButtons.some((name) => attrs.includes(name)), `${file}: native <button> with legacy class`)
    }
    assert.match(source, /components\/ui\/Button\/Button'/, `${file}: imports Button`)
    assert.doesNotMatch(source, /<h1\b/, `${file}: panels never render an h1`)
  }
})
