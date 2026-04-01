# DevFlow - Copilot Instructions

Estás trabajando en **DevFlow**, una extensión de VS Code que automatiza flujos de trabajo de Jira.

## Contexto del Proyecto

- Extensión VS Code con TypeScript
- UI en React (webview panels)
- Integración con Jira REST API v3
- Integración con VS Code Copilot Chat Participant API
- Flujos configurables por tipo de tarea (bug, historia, mejora, etc.)

## Convenciones

- TypeScript estricto, sin `any`
- Interfaces para todos los contratos entre módulos
- Configuración en YAML (flujos, pasos, variables)
- Nombrar archivos en kebab-case
- Componentes React en PascalCase
- Usar async/await, nunca callbacks
- Errores tipados con clases custom

## Arquitectura Clave

### Flow Engine

El motor de flujos ejecuta pasos secuenciales. Cada paso tiene:

- `id`: identificador único
- `name`: nombre descriptivo
- `agent`: agente de Copilot a usar (o default)
- `instructions`: prompt/instrucciones para ese paso
- `inputs`: variables de entrada (del paso anterior o de Jira)
- `outputs`: variables de salida
- `conditions`: condiciones para avanzar/retroceder
- `enabled`: si el paso está activo

### Jira Integration

- Lee issues via REST API (reemplaza el XML manual)
- Escribe comentarios automáticos
- Lee tipos de tarea, estados, campos custom
- Gestiona versiones y release notes

### Knowledge Base

- Archivos markdown estructurados en `knowledge-base/`
- Se actualiza automáticamente tras cada análisis
- Contiene: reglas de negocio, dependencias, configuración, patrones

## Archivos Importantes

- `flows/*.yaml` — Definiciones de flujos
- `prompts/*.md` — Prompts reutilizables
- `knowledge-base/` — Conocimiento acumulado
- `devflow-extension/src/` — Código fuente de la extensión
