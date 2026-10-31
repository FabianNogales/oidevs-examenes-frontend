import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AuthProvider } from '@/app/providers/AuthProvider'
import { App } from '@/App'
import { discardInheritedOfflineIdentity } from '@/features/offline-entry/services/offlineIdentity'
import { registerOfflineWorker } from '@/features/offline-entry/services/offlinePwa'

import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@/assets/styles/global.css'

discardInheritedOfflineIdentity()
if (import.meta.env.PROD) {
  void registerOfflineWorker().catch(() => {
    /* Preparation exposes a failed worker registration explicitly. */
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
