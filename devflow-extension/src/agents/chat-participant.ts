import * as vscode from 'vscode';
import { FlowEngine } from '../flows/flow-engine';
import { JiraClient } from '../jira/jira-client';

export class DevFlowChatParticipant {
    constructor(
        private readonly flowEngine: FlowEngine,
        private readonly jiraClient: JiraClient
    ) {}

    register(context: vscode.ExtensionContext): void {
        const participant = vscode.chat.createChatParticipant('devflow.chat', this.handleRequest.bind(this));
        participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.svg');
        context.subscriptions.push(participant);
    }

    private async handleRequest(
        request: vscode.ChatRequest,
        chatContext: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const prompt = request.prompt.trim();

        // Command: start flow
        if (prompt.startsWith('/flow ')) {
            const issueKey = prompt.replace('/flow ', '').trim();
            await this.handleStartFlow(issueKey, stream);
            return;
        }

        // Command: next step
        if (prompt === '/next') {
            await this.handleNextStep(stream);
            return;
        }

        // Command: go back
        if (prompt === '/back') {
            await this.handleGoBack(stream);
            return;
        }

        // Command: show status
        if (prompt === '/status') {
            this.handleStatus(stream);
            return;
        }

        // Default: process current step with user input
        await this.handleStepInput(prompt, stream);
    }

    private async handleStartFlow(issueKey: string, stream: vscode.ChatResponseStream): Promise<void> {
        try {
            stream.markdown(`🔄 Starting flow for **${issueKey}**...\n\n`);
            await this.flowEngine.startFlowForIssue(issueKey);

            const execution = this.flowEngine.getActiveExecution();
            const step = this.flowEngine.getCurrentStep();

            if (execution && step) {
                stream.markdown(`✅ Flow **${execution.flowName}** started\n\n`);
                stream.markdown(`## Current Step: ${step.name}\n\n`);
                stream.markdown(step.instructions + '\n');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            stream.markdown(`❌ Error: ${message}\n`);
        }
    }

    private async handleNextStep(stream: vscode.ChatResponseStream): Promise<void> {
        const nextStep = await this.flowEngine.advanceStep({
            stepId: this.flowEngine.getCurrentStep()?.id ?? '',
            status: 'success',
            outputs: {},
            timestamp: new Date().toISOString()
        });

        if (nextStep) {
            stream.markdown(`## Next Step: ${nextStep.name}\n\n`);
            stream.markdown(nextStep.instructions + '\n');
        } else {
            stream.markdown('✅ Flow completed!\n');
        }
    }

    private async handleGoBack(stream: vscode.ChatResponseStream): Promise<void> {
        const prevStep = this.flowEngine.goBack();
        if (prevStep) {
            stream.markdown(`⬅️ Back to: **${prevStep.name}**\n\n`);
            stream.markdown(prevStep.instructions + '\n');
        } else {
            stream.markdown('Cannot go back from this step.\n');
        }
    }

    private handleStatus(stream: vscode.ChatResponseStream): void {
        const execution = this.flowEngine.getActiveExecution();
        if (!execution) {
            stream.markdown('No active flow. Use `/flow PROJ-123` to start one.\n');
            return;
        }

        const step = this.flowEngine.getCurrentStep();
        stream.markdown(`## Flow Status\n\n`);
        stream.markdown(`- **Flow:** ${execution.flowName}\n`);
        stream.markdown(`- **Issue:** ${execution.issueKey}\n`);
        stream.markdown(`- **Status:** ${execution.status}\n`);
        stream.markdown(`- **Current Step:** ${step?.name ?? 'N/A'}\n`);
        stream.markdown(`- **Completed Steps:** ${execution.history.length}\n`);
    }

    private async handleStepInput(input: string, stream: vscode.ChatResponseStream): Promise<void> {
        const execution = this.flowEngine.getActiveExecution();
        if (!execution) {
            stream.markdown('No active flow. Use `/flow PROJ-123` to start a flow, or `/status` to check.\n');
            return;
        }

        const step = this.flowEngine.getCurrentStep();
        if (!step) { return; }

        stream.markdown(`Processing step **${step.name}** with your input...\n\n`);
        stream.markdown(`> Agent: \`${step.agent}\`\n\n`);
        stream.markdown('Use `/next` to advance or `/back` to return.\n');
    }
}
