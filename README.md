# DevFlow - Jira Workflow Automation for VS Code

Automatiza flujos de trabajo de Jira directamente desde VS Code, interactuando con Copilot Chat.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│              VS Code Extension               │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ React        │  │ Flow Engine          │  │
│  │ Webview UI   │◄─►  - Step executor     │  │
│  │ (config,     │  │  - Agent selector    │  │
│  │  flows,      │  │  - Variable resolver │  │
│  │  dashboard)  │  │  - Output formatter  │  │
│  └─────────────┘  └──────────┬───────────┘  │
│                              │               │
│  ┌──────────────┐  ┌────────▼───────────┐   │
│  │ Copilot Chat │  │ Jira Integration   │   │
│  │ Integration  │  │  - REST API client │   │
│  │ (agents,     │  │  - Issue reader    │   │
│  │  prompts)    │  │  - Comment writer  │   │
│  └──────────────┘  └────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ Knowledge Base (analysis, context)   │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

## Tech Stack

- **Extension Host**: TypeScript + VS Code Extension API
- **UI**: React (webview panels)
- **Jira**: REST API v3 (Atlassian)
- **Copilot**: VS Code Chat Participant API
- **Storage**: JSON/YAML files locales + workspace state

## Quick Start

```bash
cd devflow-extension
npm install
npm run compile
# F5 en VS Code para lanzar Extension Development Host
```

## Instalación en otro equipo

### Opción A: Instalar desde .vsix (recomendado)

1. **Genera el paquete** (en el equipo de desarrollo):
   ```bash
   cd devflow-extension
   npm install
   npm run compile
   npx vsce package --allow-missing-repository
   ```
   Esto genera `devflow-0.1.0.vsix`.

2. **Copia el `.vsix`** al otro equipo (USB, email, OneDrive, etc.)

3. **Instala en VS Code**:
   - Abre VS Code → **Ctrl+Shift+P** → `Extensions: Install from VSIX...`
   - Selecciona el archivo `devflow-0.1.0.vsix`
   - Reinicia VS Code

### Opción B: Instalar desde el repositorio

```bash
git clone https://github.com/RubenGimenezMartinez/devflow.git
cd devflow/devflow-extension
npm install
npm run compile
npx vsce package --allow-missing-repository
# Instala el .vsix generado con Ctrl+Shift+P → "Extensions: Install from VSIX..."
```

### Opción C: Modo desarrollo (para depurar)

1. Clona el repo y abre la carpeta `devflow` en VS Code
2. `cd devflow-extension && npm install`
3. Pulsa **F5** para lanzar en modo debug

## Uso de la Extensión

### 1. Arrancar en modo desarrollo

1. Abre la carpeta `devflow` en VS Code
2. Pulsa **F5** — se abre una segunda ventana (Extension Development Host)
3. En esa ventana puedes abrir cualquier proyecto de trabajo

### 2. Comandos disponibles

Abre la Command Palette (**Ctrl+Shift+P**) y busca "DevFlow":

| Comando | Descripción |
|---------|-------------|
| `DevFlow: Start Flow from Jira Issue` | Inicia un flujo pidiendo la key del issue |
| `DevFlow: Open Dashboard` | Abre el panel visual con flujos y progreso |
| `DevFlow: Configure Flows` | Abre el dashboard en modo configuración |

### 3. Chat con Copilot (@devflow)

Abre el chat de Copilot (**Ctrl+Alt+I**) y usa estos comandos:

| Comando | Ejemplo | Descripción |
|---------|---------|-------------|
| `/flow <KEY>` | `@devflow /flow DEMO-1` | Inicia flujo para un issue |
| `/next` | `@devflow /next` | Avanza al siguiente paso |
| `/back` | `@devflow /back` | Retrocede al paso anterior |
| `/status` | `@devflow /status` | Muestra estado del flujo activo |
| _(texto libre)_ | `@devflow el error está en calculateDiscount()` | Envía input al paso actual |

### 4. Flujo típico completo

```
@devflow /flow DEMO-1          → Carga issue, detecta tipo Bug, inicia flujo
@devflow /next                  → Analiza causa raíz
@devflow /next                  → Propone solución
@devflow /next                  → Implementación
@devflow /next                  → Genera: comentario Jira + release notes + knowledge base
```

### 5. Issues de demo (sin Jira)

Si no configuras Jira, la extensión funciona en **modo demo** con estos issues:

| Key | Tipo | Descripción |
|-----|------|-------------|
| `DEMO-1` | Bug | Error en cálculo de descuentos con dos cupones |
| `DEMO-2` | Story | Exportar pedidos en PDF |
| `DEMO-3` | Improvement | Mejorar rendimiento de listado de productos |

### 6. Configurar Jira (opcional)

En Settings de VS Code:
- `devflow.jira.baseUrl` → URL de tu Jira (ej: `https://tu-org.atlassian.net`)
- `devflow.jira.email` → Tu email de Jira
- Al primer uso te pedirá el **API token** (se guarda en Secret Storage)

### 7. Configurar flujos

Los flujos se definen en archivos YAML en `flows/`. Cada flujo tiene:
- **triggerTypes**: tipos de issue que activan el flujo (Bug, Story, Improvement...)
- **steps**: pasos secuenciales con instrucciones, agente, inputs/outputs
- **variables**: datos que se leen de Jira + variables derivadas del análisis

Puedes activar/desactivar pasos individuales con `enabled: true/false`.

## Estructura del Proyecto

```
devflow/
├── .github/copilot-instructions.md    # Instrucciones globales Copilot
├── .vscode/                           # Config del workspace
├── docs/                              # Documentación de arquitectura
├── knowledge-base/                    # Base de conocimiento acumulativa
├── flows/                             # Definiciones de flujos (YAML)
├── prompts/                           # Prompts reutilizables
├── devflow-extension/                 # VS Code Extension (MVP)
│   ├── src/
│   │   ├── extension.ts               # Entry point
│   │   ├── jira/                      # Jira API client
│   │   ├── flows/                     # Flow engine
│   │   ├── agents/                    # Agent definitions
│   │   ├── webview/                   # React UI
│   │   └── knowledge/                 # Knowledge base manager
│   └── package.json
└── README.md
```
