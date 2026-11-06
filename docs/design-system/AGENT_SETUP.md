# Configuración de agentes

Cómo usar esta documentación con Claude Code y OpenCode sin duplicar reglas.

## Qué es compartido y qué es local

| Tipo | Archivos | En git | Quién lo mantiene |
|---|---|---|---|
| **A. Documentación compartida** | `docs/design-system/**` | Sí | Los dos frontend, mediante PR revisada |
| **B. Claude Code (local)** | `CLAUDE.md`, `AGENTS.md`, `.claude/skills/**`, `docs/ai/**` | No | Cada desarrollador en su máquina |
| **C. OpenCode (local)** | `AGENTS.md`, `opencode.json`, `.opencode/**` | No | Cada desarrollador en su máquina |

Los archivos de B y C están excluidos con `.git/info/exclude`, que es local de cada
clon. Cada desarrollador debe añadir esas mismas líneas en su propio clon:

```
/AGENTS.md
/CLAUDE.md
/.claude/
/.opencode/
/docs/ai/
/opencode.json
```

**No publicar los archivos locales:** no hacer `git add` de ellos, no copiarlos dentro de
`docs/design-system/` y no forzar su inclusión. Pueden contener rutas de máquina,
checkpoints personales o instrucciones que solo valen para quien los escribió.

## Principio: las reglas viven una sola vez

Las reglas de diseño están en `docs/design-system/` (A). La configuración local (B y C)
**solo remite** a esos archivos y a la sección necesaria; no copia su contenido. Así,
los dos agentes y los dos desarrolladores aplican las mismas reglas y gastan menos
tokens al leer.

Orden de lectura recomendado para un agente: [README.md](README.md) →
[rules.md](rules.md) → la sección necesaria de [tokens.md](tokens.md) o
[components.md](components.md) → [validation.md](validation.md) al cerrar.

## Claude Code (B)

- `CLAUDE.md` importa `AGENTS.md` (reglas generales del repositorio: git, límites y metodología por etapas).
- Skills locales en `.claude/skills/`: `eida-audit`, `eida-frontend` y `eida-testing`.
- Para trabajo de diseño, `AGENTS.md` o una Skill deben indicar que se lean
  `docs/design-system/rules.md` y la sección correspondiente de los demás documentos.
- Planificado (SK4, pendiente de aprobación): una Skill `eida-design-system` breve que
  solo remita a estos documentos.

## OpenCode (C)

- OpenCode carga `AGENTS.md` de la raíz como instrucciones del proyecto. El mismo
  `AGENTS.md` sirve para ambos agentes; mantenerlo agnóstico (sin depender de
  herramientas exclusivas de un agente).
- `opencode.json` puede declarar archivos de instrucciones adicionales (por ejemplo
  `docs/design-system/rules.md`). **Verificar** el nombre y formato de esa opción en la
  versión de OpenCode instalada antes de usarla.
- **Skills en OpenCode: no asumir compatibilidad.** Antes de reutilizar las Skills de
  `.claude/skills/`, comprobar en la documentación de la versión instalada si OpenCode
  las admite y desde qué carpeta las lee. Si no las admite, basta con `AGENTS.md` y las
  instrucciones de `opencode.json`.
- Planificado (SK4): un `opencode.json` mínimo que apunte a `rules.md`, una vez verificado.

## Puesta en marcha para el segundo desarrollador

1. Clonar el repositorio y cambiar a la rama de trabajo asignada (creada desde `test/design-system-global`).
2. Añadir las exclusiones locales de la sección anterior en `.git/info/exclude`.
3. Crear su `AGENTS.md` local (y `CLAUDE.md` si usa Claude Code), remitiendo a `docs/design-system/`.
4. Leer [README.md](README.md) y [PROGRESS.md](PROGRESS.md), y tomar una subetapa asignada.
5. Trabajar en `ds/<etapa>-<iniciales>` y abrir una PR hacia `test/design-system-global`.
