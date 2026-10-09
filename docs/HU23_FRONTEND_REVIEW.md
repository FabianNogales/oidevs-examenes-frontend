# HU23 — Revisión de frontend

## Implementado

- Ruta `/admin/subjects`: catálogo paginado, búsqueda código/nombre, filtros carrera/estado,
  estados de carga, error, vacío y reintento. Ruta protegida por el rol ADMINISTRADOR existente.
- Registro manual, detalle obtenido por ID, edición de código/nombre/carreras y cambio de estado
  con confirmación. Formulario con selección múltiple, validación, errores422 por campo y
  preservación de asociaciones históricas con carreras inactivas.
- Ruta `/admin/subjects/import`: plantilla UTF-8 BOM, selección/arrastre de archivo CSV hasta10MB,
  vista previa, confirmación e informe con filas importadas, omitidas y erróneas.
- Validación de encabezados y UTF-8; el servidor interpreta y valida el contenido de cada fila.
- Respuestas verificadas: contadores coherentes con filas, numeración única, estados permitidos,
  ID de preview idéntico al confirmar, subject_id numérico en filas importadas.
- Bloqueo síncrono contra doble envío; vista previa conservada para reintentar un fallo de confirmación.
  Errores409/410 obligan a validar nuevamente. Bloqueo de navegación SPA mientras procesa.
- Reutiliza paleta/tipografía global, layout administrador y estilos de importación de estudiantes/HU17.
  El ajuste de ancho mínimo se limita por CSS a páginas HU23; no cambia global.css.

## Comprobaciones realizadas

- Compilación TypeScript/Vite y lint global; revisión `git diff --check`.
- 12 casos de validación de formulario en parte2; 13 comprobaciones del cliente API con transporte
  simulado y8 de selector de carreras/validación final.
- 18 comprobaciones de CSV/reportes en parte3: BOM, UTF-8 inválido, extensión/tamaño,
  encabezados incorrectos, archivo vacío/sin filas, contadores inconsistentes, fila duplicada,
  estado incorrecto, ID de materia ausente y fecha de preview inválida.
- Navegador con componentes reales y API simulada en una pantalla temporal de QA:
  alta con doble clic produjo una sola petición; normalización de código; edición nombre/carreras;
  desactivación confirmada; CSV3filas (1válida,1omitida,1error); un único preview ante doble clic;
  fallo500 al confirmar conservó preview; reintento terminó con1importada,1omitida,1error;
  filtro de omitidas y regreso al catálogo. Sin conexión a la base de datos.
- Revisión responsive a375 y320px; se corrigió desbordamiento heredado del ancho mínimo global.

## Alcance pendiente de integración

La rama backend revisada no tiene los endpoints administrativos de HU23. Las pruebas con transporte
simulado verifican el frontend, no certifican persistencia, restricciones DB, permisos del servidor,
auditoría, transacciones, concurrencia ni conservación real del historial.

Las reglas que el backlog no precisa (límites de campos, asociación obligatoria y política de CSV para
códigos existentes/inactivos) siguen siendo propuestas de integración documentadas en
`HU23_BACKEND_CONTRACT.md`. Deben acordarse y probarse con el backend antes de declarar todos los CA cumplidos.

No se modificó el backend, la base ni los módulos de HU18. No se crearon commits.
