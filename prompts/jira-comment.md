# Prompt: Generar Comentario de Jira

Genera un comentario formateado para Jira con el resultado del análisis/resolución.

## Formato de salida

```
{panel:title=📋 Análisis Técnico|borderColor=#4C9AFF|bgColor=#F4F5F7}

h3. Causa / Contexto
{{analysis}}

h3. Solución Aplicada
{{solution}}

h3. Archivos Modificados
||Archivo||Cambio||
{{#each files}}
|{{this.path}}|{{this.description}}|
{{/each}}

h3. Tests
{{testSummary}}

h3. Notas de Release
{{releaseNotes}}

{panel}
```

## Reglas

- Usa formato wiki de Jira (no Markdown)
- Sé conciso pero completo
- Incluye links a PRs/commits si están disponibles
- Incluye versión donde estará disponible
