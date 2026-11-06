# Configuración de agentes

Cómo usar esta documentación con Claude Code y OpenCode, con las mismas reglas para
los dos frontend y sin duplicarlas.

## Regla obligatoria: FRONTEND ÚNICAMENTE

Ningún agente modifica backend, base de datos, endpoints ni contratos API,
autenticación, autorización o permisos, lógica de negocio ni configuración de
despliegue. Si una mejora visual lo requiere, se detiene, documenta el bloqueo y pide
autorización. Esta regla debe figurar en la configuración local de cada desarrollador
(ver más abajo).

## Fuente única de reglas visuales

Las reglas de diseño viven solo en `docs/design-system/` (versionado):
[README.md](README.md), [rules.md](rules.md), [tokens.md](tokens.md),
[components.md](components.md), [validation.md](validation.md) y
[PROGRESS.md](PROGRESS.md). La configuración local de los agentes **remite** a estos
archivos y no copia su contenido.

## Qué es compartido y qué es local

| Tipo | Archivos | En git | Quién lo mantiene |
|---|---|---|---|
| **A. Documentación compartida** | `docs/design-system/**` | Sí | Los dos frontend, mediante PR revisada |
| **B. Configuración de agentes (local)** | `AGENTS.md`, `CLAUDE.md`, `.claude/skills/**`, `docs/ai/**` | No | Cada desarrollador en su máquina |
| **C. Configuración propia de OpenCode (local)** | `opencode.json`, `.opencode/**` | No | Hoy no se usa (ver "OpenCode") |

### `.git/info/exclude` es local

Los archivos de B y C se excluyen con `.git/info/exclude`, que **no se comparte por
git**: cada clon tiene el suyo. Cada desarrollador debe añadir en su propio clon:

```
/AGENTS.md
/CLAUDE.md
/.claude/
/.opencode/
/docs/ai/
/opencode.json
```

Por lo mismo, la configuración local **no llega al otro desarrollador por git**: hay
que crearla en cada máquina. Nunca hacer `git add` de esos archivos, copiarlos dentro
de `docs/design-system/` ni forzar su inclusión. Comprobación:
`git check-ignore -v AGENTS.md .claude/skills/eida-design-system/SKILL.md`
debe indicar `.git/info/exclude` en ambos.

## Configuración local esperada (B)

- **`AGENTS.md`** (raíz): reglas generales del repositorio (git, límites, metodología
  por etapas D0 → D1 → D2), la regla **FRONTEND ÚNICAMENTE**, una línea que remita a
  `docs/design-system/` y la lista de Skills.
- **`CLAUDE.md`** (raíz): importa `AGENTS.md` (`@AGENTS.md`).
- **Skills** en `.claude/skills/<nombre>/SKILL.md`:

| Skill | Uso |
|---|---|
| `eida-audit` | Diagnóstico D0, de solo lectura |
| `eida-frontend` | Implementación autorizada; para tareas visuales remite a `eida-design-system` |
| `eida-testing` | Validación (Node, browser en secuencia con `browserProfile`, ESLint y build) |
| `eida-design-system` | Trabajo visual: estilos, UI, responsive, accesibilidad y etapas DS1–DS4 |

`eida-design-system` es una sola Skill para los dos agentes. Contenido mínimo
(sin copiar las reglas):

- *Frontmatter* con `name: eida-design-system`, igual al nombre de la carpeta, y una
  `description` que diga qué hace y cuándo usarla (palabras clave: estilos, CSS,
  tokens, componentes visuales, responsive, accesibilidad, DS1–DS4) y cuándo **no**
  (backend, API, datos, autenticación, permisos).
- La regla FRONTEND ÚNICAMENTE.
- El orden de lectura: `PROGRESS.md` → `rules.md` → `components.md` → la tabla necesaria
  de `tokens.md` → `validation.md`.
- Metodología D0 → D1 → D2, delegando en `eida-audit`, `eida-frontend` y `eida-testing`.
- Actualizar `PROGRESS.md` solo en implementaciones autorizadas.

## Claude Code

- Lee `CLAUDE.md` (que importa `AGENTS.md`) y las Skills de `.claude/skills/` del proyecto.
- Comprobado: la Skill `eida-design-system` aparece en la lista de Skills disponibles
  en cuanto se crea su `SKILL.md`.

## OpenCode — verificado con la versión 1.19.5

Comprobado el 2026-11-06 con **OpenCode 1.19.5** en Windows. No se asume el mismo
comportamiento en otras versiones: tras actualizar OpenCode, repetir la verificación.

- **Skills del proyecto:** `opencode debug skill`, ejecutado en la raíz del repositorio,
  lista las Skills de `.claude/skills/` del proyecto (`eida-audit`, `eida-frontend`,
  `eida-testing`, `eida-design-system`). La misma Skill sirve, por tanto, para Claude
  Code y OpenCode, sin duplicarla en `.opencode/`.
- **Requisitos del *frontmatter*** según la documentación integrada de 1.19.5: `name`
  en minúsculas con guiones (máximo 64 caracteres) e igual al nombre de la carpeta;
  `description` obligatoria (sin ella la Skill se descarta).
- **Configuración:** no se usa `opencode.json` en este proyecto. Si alguna vez se crea,
  declarar `"$schema": "https://opencode.ai/config.json"`: en 1.19.5 una clave
  desconocida impide arrancar. La configuración no se recarga en caliente: reiniciar
  OpenCode tras cambiarla.
- **No verificado en esta etapa:** si OpenCode carga `AGENTS.md` automáticamente en
  este proyecto. Hasta comprobarlo, no depender de ello: las reglas críticas
  (FRONTEND ÚNICAMENTE y la remisión a `docs/design-system/`) están también dentro de
  la Skill `eida-design-system`.

### Verificar la Skill en OpenCode

Desde la raíz del repositorio:

```
opencode --version        # versión instalada
opencode debug skill      # debe incluir "eida-design-system" con location en .claude/skills/
```

### Advertencia: Skills globales

En 1.19.5, OpenCode también carga automáticamente las Skills globales de
`~/.claude/skills/` (en la máquina verificada: Skills sincronizadas de Claude como
computer-use, chrome-browser o docs). Algunas dependen de herramientas que OpenCode
no tiene y podrían activarse por error. Revisar la salida de `opencode debug skill` y,
ante una activación inesperada, indicar al agente qué Skill de EIDA usar.

## Puesta en marcha para el segundo frontend

1. Clonar el repositorio y crear la rama de trabajo asignada desde
   `origin/test/design-system-global` (`ds/<etapa>-<iniciales>`).
2. Añadir las exclusiones de `.git/info/exclude` indicadas arriba.
3. Crear localmente `AGENTS.md`, `CLAUDE.md` (si usa Claude Code) y las cuatro Skills de
   `.claude/skills/`. Se pueden copiar de un compañero **fuera de git** y revisar, o
   crear a partir de la estructura mínima descrita en esta página.
4. Verificar: `git status` no debe mostrar ninguno de esos archivos; en OpenCode,
   `opencode debug skill` debe listar las cuatro Skills de EIDA.
5. Leer [README.md](README.md) y [PROGRESS.md](PROGRESS.md), y tomar una subetapa asignada.
6. Trabajar en la rama propia y abrir una PR hacia `test/design-system-global`.
