# EIDA - RUN-S3-FE-001 - HU34

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
- Suma de duraciones por especificacion: 59 segundos

## Escenarios ejecutados

| ID | Escenario | Resultado |
|---|---|---|
| HU34-FE-CONFIG-001 | Consultar criterios institucionales | PASS |
| HU34-FE-CRITERIA-001 | Validar y guardar criterios | PASS |
| HU34-FE-ACADEMIC-001 | Consultar y corregir datos academicos | PASS |
| HU34-FE-PREVIEW-001 | Preservar decisiones manuales | PASS |
| HU34-FE-HISTORY-001 | Consultar historial | PASS |

## Comportamientos verificados

- Consulta de configuracion institucional por examen.
- Visualizacion de criterios obligatorios y opcionales.
- Proteccion de criterios institucionales bloqueados.
- Validacion de parametros requeridos.
- Guardado simulado de criterios y revisiones.
- Consulta de registros academicos.
- Correccion justificada mediante PATCH simulado.
- Visualizacion de resultados de evaluacion automatica.
- Representacion de decisiones manuales preservadas.
- Identificacion de estudiantes pendientes.
- Consulta de historial academico y de evaluaciones.
- Acceso al detalle historico de una evaluacion.

## Evidencias

Capturas:

- HU34-FE-CONFIG-001-criterios-configurados.png
- HU34-FE-CRITERIA-001-criterios-guardados.png
- HU34-FE-ACADEMIC-001-correccion-academica.png
- HU34-FE-PREVIEW-001-decision-manual-preservada.png
- HU34-FE-HISTORY-001-historial-consultivo.png

Ubicaciones:

- Especificaciones: cypress/e2e/sprint3/hu34/
- Capturas: cypress/screenshots/
- Videos: cypress/videos/

## Incidencias de automatizacion

En la primera ejecucion de HU34-FE-PREVIEW-001
fallo una asercion por utilizar revision
en lugar de configuration_revision.

Se corrigio exclusivamente la prueba Cypress.

La ejecucion individual posterior obtuvo PASS
y la ejecucion consolidada obtuvo 5 PASS.

No se confirmo un defecto funcional asociado
a esa incidencia.

## Limitaciones

- Autenticacion y API simuladas.
- Sin integracion real con Laravel y PostgreSQL.
- No se verifico la persistencia real de registros.
- No se comprobo el calculo real de reglas institucionales.
- La preservacion de decisiones manuales se verifico
  en la presentacion de respuestas simuladas.
- No se confirma ninguna habilitacion real.
- Los casos de prueba oficiales requieren trazabilidad
  y validacion adicional para su cierre.

## Conclusion

HU34 supero su ejecucion consolidada de frontend
con 5 PASS, 0 FAIL y 0 pruebas omitidas.

La cobertura tecnica incluye configuracion,
criterios, datos academicos, vista previa e historial.
