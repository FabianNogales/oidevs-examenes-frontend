# EIDA - RUN-S3-FE-001 - HU33

## Datos de ejecucion

- Fecha: 2026-11-10
- Rama: qa-sprint3-cypress
- Herramienta: Cypress 16.2.1
- Navegador: Chrome 156 headless
- Modalidad: Frontend con autenticacion mock y API simulada

## Resultado consolidado

- Specs ejecutadas: 5
- Pruebas ejecutadas: 5
- PASS: 5
- FAIL: 0
- Pendientes: 0
- Omitidas: 0
- Duracion: 30 segundos

## Escenarios ejecutados

| ID | Escenario | Resultado |
|---|---|---|
| HU33-FE-CATALOG-001 | Catalogo y seleccion | PASS |
| HU33-FE-GENERATE-001 | Generacion de inscritos | PASS |
| HU33-FE-FILTER-001 | Filtros y resultados | PASS |
| HU33-FE-EXPORT-001 | Exportacion PDF y CSV | PASS |
| HU33-FE-AUTH-001 | Restricciones y errores | PASS |

## Comportamientos verificados

- Visualizacion de examenes autorizados.
- Seleccion de examen desde el catalogo.
- Acceso a tipos de reporte permitidos.
- Generacion y visualizacion de inscritos.
- Aplicacion de filtros por materia y periodo.
- Aplicacion de intervalos de fechas.
- Solicitudes de exportacion PDF y CSV.
- Validacion de formato y metadatos de descarga.
- Rechazo de exportaciones inconsistentes.
- Manejo de respuesta HTTP 403 simulada.
- Ocultamiento de resultados ante acceso denegado.

## Evidencias

- Especificaciones: cypress/e2e/sprint3/hu33/
- Capturas: cypress/screenshots/
- Videos: cypress/videos/
- Descargas simuladas: cypress/downloads/

## Incidencias de automatizacion

Durante la preparacion se corrigio la comprobacion
de solicitudes HTTP canceladas y se completaron
los encabezados de la respuesta simulada de exportacion.

No se realizaron cambios funcionales al frontend.

La ultima ejecucion consolidada obtuvo
5 PASS y 0 FAIL.

## Limitaciones

- Autenticacion y API simuladas.
- Sin validacion integrada de Laravel y PostgreSQL.
- El PDF simulado no es un PDF completo.
- No se verifico el contenido de archivos reales
  generados por el backend.
- No equivale a una prueba de seguridad real.
- Los TC oficiales requieren trazabilidad y cierre.

## Conclusion

HU33 supero su ejecucion consolidada de frontend:
5 PASS, 0 FAIL y 0 omitidas.
