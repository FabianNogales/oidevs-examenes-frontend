import type { KeyboardEvent } from 'react'

/** Keep keyboard navigation inside the active dialog, including native form controls. */
export function trapDialogFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return
  const dialog = event.currentTarget
  const elements = Array.from(dialog.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, a[href], [tabindex]',
  )).filter((element) => element.tabIndex >= 0 &&
    !element.matches(':disabled, input[type="hidden"]') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    element.getClientRects().length > 0)
  const first = elements[0]
  const last = elements.at(-1)
  const active = document.activeElement
  if (!first || !last) {
    event.preventDefault()
    dialog.focus()
  } else if (event.shiftKey && (active === first || !elements.includes(active as HTMLElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !elements.includes(active as HTMLElement))) {
    event.preventDefault()
    first.focus()
  }
}
