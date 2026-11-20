# Navegación web del personal

Cambio local sobre main, HEAD 8c25db4e0f81c4b09b1f82dd27ba76cb4d78dcb9.
Se conservaron los cambios existentes y su preparación en Git. El ajuste afecta únicamente
al frontend: no añade permisos, cambia su alcance ni modifica autorización o contratos de Laravel.

## Comportamiento

- El login de una cuenta con solo roles personalizados termina en /, el Inicio existente.
- Si must_change_password está activo, se conserva /cambiar-contrasena-inicial; después del
  guardado y de refrescar /me se navega al Inicio.
- /home y las guardas reutilizan getHomeRouteForUser, cuyo fallback ahora es /.
- /personal queda como Navigate replace a / dentro de la guarda autenticada existente.
  StaffHomePage y su menú de botones se retiran porque ya no tienen consumidores.
- La Home conserva su contenido institucional y público. Una cuenta sin permisos operativos
  puede permanecer allí, ver su identidad y cerrar sesión.
- Los destinos base permanecen iguales: Administrador /, Docente /docente, Estudiante /.
  También se conservan sus opciones y accesos de perfil/cuenta y sus prioridades multirrol.

## Header compartido

La navegación se construye con los permisos efectivos de /me y los controles existentes de
getModuleAccess/getRoomAccess. Se consume en AppLayout y, para el personal, PublicAuthLayout.
Header y HeaderNavigation siguen siendo los componentes comunes de escritorio y móvil.
No se introducen estilos ni variantes de header por rol.

| Permisos efectivos del módulo | Acceso visible |
| --- | --- |
| Solo Consultar | Consultar [módulo], al listado existente |
| Solo Crear | Crear [módulo], directamente a /create |
| Consultar + Crear | Grupo del módulo con dos enlaces independientes: Consultar y Crear |
| Solo Editar | Ningún enlace genérico en el header; se conserva el editor por URL con ID |
| Sin permisos operativos | Inicio y navegación pública, identidad y cierre de sesión |

Se retira el enlace Mi cuenta a /personal del contexto visual staff. El menú normal de la
identidad y su confirmación de cierre de sesión se mantienen. Los grupos, acciones y estilos
de los roles base permanecen en su configuración actual. El personal no recibe importación,
cambios de estado o un listado para descubrir un ID por tener permiso de escritura.

## Rutas reutilizadas

| Módulo | Consultar | Crear | Editar por enlace |
| --- | --- | --- | --- |
| Aulas | /admin/rooms | /admin/rooms/create | /admin/rooms/:roomId/edit |
| Materias | /admin/subjects | /admin/subjects/create | /admin/subjects/:recordId/edit |
| Periodos | /admin/academic-terms | /admin/academic-terms/create | /admin/academic-terms/:recordId/edit |
| Carreras | /admin/careers | No existe una acción delegada | No existe una acción delegada |
| Ofertas | /admin/teachers/assignments | Reservado al administrador por los controles actuales | Reservado al administrador por los controles actuales |

No se modifican las guardas por acción. La autorización final continúa en Laravel.
Los formularios sin consulta vuelven a su Inicio al guardar o cancelar. Las migas de pan y
retornos del personal dejan de señalar el menú retirado; los destinos administrativos
existentes se conservan. Para cuentas con un rol base y permisos adicionales se usa su ruta
de Inicio actual, por ejemplo /docente.

## Archivos del ajuste

Rutas relativas a oidevs-examenes-frontend. StaffHomePage.tsx es el archivo eliminado.

- `src/app/router/router.tsx`
- `src/features/academic-terms/pages/AdminAcademicTermsPage.tsx`
- `src/features/auth/components/PublicAuthLayout.tsx`
- `src/features/auth/tests/staffNavigation.integration.test.mjs`
- `src/features/auth/utils/authRoutes.ts`
- `src/features/course-offerings/pages/AdminCourseOfferingsPage.tsx`
- `src/features/roles/pages/CatalogWorkspacePage.tsx`
- `src/features/roles/tests/academicCatalogPermissions.integration.test.mjs`
- `src/features/roles/tests/roleManagement.integration.test.mjs`
- `src/features/roles/utils/delegatedNavigation.ts`
- `src/features/rooms/pages/AdminRoomsPage.tsx`
- `src/features/rooms/pages/RoomWorkspacePage.tsx`
- `src/features/rooms/pages/RoomWritePage.tsx`
- `src/features/rooms/tests/roomPermissions.integration.test.mjs`
- `src/features/subjects/pages/AdminSubjectsPage.tsx`
- `src/features/users/pages/StaffHomePage.tsx`
- `src/layouts/AppLayout/AppLayout.tsx`
- `src/shared/components/Header/headerNavigation.config.ts`
- `src/shared/tests/headerNavigation.test.mjs`
- `src/shared/tests/sourceHarness.mjs`

Este documento: docs/STAFF_NAVIGATION.md.

## Pruebas añadidas o ajustadas

- staffNavigation.integration.test.mjs: login con y sin permisos, primer cambio de contraseña
  y regreso al Inicio, guardas, Home sin redirecciones, alias /personal, solo Crear,
  Consultar + Crear, edición con ID, retirada de permisos, header a 1280/390 px, selección
  de enlaces/cierre del menú, logout, auth layout y regresión de roles base/perfil.
- Las pruebas de roles, catálogos académicos, Aulas y header se ajustan al nuevo Inicio y a
  los enlaces por acción. Ya no importan ni esperan la pantalla StaffHomePage.
- sourceHarness expone su ventana simulada para controlar matchMedia en las pruebas del
  header real. Los componentes y handlers se prueban con hooks, DOM y red simulados;
  estos casos no reemplazan una revisión visual en navegador.

No se ejecutaron tests, builds, typecheck ni despliegues. Solo se realizó revisión estática,
comprobación de sintaxis JavaScript de los archivos de prueba y git diff --check.

Validación posterior recomendada, sin ejecutar en esta entrega:

1. node --test src/features/auth/tests/staffNavigation.integration.test.mjs
2. node --test src/shared/tests/headerNavigation.test.mjs
3. node --test src/features/roles/tests/roleManagement.integration.test.mjs
4. node --test src/features/roles/tests/academicCatalogPermissions.integration.test.mjs
5. node --test src/features/rooms/tests/roomPermissions.integration.test.mjs
6. Revisar en navegador escritorio y móvil: login, cambio inicial, Inicio sin permisos,
   grupos de acciones, cierre por selección/Escape, foco, confirmación de logout y
   redirección de enlaces antiguos. Confirmar en la red que Crear no consulta listados.
