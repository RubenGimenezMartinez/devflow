import * as vscode from 'vscode';
import { FlowEngine } from '../flows/flow-engine';
import { JiraClient } from '../jira/jira-client';
import { KnowledgeManager } from '../knowledge/knowledge-manager';

export class DevFlowChatParticipant {
    constructor(
        private readonly flowEngine: FlowEngine,
        private readonly jiraClient: JiraClient,
        private readonly knowledgeManager: KnowledgeManager
    ) {}

    register(context: vscode.ExtensionContext): void {
        const participant = vscode.chat.createChatParticipant('devflow.chat', this.handleRequest.bind(this));
        participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.svg');
        context.subscriptions.push(participant);
    }

    private async handleRequest(
        request: vscode.ChatRequest,
        _chatContext: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const prompt = request.prompt.trim();

        if (prompt.startsWith('/flow ')) {
            const issueKey = prompt.replace('/flow ', '').trim();
            await this.handleStartFlow(issueKey, stream, token);
            return;
        }
        if (prompt === '/next') { await this.handleNextStep(stream, token); return; }
        if (prompt === '/back') { this.handleGoBack(stream); return; }
        if (prompt === '/status') { this.handleStatus(stream); return; }

        await this.handleStepInput(prompt, stream, token);
    }

    private async handleStartFlow(issueKey: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
        try {
            const demoMode = this.jiraClient.isDemoMode();
            if (demoMode) {
                stream.markdown(`🧪 **Demo mode** (no Jira configured)\n\n`);
            }
            stream.markdown(`🔄 Loading issue **${issueKey}**...\n\n`);
            await this.flowEngine.startFlowForIssue(issueKey);

            const execution = this.flowEngine.getActiveExecution();
            const step = this.flowEngine.getCurrentStep();

            if (execution && step) {
                stream.markdown(`✅ Flow **${execution.flowName}** started\n\n`);
                stream.markdown(`### Step 1: ${step.name}\n\n`);

                // Execute first step automatically with Copilot
                await this.executeStepWithCopilot(step.instructions, stream, token);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            stream.markdown(`❌ Error: ${message}\n`);
        }
    }

    private async handleNextStep(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
        const currentStep = this.flowEngine.getCurrentStep();
        const nextStep = await this.flowEngine.advanceStep({
            stepId: currentStep?.id ?? '',
            status: 'success',
            outputs: {},
            timestamp: new Date().toISOString()
        });

        if (nextStep) {
            const execution = this.flowEngine.getActiveExecution();
            const stepNum = (execution?.history.length ?? 0) + 1;
            stream.markdown(`### Step ${stepNum}: ${nextStep.name}\n\n`);
            await this.executeStepWithCopilot(nextStep.instructions, stream, token);
        } else {
            await this.handleFlowComplete(stream, token);
        }
    }

    private handleGoBack(stream: vscode.ChatResponseStream): void {
        const prevStep = this.flowEngine.goBack();
        if (prevStep) {
            stream.markdown(`⬅️ Back to: **${prevStep.name}**\n\n`);
            const interpolated = this.flowEngine.interpolate(prevStep.instructions);
            stream.markdown(interpolated + '\n\n');
            stream.markdown('_Send your input or use `/next` to advance._\n');
        } else {
            stream.markdown('Cannot go back from this step.\n');
        }
    }

    private handleStatus(stream: vscode.ChatResponseStream): void {
        const execution = this.flowEngine.getActiveExecution();
        if (!execution) {
            stream.markdown('No active flow. Use `/flow DEMO-1` to start one.\n');
            stream.markdown('Available demo issues: `DEMO-1` (Bug), `DEMO-2` (Story), `DEMO-3` (Improvement)\n');
            return;
        }

        const step = this.flowEngine.getCurrentStep();
        const flow = this.flowEngine.getAllFlows().find(f => f.name === execution.flowName);
        const totalSteps = flow?.steps.filter(s => s.enabled).length ?? 0;

        stream.markdown(`## Flow Status\n\n`);
        stream.markdown(`| | |\n|---|---|\n`);
        stream.markdown(`| **Flow** | ${execution.flowName} |\n`);
        stream.markdown(`| **Issue** | ${execution.issueKey} |\n`);
        stream.markdown(`| **Status** | ${execution.status} |\n`);
        stream.markdown(`| **Current Step** | ${step?.name ?? 'N/A'} |\n`);
        stream.markdown(`| **Progress** | ${execution.history.length}/${totalSteps} |\n`);
    }

    private async handleStepInput(input: string, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
        const execution = this.flowEngine.getActiveExecution();
        if (!execution) {
            stream.markdown('No active flow. Use `/flow DEMO-1` to start one.\n');
            return;
        }

        const step = this.flowEngine.getCurrentStep();
        if (!step) { return; }

        // Build prompt with step instructions + user input
        const interpolated = this.flowEngine.interpolate(step.instructions);
        const fullPrompt = `${interpolated}\n\n**User input:** ${input}`;

        stream.markdown(`Processing **${step.name}**...\n\n`);
        await this.executeStepWithCopilot(fullPrompt, stream, token);
        stream.markdown('\n\n---\n_Use `/next` to advance, `/back` to go back, or provide more input._\n');
    }

    /** Execute a prompt using Copilot's Language Model API */
    private async executeStepWithCopilot(
        instructions: string,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const interpolated = this.flowEngine.interpolate(instructions);

        // Get relevant knowledge base context
        const execution = this.flowEngine.getActiveExecution();
        const issueKey = execution?.issueKey ?? '';
        const knowledgeContext = this.knowledgeManager.search(issueKey)
            .slice(0, 3)
            .map(r => r.content)
            .join('\n\n');

        const systemPrompt = [
            'You are DevFlow, an AI assistant that helps developers process Jira issues through structured workflows.',
            'You analyze issues, propose solutions, and generate documentation in the requested format.',
            'Be concise and actionable. Use markdown formatting.',
            knowledgeContext ? `\nRelevant knowledge base context:\n${knowledgeContext}` : ''
        ].join('\n');

        try {
            const [model] = await vscode.lm.selectChatModels({ family: 'gpt-4o' });
            if (!model) {
                stream.markdown('> ⚠️ No language model available. Showing instructions only.\n\n');
                stream.markdown(interpolated + '\n');
                return;
            }

            const messages = [
                vscode.LanguageModelChatMessage.User(systemPrompt),
                vscode.LanguageModelChatMessage.User(interpolated)
            ];

            const response = await model.sendRequest(messages, {}, token);
            for await (const chunk of response.text) {
                stream.markdown(chunk);
            }
        } catch (error) {
            if (error instanceof vscode.CancellationError) { return; }
            stream.markdown('> ⚠️ Could not access language model. Showing instructions:\n\n');
            stream.markdown(interpolated + '\n');
        }
    }

    /** Handle flow completion: generate outputs */
    private async handleFlowComplete(stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<void> {
        const execution = this.flowEngine.getActiveExecution();
        if (!execution) { return; }

        stream.markdown('## ✅ Flow Completed!\n\n');

        // Generate Jira comment
        stream.markdown('### Jira Comment\n\n');
        const commentPrompt = this.flowEngine.interpolate(
            'Generate a structured Jira comment summarizing the analysis and resolution for issue {{jira.key}}. ' +
            'Include: root cause, impact, solution applied, and tests. Use Jira wiki markup format.'
        );
        await this.executeStepWithCopilot(commentPrompt, stream, token);

        // Generate release notes
        stream.markdown('\n\n### Release Notes\n\n');
        const releasePrompt = this.flowEngine.interpolate(
            'Generate a concise release notes entry for issue {{jira.key}}. ' +
            'Format: one-line summary suitable for a CHANGELOG.'
        );
        await this.executeStepWithCopilot(releasePrompt, stream, token);

        // Update knowledge base
        try {
            this.knowledgeManager.addEntry('patterns', {
                title: `Analysis: ${execution.issueKey}`,
                sourceIssue: execution.issueKey,
                content: `Flow "${execution.flowName}" completed. Steps: ${execution.history.length}.`
            });
            stream.markdown('\n\n✅ Knowledge base updated.\n');
        } catch {
            stream.markdown('\n\n⚠️ Could not update knowledge base.\n');
        }
    }
}
