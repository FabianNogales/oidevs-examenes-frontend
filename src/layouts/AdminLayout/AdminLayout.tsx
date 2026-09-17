import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'

import { httpClient } from '@/shared/api/httpClient'

import styles from './AdminLayout.module.css'

type AdminStatus =
  | 'loading'
  | 'ready'
  | 'error'

async function checkAdminAccess() {
  await httpClient.get('/admin/test')
}

export function AdminLayout() {
  const [status, setStatus] =
    useState<AdminStatus>('loading')

  useEffect(() => {
    let isMounted = true

    checkAdminAccess().then(
      () => {
        if (isMounted) {
          setStatus('ready')
        }
      },
      () => {
        if (isMounted) {
          setStatus('error')
        }
      },
    )

    return () => {
      isMounted = false
    }
  }, [])

  async function handleRetry() {
    setStatus('loading')

    try {
      await checkAdminAccess()
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <section
        className={styles.statePage}
        aria-live="polite"
      >
        <div
          className={styles.spinner}
          aria-hidden="true"
        />

        <h1>Cargando panel administrativo</h1>

        <p>
          Estamos verificando el acceso al sistema.
        </p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section
        className={styles.statePage}
        role="alert"
      >
        <h1>
          No se pudo cargar el panel administrativo
        </h1>

        <p>
          No fue posible conectarse con el sistema
          en este momento. Inténtalo nuevamente.
        </p>

        <button
          type="button"
          className={styles.retryButton}
          onClick={() => void handleRetry()}
        >
          Reintentar
        </button>
      </section>
    )
  }

  return (
    <div className={styles.adminLayout}>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}