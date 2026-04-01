# Prompt: Generar Release Notes

Genera una entrada de release notes para la funcionalidad/fix implementado.

## Formato

### [{{issueType}}] {{jiraKey}} - {{summary}}

**Versión:** {{fixVersion}}
**Componente:** {{components}}

#### Descripción

{{userFacingDescription}}

#### Cambios Técnicos

- {{technicalChanges}}

#### Impacto

- **Breaking changes:** {{breakingChanges}}
- **Migración necesaria:** {{migration}}
- **Config nueva:** {{newConfig}}

## Reglas

- La descripción debe ser comprensible para usuarios no técnicos
- Los cambios técnicos son para el equipo de desarrollo
- Si no hay breaking changes, omitir esa sección
