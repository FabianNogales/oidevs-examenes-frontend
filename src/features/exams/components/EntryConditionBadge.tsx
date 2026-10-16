import type { EntryConditionDisplay } from '../utils/entryControlDisplay'
import styles from '../pages/EntryControlPage.module.css'

export function EntryConditionBadge({ label, tone }: EntryConditionDisplay) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>
}
