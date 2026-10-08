import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'

import type { HeaderNavigationProps } from './header.types'
import styles from './Header.module.css'

export function HeaderNavigation({
  items,
  onNavigate,
}: HeaderNavigationProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLLIElement>(null)
  const location = useLocation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setOpenDropdown(null)
  }, [location.pathname])

  const toggleDropdown = (label: string) => {
    setOpenDropdown((prev) => (prev === label ? null : label))
  }

  return (
    <ul className={styles.navigationList}>
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0

        const isParentActive =
          hasChildren &&
          item.children?.some((child) => location.pathname.startsWith(child.to || ''))

        return (
          <li 
            key={`${item.label}-${item.to ?? 'nav'}`}
            ref={hasChildren ? dropdownRef : null}
            className={styles.navigationItem}
          >
            {hasChildren ? (
              <>
                <button
                  type="button"
                  className={`${styles.navigationLink} ${isParentActive ? styles.active : ''}`}
                  onClick={() => toggleDropdown(item.label)}
                  aria-expanded={openDropdown === item.label}
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
                  <div className={styles.navigationDropdownMenu}>
                    {item.children?.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to!}
                        className={({ isActive }) =>
                          `${styles.navigationDropdownItem} ${
                            isActive ? styles.navigationDropdownItemActive : ''
                          }`
                        }
                        onClick={onNavigate}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : item.to ? (
              <NavLink
                to={item.to}
                end={item.to === '/' ? true : item.end}
                className={({ isActive }) =>
                  `${styles.navigationLink} ${isActive ? styles.active : ''}`
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