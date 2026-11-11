# Plan de pruebas funcionales con escritura (D7)

Estado: **preparado, no ejecutado**. Ninguna petición de escritura (POST, PUT, PATCH o DELETE) se ejecuta sin una autorización específica que nombre el entorno, los registros afectados y su reversión. Sin revisión humana; revisión técnica asistida por IA.

## 1. Entorno

| Elemento | Valor verificado (2026-11-07) |
|---|---|
| Frontend | Vite local `http://localhost:5173`, rama `ds/sync-arqmoc-erick` |
| Backend | Laravel local `127.0.0.1:8000`, checkout `Dev_Hector` `a69dae4`, 154 rutas `api` |
| Backend con el contrato completo | `origin/main` `ca126a6` (25 commits por delante de `Dev_Hector` local, más 1). Incluye 3 migraciones nuevas |
| Sesión | Inicio manual en un Chrome con perfil temporal; el agente no ve ni registra credenciales |
| Datos | Solo datos de prueba ya existentes: oferta «DEMO EIDA Taller de Ingenieria de Software» (3 inscritos) y aulas `DEMO-EIDA-AULA-A`, `DEMO-EIDA-AULA-B` y `DEV-AULA-1` |

## 2. Requisito previo (bloqueante, fuera del frontend)

Los pasos 5 a 7 usan rutas que **no existen** en el backend local: asistencia, infracciones, expulsiones, incidencias, anulación de ingresos, reportes y offline. La comprobación anónima de esas rutas devuelve 404 «route could not be found»; las rutas existentes devuelven 401. Antes de esos pasos, el responsable del backend debe:

1. Actualizar el checkout local a `origin/main` (`ca126a6`) o a la rama acordada. El árbol tiene 2 archivos sin seguimiento ajenos a esta tarea (`PortalServicesDefenseSeeder.php` y su prueba), que deben conservarse.
2. Aplicar las 3 migraciones (`php artisan migrate`) **sobre una base de datos de desarrollo con copia de seguridad previa**. Esto es una escritura de esquema: requiere su propia autorización.
3. Volver a ejecutar la matriz de contratos (D7 D0) para confirmar 0 rutas ausentes.

## 3. Secuencia

Cada paso indica: acción en la interfaz → petición esperada → comprobación → reversión.

| # | Paso | Rol | Petición | Comprobación | Reversión |
|---|---|---|---|---|---|
| 1 | Programar un examen «QA-D7 <fecha>» en la oferta DEMO, aula `DEMO-EIDA-AULA-B`, fecha futura sin conflicto | Docente | `POST /course-offerings/{id}/exams` | 201; redirección a `/teacher/exams/{id}`; aviso de éxito; aparece en «Mis exámenes» | Paso 9 |
| 2 | Consultar el detalle | Docente | `GET /teacher/exams/{id}` | Datos iguales a los enviados, hora `HH:MM:00`, migas, un `<main>` | — |
| 3 | Reprogramar: +30 min, misma aula | Docente | `PATCH /teacher/exams/{id}` | 200; detalle actualizado; error 422 visible si hay conflicto | Restaurar la hora con otro `PATCH` |
| 4 | Habilitaciones: ver inscritos; marcar y desmarcar a un estudiante de prueba | Docente | `GET /exams/{id}/eligibilities`, `PATCH /exams/{id}/eligibilities/{student}` ×2 | El estado cambia y vuelve; las reglas de validación son las que imponga el backend | El segundo `PATCH` restaura el estado |
| 5 | Colaborador: añadir y quitar un docente de prueba | Docente | `POST` y `DELETE /exams/{id}/collaborators/{user}` | Aparece y desaparece en la lista | `DELETE` del mismo colaborador |
| 6 | Asistencia, infracciones, expulsiones e incidencias (**requiere §2**) | Docente | `GET` de cada módulo. Crear una infracción, una incidencia o una expulsión solo con autorización aparte | Estados vacío, carga y error; navegación entre las pestañas del examen | Las infracciones admiten `PATCH …/status` (contrato de `origin/main`); incidencias, expulsiones y anulaciones no tienen `DELETE` ni `PATCH` en el contrato: se consideran **irreversibles** |
| 7 | Offline (**requiere §2**): preparar el reparto y descargar el paquete | Docente | `POST /exams/{id}/offline/prepare`, `GET …/package` | Versión 1 congelada; `indexedDb.browser` como referencia | No hay «despreparar» en el contrato: **irreversible** |
| 8 | Rol estudiante: perfil, QR del examen y foto | Estudiante de prueba inscrito | `GET /students/exams`, `GET /students/exams/{id}/qr`, `GET /students/profile` | El QR solo aparece si el estudiante está habilitado; la foto llega como blob | Ninguna (lectura). Subir foto es `POST /students/profile/photo`: solo con autorización |
| 9 | Cancelar el examen de prueba | Docente | `POST /teacher/exams/{id}/cancel` | Estado cancelado; deja de aparecer como próximo | Ver §4 |

## 4. Limpieza y riesgos

- **No existe `DELETE` de exámenes.** La cancelación conserva el registro, que queda como «QA-D7 … (cancelado)» en la base de datos de desarrollo. Para borrarlo del todo hace falta una operación del responsable del backend sobre la BD (no disponible desde el frontend).
- Incidencias, expulsiones, anulaciones de ingreso y la preparación offline son **irreversibles** según el contrato: ejecutarlas solo en la BD de desarrollo y con autorización explícita para cada una.
- Registros de ingreso (`POST …/entry-control/students/{id}/entries`) y QR (`POST …/entry-control/qr`): crean auditoría permanente. Se excluyen salvo autorización.
- No usar cuentas reales de terceros. Estudiante y colaborador deben ser cuentas de prueba creadas para este fin. Ninguna credencial publicada en el repositorio (deuda conocida en `hu41.browser.mjs`) puede usarse.
- Las acciones de borrado o cambio de estado de usuarios, estudiantes, docentes y aulas, y las importaciones CSV reales, quedan fuera del plan.

## 5. Ejecución y evidencia

- Mismo método de D6: CDP con registro de cada petición (método, ruta con ids enmascarados, estado). El bloqueo de escrituras se desactiva **solo** para las peticiones autorizadas de cada paso.
- Antes del paso 1: captura de la lista de exámenes del docente (0 exámenes en D6). Después del paso 9: misma captura y lista de registros creados para limpiarlos.
- Resultado por paso: PASS, FAIL o BLOQUEADO, sin mezclar resultados simulados con resultados del backend real.

## 6. Autorización que se solicitará

> Entorno: backend local `127.0.0.1:8000` con su BD de desarrollo. Registros: 1 examen «QA-D7 …» en la oferta DEMO; 2 cambios de habilitación (ida y vuelta); 1 alta y baja de colaborador de prueba. Reversión: `PATCH` y `DELETE` inversos; el examen queda **cancelado**, no borrado. Pasos 6 y 7 solo tras la actualización del backend (§2) y con autorización aparte.
