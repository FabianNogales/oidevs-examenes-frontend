import {
  PortalDialog,
  type PortalDialogProps,
} from '@/shared/components/PortalDialog/PortalDialog'
import styles from '../pages/portalCalendar.module.css'

/** Compatibility adapter. Domain forms keep their existing style hooks. */
export function CalendarModal(props: PortalDialogProps) {
  return (
    <PortalDialog
      {...props}
      className={`${styles.dialog} ${props.drawer ? styles.drawer : ''} ${props.className ?? ''}`}
      headerClassName={`${styles.dialogHeader} ${props.headerClassName ?? ''}`}
      bodyClassName={`${props.drawer ? styles.drawerBody : ''} ${props.bodyClassName ?? ''}`}
    />
  )
}
