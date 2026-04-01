import * as vscode from 'vscode';
import { FlowEngine } from '../flows/flow-engine';
import { FlowDefinition } from '../flows/types';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly context: vscode.ExtensionContext,
        private readonly flowEngine: FlowEngine
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getHtml();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(
            (msg) => this.handleMessage(msg),
            null,
            this.disposables
        );

        this.flowEngine.onFlowUpdate((execution) => {
            this.panel.webview.postMessage({ type: 'flowUpdate', data: execution });
        });
    }

    static createOrShow(
        context: vscode.ExtensionContext,
        flowEngine: FlowEngine,
        view?: string
    ): void {
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal();
            if (view) {
                DashboardPanel.currentPanel.panel.webview.postMessage({ type: 'navigate', view });
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'devflowDashboard',
            'DevFlow Dashboard',
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, context, flowEngine);
        if (view) {
            panel.webview.postMessage({ type: 'navigate', view });
        }
    }

    private async handleMessage(message: { type: string; data?: unknown }): Promise<void> {
        switch (message.type) {
            case 'getFlows':
                this.panel.webview.postMessage({
                    type: 'flows',
                    data: this.flowEngine.getAllFlows()
                });
                break;

            case 'startFlow': {
                const issueKey = message.data as string;
                await this.flowEngine.startFlowForIssue(issueKey);
                break;
            }

            case 'getExecution':
                this.panel.webview.postMessage({
                    type: 'execution',
                    data: this.flowEngine.getActiveExecution()
                });
                break;

            case 'reloadFlows':
                this.flowEngine.reloadFlows();
                this.panel.webview.postMessage({
                    type: 'flows',
                    data: this.flowEngine.getAllFlows()
                });
                break;
        }
    }

    private getHtml(): string {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DevFlow Dashboard</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 16px;
            margin: 0;
        }
        h1 { font-size: 1.4em; margin-bottom: 16px; }
        h2 { font-size: 1.1em; margin-top: 24px; }
        .card {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
        }
        .step { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
        .step-badge {
            width: 24px; height: 24px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: bold;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .step-badge.active { background: var(--vscode-statusBarItem-prominentBackground); }
        .step-badge.done { background: #28a745; }
        .step-name { flex: 1; }
        .toggle { cursor: pointer; }
        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none; padding: 6px 14px;
            border-radius: 4px; cursor: pointer;
            margin-right: 8px;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        input {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 10px; border-radius: 4px;
        }
        .section { margin-bottom: 24px; }
        #status { padding: 8px; margin-top: 8px; }
    </style>
</head>
<body>
    <h1>⚡ DevFlow Dashboard</h1>

    <div class="section">
        <div style="display:flex;gap:8px;align-items:center;">
            <input id="issueKey" placeholder="PROJ-123" />
            <button onclick="startFlow()">Start Flow</button>
            <button onclick="reloadFlows()">↻ Reload</button>
        </div>
        <div id="status"></div>
    </div>

    <h2>Configured Flows</h2>
    <div id="flowList"></div>

    <h2>Active Execution</h2>
    <div id="execution" class="card">No active flow</div>

    <script>
        const vscode = acquireVsCodeApi();

        function startFlow() {
            const key = document.getElementById('issueKey').value;
            if (key) vscode.postMessage({ type: 'startFlow', data: key });
        }
        function reloadFlows() { vscode.postMessage({ type: 'reloadFlows' }); }

        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.type === 'flows') renderFlows(msg.data);
            if (msg.type === 'execution' || msg.type === 'flowUpdate') renderExecution(msg.data);
            if (msg.type === 'navigate') { /* future: switch panels */ }
        });

        function renderFlows(flows) {
            const el = document.getElementById('flowList');
            if (!flows || flows.length === 0) {
                el.innerHTML = '<div class="card">No flows configured</div>';
                return;
            }
            el.innerHTML = flows.map(f =>
                '<div class="card">' +
                '<strong>' + f.name + '</strong><br>' +
                '<small>' + f.description + '</small><br>' +
                '<small>Triggers: ' + f.triggerTypes.join(', ') + '</small>' +
                '<div style="margin-top:8px">' +
                f.steps.map((s, i) =>
                    '<div class="step">' +
                    '<span class="step-badge">' + (i+1) + '</span>' +
                    '<span class="step-name">' + s.name + '</span>' +
                    '<span class="toggle">' + (s.enabled ? '✅' : '⬜') + '</span>' +
                    '</div>'
                ).join('') +
                '</div></div>'
            ).join('');
        }

        function renderExecution(exec) {
            const el = document.getElementById('execution');
            if (!exec) { el.innerHTML = 'No active flow'; return; }
            el.innerHTML =
                '<strong>' + exec.flowName + '</strong> — ' + exec.issueKey + '<br>' +
                'Status: <strong>' + exec.status + '</strong><br>' +
                'Current step: ' + exec.currentStepId + '<br>' +
                'Steps completed: ' + exec.history.length;
        }

        // Initial load
        vscode.postMessage({ type: 'getFlows' });
        vscode.postMessage({ type: 'getExecution' });
    </script>
</body>
</html>`;
    }

    private dispose(): void {
        DashboardPanel.currentPanel = undefined;
        this.panel.dispose();
        for (const d of this.disposables) { d.dispose(); }
        this.disposables = [];
    }
}
