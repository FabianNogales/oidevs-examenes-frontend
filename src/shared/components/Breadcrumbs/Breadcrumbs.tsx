import { Link } from 'react-router'
import styles from './Breadcrumbs.module.css'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Ruta de navegación" className={styles.breadcrumbs}>
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1
          return (
            <li
              key={`${index}-${item.label}`}
              className={current ? styles.current : undefined}
            >
              {item.to && !current ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span aria-current={current ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
