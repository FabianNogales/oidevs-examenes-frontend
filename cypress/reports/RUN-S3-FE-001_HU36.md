# EIDA - RUN-S3-FE-001 - HU36

## Datos de ejecucion

- Fecha: 2026-11-10
- Rama: qa-sprint3-cypress
- Historia: HU36 - Preparacion del dispositivo offline
- Cypress: 16.2.1
- Chrome: 156 headless
- Edge: 157.0.4341.42
- Node.js: 24.22.2

## Resultados

| Modalidad | Ejecutadas | PASS | FAIL |
|---|---:|---:|---:|
| Cypress - proteccion de acceso | 1 | 1 | 0 |
| Node.js - preparacion | 5 | 5 | 0 |
| Node.js - identidad y contratos transversales | 9 | 9 | 0 |
| Node.js - PWA y Service Worker | 7 | 7 | 0 |
| Navegador Edge - IndexedDB | 1 ejecucion | PASS | 0 |

Las pruebas Node.js incluyen casos relacionados
con HU35, HU36, HU37 y continuidad de identidad.
No representan 9 casos exclusivos de HU36.

## HU36-FE-ACCESS-001

Resultado: PASS.

Se verifico que el modo de autenticacion mock
no habilita acceso al control offline y que
no permite descargar paquetes.

Evidencias:
- HU36-FE-ACCESS-001-acceso-protegido.png
- offline-access.cy.ts.mp4

## Preparacion

Resultado: 5 PASS.

Se comprobaron:
- Notificacion posterior al commit simulado.
- Manejo del fallo de persistencia.
- Autorizacion revocada.
- Cancelacion del examen.
- Descarga interrumpida.

Archivo:
src/features/offline-entry/tests/offlinePreparation.test.mjs

## Contratos e identidad

Resultado: 9 PASS, transversales.

Se validaron contratos de distribucion,
paquetes, respuestas de sincronizacion
y restricciones de continuidad de identidad.

Archivos:
- offlineIdentity.test.mjs
- offlineContract.test.mjs

## Persistencia real en IndexedDB

Resultado: PASS.

Entorno: Microsoft Edge 157, perfil temporal aislado.

Se comprobo:
- Persistencia del paquete tras recarga.
- Persistencia de eventos.
- Conservacion de conflictos y rechazos.
- Prevencion de captura concurrente duplicada.
- Aislamiento de identidad.
- Limpieza controlada.

Evidencia:
cypress/reports/HU36-INDEXEDDB-browser.log

## PWA y Service Worker

Resultado: 7 PASS.

Se comprobo:
- Logica de emision del Service Worker.
- Precache de recursos estaticos.
- Alcance limitado del shell offline.
- Exclusion de APIs autenticadas y POST.
- Limpieza de caches propios.
- Comprobacion de recursos.
- Tiempo limite de disponibilidad.

Evidencia:
cypress/reports/HU36-PWA-node.log

## Limitaciones

- Sin prueba de descarga con Laravel real.
- Sin validacion de autorizacion real del backend.
- Sin build completo de produccion verificado.
- Sin prueba end-to-end de apertura sin red.
- Sin prueba de instalacion PWA en celular.
- Las pruebas de preparacion usan dependencias
  simuladas, excepto la verificacion aislada
  de IndexedDB en Edge.
- Los casos oficiales requieren validacion
  adicional antes de declararse cerrados.

## Conclusion

HU36 supera las verificaciones tecnicas
ejecutadas de frontend, logica de preparacion,
identidad, contratos, IndexedDB y PWA.

La evidencia demuestra persistencia real
en IndexedDB dentro de un navegador aislado,
pero no demuestra por si sola que la aplicacion
completa pueda abrirse sin conexion.

Estado: Cobertura tecnica aprobada,
integracion y validacion offline completa pendientes.
