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
