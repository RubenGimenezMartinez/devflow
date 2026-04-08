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
                this.panel.webview.postMessage({
                    type: 'execution',
                    data: this.flowEngine.getActiveExecution()
                });
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

            case 'toggleStep': {
                const { flowName, stepId } = message.data as { flowName: string; stepId: string };
                this.flowEngine.toggleStep(flowName, stepId);
                this.panel.webview.postMessage({
                    type: 'flows',
                    data: this.flowEngine.getAllFlows()
                });
                break;
            }

            case 'updateInstructions': {
                const { flowName, stepId, instructions } = message.data as { flowName: string; stepId: string; instructions: string };
                this.flowEngine.updateStepInstructions(flowName, stepId, instructions);
                break;
            }

            case 'updateAgent': {
                const { flowName, stepId, agent } = message.data as { flowName: string; stepId: string; agent: string };
                this.flowEngine.updateStepAgent(flowName, stepId, agent);
                this.panel.webview.postMessage({
                    type: 'flows',
                    data: this.flowEngine.getAllFlows()
                });
                break;
            }
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
        * { box-sizing: border-box; }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 0; margin: 0;
        }
        .header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex; align-items: center; justify-content: space-between;
        }
        .header h1 { margin: 0; font-size: 1.3em; }
        .toolbar { display: flex; gap: 8px; align-items: center; }
        .content { padding: 16px 20px; }
        .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--vscode-widget-border); padding: 0 20px; }
        .tab {
            padding: 8px 16px; cursor: pointer; border-bottom: 2px solid transparent;
            color: var(--vscode-foreground); opacity: 0.7;
        }
        .tab:hover { opacity: 1; }
        .tab.active { border-bottom-color: var(--vscode-focusBorder); opacity: 1; font-weight: bold; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        .card {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px; padding: 14px; margin-bottom: 12px;
        }
        .card-header {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 8px;
        }
        .card-header h3 { margin: 0; font-size: 1em; }
        .badge {
            display: inline-block; padding: 2px 8px; border-radius: 10px;
            font-size: 11px; font-weight: bold;
        }
        .badge-trigger {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            margin-right: 4px;
        }

        .step-row {
            display: flex; align-items: center; gap: 10px;
            padding: 8px; margin: 4px 0; border-radius: 4px;
            border: 1px solid transparent;
            transition: background 0.15s;
        }
        .step-row:hover { background: var(--vscode-list-hoverBackground); }
        .step-row.current { border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
        .step-row.done { opacity: 0.7; }
        .step-row.disabled { opacity: 0.4; }

        .step-num {
            width: 28px; height: 28px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: bold; flex-shrink: 0;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        .step-num.current { background: var(--vscode-statusBarItem-prominentBackground, #007acc); color: #fff; }
        .step-num.done { background: #28a745; color: #fff; }

        .step-info { flex: 1; min-width: 0; }
        .step-title { font-weight: 500; }
        .step-agent { font-size: 11px; opacity: 0.7; }
        .step-actions { display: flex; gap: 6px; align-items: center; }

        .toggle-btn {
            width: 36px; height: 20px; border-radius: 10px; border: none;
            cursor: pointer; position: relative; transition: background 0.2s;
        }
        .toggle-btn.on { background: #28a745; }
        .toggle-btn.off { background: var(--vscode-input-border, #555); }
        .toggle-btn::after {
            content: ''; position: absolute; top: 2px;
            width: 16px; height: 16px; border-radius: 50%;
            background: #fff; transition: left 0.2s;
        }
        .toggle-btn.on::after { left: 18px; }
        .toggle-btn.off::after { left: 2px; }

        .icon-btn {
            background: none; border: none; cursor: pointer;
            color: var(--vscode-foreground); font-size: 14px; padding: 4px;
            opacity: 0.6; border-radius: 4px;
        }
        .icon-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

        button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        input, textarea, select {
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 10px; border-radius: 4px; font-family: inherit;
        }
        textarea { width: 100%; min-height: 100px; resize: vertical; font-size: 12px; }
        select { padding: 5px 8px; }

        .exec-progress { margin-top: 12px; }
        .progress-bar {
            height: 6px; border-radius: 3px; background: var(--vscode-input-border);
            overflow: hidden; margin: 8px 0;
        }
        .progress-fill {
            height: 100%; background: var(--vscode-statusBarItem-prominentBackground, #007acc);
            border-radius: 3px; transition: width 0.3s;
        }

        .modal-overlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.5); z-index: 100;
            justify-content: center; align-items: center;
        }
        .modal-overlay.open { display: flex; }
        .modal {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px; padding: 20px; width: 90%; max-width: 600px;
            max-height: 80vh; overflow-y: auto;
        }
        .modal h3 { margin-top: 0; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; margin-bottom: 4px; font-weight: 500; font-size: 12px; }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

        .empty { text-align: center; padding: 32px; opacity: 0.6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ DevFlow</h1>
        <div class="toolbar">
            <input id="issueKey" placeholder="PROJ-123 or DEMO-1" style="width:140px" />
            <button onclick="startFlow()">▶ Start Flow</button>
            <button class="secondary" onclick="reloadFlows()">↻ Reload</button>
        </div>
    </div>

    <div class="tabs">
        <div class="tab active" data-tab="flows" onclick="switchTab('flows')">Flows</div>
        <div class="tab" data-tab="execution" onclick="switchTab('execution')">Execution</div>
    </div>

    <div class="content">
        <div id="tab-flows" class="tab-content active"></div>
        <div id="tab-execution" class="tab-content"></div>
    </div>

    <!-- Step editor modal -->
    <div id="modal" class="modal-overlay">
        <div class="modal">
            <h3 id="modalTitle">Edit Step</h3>
            <div class="form-group">
                <label>Agent</label>
                <select id="modalAgent">
                    <option value="default">default (Copilot)</option>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="claude-sonnet">claude-sonnet</option>
                    <option value="o3-mini">o3-mini</option>
                </select>
            </div>
            <div class="form-group">
                <label>Instructions</label>
                <textarea id="modalInstructions" rows="8"></textarea>
            </div>
            <div class="form-group">
                <label>Inputs</label>
                <input id="modalInputs" style="width:100%" readonly />
            </div>
            <div class="form-group">
                <label>Outputs</label>
                <input id="modalOutputs" style="width:100%" readonly />
            </div>
            <div class="modal-actions">
                <button class="secondary" onclick="closeModal()">Cancel</button>
                <button onclick="saveModal()">Save</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let allFlows = [];
        let currentExec = null;
        let editingStep = null; // { flowName, stepId }

        function startFlow() {
            const key = document.getElementById('issueKey').value.trim();
            if (key) {
                vscode.postMessage({ type: 'startFlow', data: key });
                switchTab('execution');
            }
        }
        function reloadFlows() { vscode.postMessage({ type: 'reloadFlows' }); }

        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
            if (tab === 'execution') vscode.postMessage({ type: 'getExecution' });
        }

        function toggleStep(flowName, stepId) {
            vscode.postMessage({ type: 'toggleStep', data: { flowName, stepId } });
        }

        function editStep(flowName, stepId) {
            const flow = allFlows.find(f => f.name === flowName);
            if (!flow) return;
            const step = flow.steps.find(s => s.id === stepId);
            if (!step) return;
            editingStep = { flowName, stepId };
            document.getElementById('modalTitle').textContent = 'Edit: ' + step.name;
            document.getElementById('modalAgent').value = step.agent || 'default';
            document.getElementById('modalInstructions').value = step.instructions || '';
            document.getElementById('modalInputs').value = (step.inputs || []).join(', ');
            document.getElementById('modalOutputs').value = (step.outputs || []).join(', ');
            document.getElementById('modal').classList.add('open');
        }

        function closeModal() {
            document.getElementById('modal').classList.remove('open');
            editingStep = null;
        }

        function saveModal() {
            if (!editingStep) return;
            const instructions = document.getElementById('modalInstructions').value;
            const agent = document.getElementById('modalAgent').value;
            vscode.postMessage({
                type: 'updateInstructions',
                data: { flowName: editingStep.flowName, stepId: editingStep.stepId, instructions }
            });
            vscode.postMessage({
                type: 'updateAgent',
                data: { flowName: editingStep.flowName, stepId: editingStep.stepId, agent }
            });
            closeModal();
        }

        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.type === 'flows') { allFlows = msg.data || []; renderFlows(); }
            if (msg.type === 'execution' || msg.type === 'flowUpdate') { currentExec = msg.data; renderExecution(); }
        });

        function renderFlows() {
            const el = document.getElementById('tab-flows');
            if (!allFlows.length) {
                el.innerHTML = '<div class="empty">No flows configured. Check your flows/ directory.</div>';
                return;
            }
            el.innerHTML = allFlows.map(f => {
                const triggers = f.triggerTypes.map(t => '<span class="badge badge-trigger">' + esc(t) + '</span>').join(' ');
                const steps = f.steps.map((s, i) => {
                    const cls = s.enabled ? '' : ' disabled';
                    return '<div class="step-row' + cls + '">' +
                        '<span class="step-num">' + (i + 1) + '</span>' +
                        '<div class="step-info">' +
                            '<div class="step-title">' + esc(s.name) + '</div>' +
                            '<div class="step-agent">Agent: ' + esc(s.agent || 'default') + '</div>' +
                        '</div>' +
                        '<div class="step-actions">' +
                            '<button class="icon-btn" title="Edit step" onclick="editStep(\\''+esc(f.name)+'\\',\\''+esc(s.id)+'\\')">✏️</button>' +
                            '<button class="toggle-btn ' + (s.enabled ? 'on' : 'off') + '" title="Toggle" onclick="toggleStep(\\''+esc(f.name)+'\\',\\''+esc(s.id)+'\\')"></button>' +
                        '</div></div>';
                }).join('');

                return '<div class="card">' +
                    '<div class="card-header"><h3>' + esc(f.name) + '</h3><div>' + triggers + '</div></div>' +
                    '<p style="margin:0 0 10px;font-size:12px;opacity:0.8">' + esc(f.description) + '</p>' +
                    steps + '</div>';
            }).join('');
        }

        function renderExecution() {
            const el = document.getElementById('tab-execution');
            if (!currentExec) {
                el.innerHTML = '<div class="empty">No active flow.<br>Enter an issue key above and click Start Flow.</div>';
                return;
            }

            const flow = allFlows.find(f => f.name === currentExec.flowName);
            const enabledSteps = flow ? flow.steps.filter(s => s.enabled) : [];
            const total = enabledSteps.length;
            const done = currentExec.history.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            const statusColors = { running: '#007acc', completed: '#28a745', paused: '#e2a100', error: '#d73a49' };
            const statusColor = statusColors[currentExec.status] || '#888';

            let stepsHtml = '';
            if (flow) {
                stepsHtml = flow.steps.filter(s => s.enabled).map((s, i) => {
                    const isDone = currentExec.history.some(h => h.stepId === s.id);
                    const isCurrent = s.id === currentExec.currentStepId;
                    const cls = isCurrent ? ' current' : isDone ? ' done' : '';
                    const numCls = isCurrent ? ' current' : isDone ? ' done' : '';
                    const icon = isDone ? '✓' : (i + 1);
                    return '<div class="step-row' + cls + '">' +
                        '<span class="step-num' + numCls + '">' + icon + '</span>' +
                        '<div class="step-info"><div class="step-title">' + esc(s.name) + '</div></div>' +
                        (isCurrent ? '<span style="font-size:11px;opacity:0.7">◀ current</span>' : '') +
                        '</div>';
                }).join('');
            }

            el.innerHTML =
                '<div class="card">' +
                '<div class="card-header">' +
                    '<h3>' + esc(currentExec.flowName) + '</h3>' +
                    '<span class="badge" style="background:' + statusColor + ';color:#fff">' + currentExec.status + '</span>' +
                '</div>' +
                '<p style="margin:4px 0;font-size:13px">Issue: <strong>' + esc(currentExec.issueKey) + '</strong></p>' +
                '<div class="exec-progress">' +
                    '<div style="display:flex;justify-content:space-between;font-size:12px">' +
                        '<span>Progress</span><span>' + done + ' / ' + total + ' steps (' + pct + '%)</span>' +
                    '</div>' +
                    '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
                '</div>' +
                stepsHtml +
                '</div>';
        }

        function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

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
