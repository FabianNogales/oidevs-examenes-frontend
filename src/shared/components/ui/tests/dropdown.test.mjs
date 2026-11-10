import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { BookOpen, Layers } from 'lucide-react'
import {
  nodes,
  sourceHarness,
  sourceRoot,
  textContent,
} from '../../../tests/sourceHarness.mjs'

const dropdownRoot = resolve(sourceRoot, 'shared/components/ui/Dropdown')
const readCss = (relativePath) =>
  readFileSync(resolve(sourceRoot, relativePath), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

test('Dropdown CSS strictly adheres to Semi-Flat Design 2.0 tokens and supports multi-line text wrapping', () => {
  const css = readCss('shared/components/ui/Dropdown/Dropdown.module.css')

  assert.doesNotMatch(
    css,
    /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i,
    'no literal hex/rgb/hsl colors allowed',
  )
  assert.doesNotMatch(css, /font-size:\s*[\d.]+px/, 'no px font sizes allowed')
  assert.doesNotMatch(
    css,
    /:global|!important|--(status|control-height|z-)/,
    'no restricted DS1.4 tokens or !important allowed',
  )

  for (const [, value] of css.matchAll(
    /(?:^|[\s;{])(?:background-color|color|border-color):\s*([^;]+);/g,
  )) {
    assert.match(
      value.trim(),
      /^(?:var\(--[\w-]+\)|inherit|transparent)$/,
      `expected token value, got: ${value}`,
    )
  }

  assert.match(
    css,
    /\.trigger,\s*\.container button\.trigger\s*\{[^}]*min-height:\s*var\(--input-height\);[^}]*border:\s*1px solid var\(--color-input-border\);[^}]*border-radius:\s*var\(--input-radius\);/,
  )
  assert.match(
    css,
    /\.option,\s*\.container button\.option\s*\{[^}]*border:\s*1px solid transparent;[^}]*background-color:\s*transparent;[^}]*color:\s*var\(--color-text-primary\);/,
    'dropdown options are scoped with .container button.option to prevent parent panel button overrides',
  )
  assert.match(
    css,
    /\.triggerText\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/,
    'trigger text wraps long labels across multiple lines',
  )
  assert.match(
    css,
    /\.optionLabel\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/,
    'option label wraps long text cleanly',
  )
})

test('Page and feature CSS modules do not override Dropdown or Button primitives via bare descendant button/select selectors', () => {
  const cssModules = [
    'features/exam-reports/pages/ExamReports.module.css',
    'features/incidents/components/IncidentForm.module.css',
    'features/attendance/pages/Attendance.module.css',
    'shared/styles/portalBase.module.css',
    'features/portal-calendar/pages/portalCalendar.module.css',
    'features/exams/components/EntryQr.module.css',
  ]
  for (const file of cssModules) {
    const css = readCss(file)
    assert.doesNotMatch(
      css,
      /\.(?:panel|filters|toolbar|tabs|listButtons|page|dialog|calendar|cameraControls)\s+button\s*[,{]/,
      `${file} must exclude [data-ds-button] from generic descendant button selectors`,
    )
  }
})

test('Dropdown single-select renders options list, lucide-react icons, and updates value on selection', () => {
  const h = sourceHarness()
  const { Dropdown } = h.load('shared/components/ui/Dropdown/Dropdown.tsx')
  const options = [
    { value: '', label: 'Todas las materias' },
    {
      value: 'SIS-101',
      label:
        'Introducción a la Arquitectura de Software y Sistemas Distribuidos de Gran Escala',
      description: 'Semestre 1 · Troncal',
      badge: 'SIS-101',
      icon: BookOpen,
    },
    {
      value: 'SIS-202',
      label: 'Taller de Ingeniería de Software',
      disabled: true,
    },
  ]

  let selectedValue = ''
  const renderDropdown = () =>
    h.render(() =>
      Dropdown({
        id: 'subject-filter',
        value: selectedValue,
        options,
        leadingIcon: Layers,
        onChange: (next) => {
          selectedValue = next
        },
      }),
    )

  let tree = renderDropdown()
  const trigger = () =>
    nodes(
      tree,
      (node) => node.type === 'button' && node.props?.id === 'subject-filter',
    )[0]
  assert.ok(trigger(), 'renders trigger button with id')
  assert.equal(trigger().props['aria-expanded'], false)

  trigger().props.onClick()
  tree = renderDropdown()
  assert.equal(trigger().props['aria-expanded'], true)

  const optionButtons = nodes(
    tree,
    (node) => node.type === 'button' && node.props?.role === 'option',
  )
  assert.equal(optionButtons.length, 3)
  assert.equal(optionButtons[2].props.disabled, true)

  optionButtons[1].props.onClick()
  tree = renderDropdown()
  assert.equal(selectedValue, 'SIS-101')
  assert.equal(
    trigger().props['aria-expanded'],
    false,
    'closes menu after single selection',
  )
  assert.match(
    textContent(trigger()),
    /Introducción a la Arquitectura de Software/,
  )
  h.unmount()
})

test('Dropdown multi-select toggles multiple values without closing the menu and formats tags', () => {
  const h = sourceHarness()
  const { Dropdown } = h.load('shared/components/ui/Dropdown/Dropdown.tsx')
  const options = [
    { value: 10, label: 'Ingeniería de Sistemas' },
    { value: 20, label: 'Ingeniería Informática' },
    { value: 30, label: 'Ingeniería Electrónica' },
  ]

  let selectedValues = [10]
  const renderDropdown = () =>
    h.render(() =>
      Dropdown({
        id: 'careers-dropdown',
        multiple: true,
        value: selectedValues,
        options,
        placeholder: 'Selecciona carreras',
        onChange: (next) => {
          selectedValues = next
        },
      }),
    )

  let tree = renderDropdown()
  const trigger = () =>
    nodes(
      tree,
      (node) => node.type === 'button' && node.props?.id === 'careers-dropdown',
    )[0]

  trigger().props.onClick()
  tree = renderDropdown()

  const listbox = nodes(tree, (node) => node.props?.role === 'listbox')[0]
  assert.equal(listbox.props['aria-multiselectable'], true)

  const optionButtons = () =>
    nodes(
      tree,
      (node) => node.type === 'button' && node.props?.role === 'option',
    )
  optionButtons()[1].props.onClick()
  tree = renderDropdown()
  assert.deepEqual(selectedValues, [10, 20])
  assert.equal(
    trigger().props['aria-expanded'],
    true,
    'stays open during multi-select',
  )

  optionButtons()[0].props.onClick()
  tree = renderDropdown()
  assert.deepEqual(selectedValues, [20])
  h.unmount()
})

test('Admin Header dropdown menu matches parent tab horizontal width without nth-child hacks', () => {
  const headerCss = readCss('shared/components/Header/Header.module.css')
  assert.doesNotMatch(
    headerCss,
    /\.navigationItem:nth-child\(2\)/,
    'no nth-child(2) width hack in Header.module.css',
  )
  assert.match(
    headerCss,
    /\.header\[data-admin='true'\]\s+\.navigationDropdownMenu\s*\{[\s\S]*?left:\s*0;[\s\S]*?right:\s*0;[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*100%;[\s\S]*?max-width:\s*100%;/,
    'admin header dropdown menu matches exact horizontal bounds of parent tab',
  )
})
