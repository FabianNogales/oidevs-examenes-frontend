import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Lock, FolderKanban, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { env } from '@/app/config/env'
import { HeaderLogo } from '@/shared/components/Header/HeaderLogo'
import { Footer } from '@/shared/components/Footer/Footer'
import { CollaborationModal } from '@/features/collaborations/components/CollaborationModal'
import { readOfflineIdentity, subscribeOfflineIdentity, type OfflineIdentity,} from '../services/offlineIdentity'
import { useConnectivity } from '../hooks/useConnectivity'
import { OfflineConnectionStatus } from './OfflineConnectionStatus'
import shared from './OfflineShared.module.css'
import workspace from '@/features/offline-entry/components/OfflineWorkspace.module.css'
import buttons from '@/features/collaborations/pages/Collaborations.module.css'

export function OfflineAccessGate({
  children,
}: {
  children: (identity: OfflineIdentity) => ReactNode
}) {
  const { user, isLoading, clearSession, refreshUser } = useAuth()
  const online = useConnectivity()
  const [identity, setIdentity] = useState(readOfflineIdentity)
  const [lockOpen, setLockOpen] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const update = () => setIdentity(readOfflineIdentity())
    const unsubscribe = subscribeOfflineIdentity(update)
    const timer = window.setInterval(update, 10000)
    update()
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [])

  const allowed =
    identity &&
    !env.useAuthMock &&
    (!user ||
      (user.id === identity.ownerId &&
        user.status === 'ACTIVE' &&
        !user.must_change_password))

  return (
    <div className={workspace.layout}>
      <header className={workspace.institution}>
        <HeaderLogo />
        <div className={shared.actions}>
          <Link to="/offline" className={shared.link}>
            <FolderKanban size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>Mis listas locales</span>
          </Link>
          {allowed ? (
            <button
              className={buttons.secondaryButton}
              onClick={() => setLockOpen(true)}
            >
              <Lock size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>Bloquear acceso local</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className={workspace.sticky}>
        <OfflineConnectionStatus online={online} />
        <span>
          {allowed
            ? `${identity.displayName} · Contexto local de esta pestaña`
            : 'Acceso local protegido'}
        </span>
      </div>

      {allowed ? (
        children(identity)
      ) : (
        <main className={shared.page}>
          <section className={`${shared.panel} ${shared.empty}`}>
            <ShieldAlert
              size={36}
              strokeWidth={1.65}
              color="var(--color-accent)"
              style={{ marginInline: 'auto', marginBottom: '12px' }}
              aria-hidden="true"
            />
            <p className={shared.eyebrow}>EIDA · Control sin conexión</p>
            <h1>Verifica tu cuenta para acceder</h1>
            <p>
              Los datos locales pertenecen al responsable que descargó cada
              lista. No se pueden abrir desde otra cuenta.
            </p>
            {!window.isSecureContext ? (
              <p role="alert">
                Este espacio requiere HTTPS o localhost seguro para preparar el
                dispositivo y utilizar la cámara.
              </p>
            ) : null}
            <p>
              {online
                ? 'Inicia sesión y prepara este dispositivo antes de desconectarte.'
                : 'Conéctate e inicia sesión con la misma cuenta. Los eventos guardados se conservan.'}
            </p>
            {env.useAuthMock ? (
              <p role="alert">
                El modo offline requiere una cuenta y un paquete del backend
                real. La autenticación simulada no habilita acceso local.
              </p>
            ) : null}
            {isLoading || checking ? (
              <p role="status">Comprobando sesión con el servidor…</p>
            ) : null}
            <div
              className={shared.actions}
              style={{ justifyContent: 'center', marginTop: '20px' }}
            >
              <Link className={buttons.primaryButton} to="/login">
                Iniciar sesión
              </Link>
              <button
                className={buttons.secondaryButton}
                disabled={!online || checking}
                onClick={() => {
                  setChecking(true)
                  void refreshUser().finally(() => setChecking(false))
                }}
              >
                Comprobar sesión
              </button>
            </div>
          </section>
        </main>
      )}

      <Footer />

      {lockOpen ? (
        <CollaborationModal
          title="Bloquear los datos de esta pestaña"
          onClose={() => setLockOpen(false)}
        >
          <p>
            Las listas y los eventos se conservarán en este navegador. Para
            volver a abrirlos necesitarás verificar la misma cuenta con
            conexión.
          </p>
          <p>
            Este bloqueo local no cierra por sí solo la sesión del servidor.
          </p>
          <div className={shared.actions}>
            <button
              className={buttons.secondaryButton}
              onClick={() => setLockOpen(false)}
            >
              Cancelar
            </button>
            <button
              className={buttons.primaryButton}
              onClick={() => {
                clearSession()
                setLockOpen(false)
              }}
            >
              Bloquear acceso
            </button>
          </div>
        </CollaborationModal>
      ) : null}
    </div>
  )
}