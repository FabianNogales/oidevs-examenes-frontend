import { useState, useRef, useEffect, useId } from 'react'
import { NavLink, useLocation } from 'react-router'

import type {
  HeaderNavigationItem,
  HeaderNavigationProps,
} from './header.types'
import { isHeaderDestinationActive } from './headerNavigationActive'
import styles from './Header.module.css'
import { useStudentImportDraft } from '@/features/students/utils/studentImportDraft'

export function HeaderNavigation(props: HeaderNavigationProps) {
  const location = useLocation()
  return (
    <HeaderNavigationContent
      key={`${location.pathname}${location.search}`}
      {...props}
    />
  )
}

function HeaderNavigationContent({ items, onNavigate }: HeaderNavigationProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const draft = useStudentImportDraft()
  const hasPendingImport = draft !== null
  const listRef = useRef<HTMLUListElement>(null)
  const navigationId = useId()
  const location = useLocation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (listRef.current && !listRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDropdown = (label: string) => {
    setOpenDropdown((previous) => (previous === label ? null : label))
  }

  const dynamicItems = items.map((item) => {
    if (item.label === 'Estudiantes' && hasPendingImport) {
      const alreadyHasItem = item.children?.some(
        (c) => c.label === 'Ultima importacion',
      )
      if (!alreadyHasItem) {
        return {
          ...item,
          children: [
            ...(item.children || []),
            { label: 'Ultima importacion', to: '/admin/students/import' },
          ],
        }
      }
    }
    return item
  })

  const isDropdownItemActive = (child: HeaderNavigationItem) => {
    if (!isHeaderDestinationActive(child, location)) return false
    const childLabel = child.label
    const childTo = child.to
    if (childTo === '/admin/students/import') {
      const isNewView = location.state?.view === 'new'
      const isResumeView = location.state?.view === 'resume'
      const hasPreview = hasPendingImport

      if (childLabel === 'Ultima importacion') {
        return isResumeView || (!isNewView && hasPreview)
      }
      if (childLabel === 'Importar estudiantes') {
        return isNewView || (!isResumeView && !hasPreview)
      }
    }

    return true
  }

  return (
    <ul className={styles.navigationList} ref={listRef}>
      {dynamicItems.map((item, index) => {
        const hasChildren = item.children && item.children.length > 0
        const activeChild = item.children
          ?.filter(isDropdownItemActive)
          .sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0]
        const isParentActive = Boolean(activeChild)
        const dropdownId = `${navigationId}-${index}`

        return (
          <li
            key={`${item.label}-${item.to ?? 'nav'}`}
            className={styles.navigationItem}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && openDropdown === item.label) {
                event.preventDefault()
                event.stopPropagation()
                setOpenDropdown(null)
                event.currentTarget.querySelector('button')?.focus()
              }
            }}
          >
            {hasChildren ? (
              <>
                <button
                  type="button"
                  className={`${styles.navigationLink} ${isParentActive ? styles.active : ''}`}
                  onClick={() => toggleDropdown(item.label)}
                  aria-expanded={openDropdown === item.label}
                  aria-controls={dropdownId}
                >
                  {item.label}
                  <svg
                    className={`${styles.dropdownIcon} ${
                      openDropdown === item.label ? styles.dropdownIconOpen : ''
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {openDropdown === item.label && (
                  <div
                    id={dropdownId}
                    className={styles.navigationDropdownMenu}
                  >
                    {item.children?.map((child) => {
                      const linkState =
                        child.label === 'Importar estudiantes'
                          ? { view: 'new' }
                          : child.label === 'Ultima importacion'
                            ? { view: 'resume' }
                            : undefined

                      return (
                        <NavLink
                          key={child.label}
                          to={child.to!}
                          state={linkState}
                          aria-current={activeChild === child ? 'page' : false}
                          className={() =>
                            `${styles.navigationDropdownItem} ${
                              activeChild === child
                                ? styles.navigationDropdownItemActive
                                : ''
                            }`
                          }
                          onClick={() => {
                            setOpenDropdown(null)
                            onNavigate?.()
                          }}
                        >
                          {child.label}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </>
            ) : item.to ? (
              <NavLink
                to={item.to}
                end={item.to === '/' ? true : item.end}
                aria-current={
                  item.to === '/teacher/subjects' &&
                  location.pathname.startsWith('/teacher/students/')
                    ? 'page'
                    : undefined
                }
                className={({ isActive }) =>
                  `${styles.navigationLink} ${isActive || (item.to === '/teacher/subjects' && location.pathname.startsWith('/teacher/students/')) ? styles.active : ''}`
                }
                onClick={onNavigate}
              >
                {item.label}
              </NavLink>
            ) : (
              <span
                className={`${styles.navigationLink} ${styles.unavailable}`}
                role="link"
                aria-disabled="true"
                title="Próximamente"
              >
                {item.label}
                <span className={styles.srOnly}> (próximamente)</span>
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
