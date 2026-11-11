# EIDA - RUN-S3-FE-001 - HU27

Fecha: 2026-11-09
Rama: qa-sprint3-cypress
Herramienta: Cypress 16.2.1
Navegador: Chrome 156 headless
Modo: autenticacion mock y API interceptada

## Resultado consolidado

- Specs ejecutadas: 5
- Pruebas PASS: 5
- Pruebas FAIL: 0
- Pendientes: 0
- Omitidas: 0
- Duracion total: 22 segundos

## Escenarios

| ID | Resultado |
|---|---|
| HU27-FE-DUP-001 | PASS |
| HU27-FE-AUTH-001 | PASS |
| HU27-FE-ERR-001 | PASS |
| HU27-FE-SAVE-001 | PASS |
| HU27-FE-VAL-001 | PASS |

## Evidencias

Capturas: cypress/screenshots/
Videos: cypress/videos/

## Limitaciones

Las pruebas usan autenticacion de desarrollo y
respuestas API simuladas mediante cy.intercept.

No verifican la persistencia real en PostgreSQL,
la autorizacion efectiva de Laravel ni la
prevencion de duplicados entre solicitudes reales.

Los TC oficiales de la matriz permanecen pendientes
de vinculacion y cierre.

## Proximo paso

Revisar trazabilidad oficial y preparar pruebas de
integracion real en un entorno QA aislado.
