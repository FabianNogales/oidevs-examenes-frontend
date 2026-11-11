# EIDA - RUN-S3-FE-001 - HU35

## Datos de ejecucion

- Fecha: 2026-11-10
- Rama: qa-sprint3-cypress
- Herramienta: Cypress 16.2.1
- Navegador: Chrome 156 headless
- Modalidad: Frontend con autenticacion mock y API simulada

## Resultado consolidado

- Especificaciones ejecutadas: 5
- Pruebas ejecutadas: 5
- PASS: 5
- FAIL: 0
- Pendientes: 0
- Omitidas: 0
- Duracion total: 57 segundos

## Escenarios ejecutados

| ID | Escenario | Resultado |
|---|---|---|
| HU35-FE-DIST-001 | Consultar distribucion preparada | PASS |
| HU35-FE-PREPARE-001 | Confirmar preparacion inicial | PASS |
| HU35-FE-REUSE-001 | Reutilizar distribucion existente | PASS |
| HU35-FE-ERROR-001 | Manejar rechazo de preparacion | PASS |
| HU35-FE-ASSIGN-001 | Consultar estudiantes asignados | PASS |

## Comportamientos verificados

- Consulta de distribucion de listas por examen.
- Visualizacion de responsables y rangos de apellidos.
- Confirmacion explicita antes de preparar listas.
- Advertencia de distribucion congelada en version 1.
- Envio unico de POST simulado de preparacion.
- Consulta y recarga de distribucion existente.
- Ausencia de una segunda preparacion automatica.
- Presentacion de rechazo HTTP 409 DISTRIBUTION_FROZEN.
- Consulta de estudiantes asignados a una lista.
- Navegacion hacia el detalle de estudiantes.

## Evidencias

Capturas:

- HU35-FE-DIST-001-distribucion-consultada.png
- HU35-FE-PREPARE-001-listas-preparadas.png
- HU35-FE-REUSE-001-distribucion-conservada.png
- HU35-FE-ERROR-001-preparacion-rechazada.png
- HU35-FE-ASSIGN-001-estudiantes-asignados.png

Ubicaciones:

- Especificaciones: cypress/e2e/sprint3/hu35/
- Capturas: cypress/screenshots/
- Videos: cypress/videos/

## Incidencias de automatizacion

La primera ejecucion de HU35-FE-DIST-001 fallo
porque un interceptor capturaba tambien la ruta
HTML del frontend y devolvia JSON durante cy.visit().

Se ajusto el interceptor para excluir la ruta
/teacher/exams/42/offline/assignments.

La ejecucion individual posterior obtuvo PASS.
La ejecucion consolidada obtuvo 5 PASS.

No se confirmo un defecto funcional asociado
a esa incidencia.

## Limitaciones

- Autenticacion mock y respuestas API simuladas.
- Sin validacion real de Laravel y PostgreSQL.
- No se verifico el algoritmo real de distribucion.
- No se comprobo persistencia real en el servidor.
- No se valido autorizacion real de responsables.
- No se verifico almacenamiento IndexedDB.
- No se realizaron pruebas de funcionamiento
  sin conexion ni de Service Worker/PWA.
- Los casos de prueba oficiales requieren
  trazabilidad y validacion adicional para su cierre.

## Conclusion

HU35 supero su ejecucion consolidada de frontend
con 5 PASS, 0 FAIL y 0 pruebas omitidas.

La cobertura tecnica comprende consulta,
preparacion, reutilizacion, manejo de errores
y visualizacion de estudiantes asignados.
