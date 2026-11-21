# RNF7 / RNF10 — Descarga integrada con Drive privado

Se conservan AdminBackupsPage, CSS, menú/ruta /admin/backups, tabla, indicadores,
estados, confirmación, mensajes y polling. Sin nuevas dependencias npm en la web.

Solo se adapta Descargar:

- backupsApi.ts solicita POST /admin/backups/{uuid}/download-ticket con CSRF.
- backupDownload.ts prepara ventana durante el clic y formulario POST al Worker.
- AdminBackupsPage usa ese flujo y limpia listeners manteniendo carga/doble clic.
- downloadTicket.integration.test.mjs añade casos de ticket/formulario/error y
  compatibilidad; backups.integration.test.mjs se conserva.

El Administrador no inicia sesión en Drive. React no recibe OAuth ni carga el
dump con Axios/fetch/Blob. Ticket y formulario son transitorios. No se muestran
file_id/refresh token. Error/caducidad/consumo/interrupción exige solicitar otro
ticket; no se anuncia éxito por emitirlo. Feedback Worker valida origen y ventana;
autorización real exige firma/claims y consumo atómico D1.

Configuración y recuperación en el documento backend docs/BACKUPS_RNF7_RNF10.md
del workspace. Revisar CSP form-action para el origen real autorizado del Worker;
no configurar dominios ficticios. Todo permanece desactivado hasta configurar y
probar. No se ejecutaron pruebas, instalaciones o builds.

## Node institucional y herramientas externas

La política institucional de la aplicación principal sigue siendo Node.js 20.
Backups no añade node:sqlite, Wrangler, paquetes npm o requisitos Node 22 al
frontend. Sus scripts, dependencias y lock permanecen iguales. El Worker es otro
paquete y su workflow manual se ejecuta con Node 24 en GitHub Actions; no se
encadena a npm run build o al deploy de esta aplicación.

Hay incompatibilidades previas pendientes de la aplicación principal: Vite 8 y
ESLint 10 requieren Node 20.19+ dentro de la rama 20; el lock existente contiene
@zxing/library 0.23.0, peer de @zxing/browser 0.2.1, con engines.node >=24. Por ello
no se certifica aquí compatibilidad integral del árbol actual con Node 20. Se
informa el bloqueo sin cambiar versiones, lock o el objetivo institucional.

Las pruebas Worker usan node:sqlite y requieren Node >=22.13; Wrangler se instala
y ejecuta únicamente bajo infra/backup-download-worker del repositorio backend,
en el entorno externo. Ninguno se ejecuta en el despliegue institucional. La guía
backend detalla CI separado, lock del Worker pendiente y configuración protegida.

Comando futuro focalizado:

~~~bash
node --test src/features/backups/tests/backups.integration.test.mjs src/features/backups/tests/downloadTicket.integration.test.mjs
~~~

Git inicial: main, cbcbbd91b3a72a5387c681bbdac18ace02afcf2e, 2 tracked modificados
y 5 untracked; sin staged. Final: misma rama/HEAD, índice intacto y trabajo previo
preservado. Sin commit/push/deploy. SEC-01/SEC-02 se conservan. QA visual,
accesibilidad, ventanas, mensajes cross-origin y streaming real pendientes.
