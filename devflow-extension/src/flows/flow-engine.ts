import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { parse as parseYaml } from "yaml";
import { FlowDefinition, FlowExecution, FlowStep, StepResult } from "./types";
import { JiraClient } from "../jira/jira-client";
import { KnowledgeManager } from "../knowledge/knowledge-manager";

export class FlowEngine {
  private flows: Map<string, FlowDefinition> = new Map();
  private activeExecution: FlowExecution | undefined;
  private readonly onFlowUpdateEmitter =
    new vscode.EventEmitter<FlowExecution>();
  public readonly onFlowUpdate = this.onFlowUpdateEmitter.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly jiraClient: JiraClient,
    private readonly knowledgeManager: KnowledgeManager,
  ) {
    this.loadFlows();
  }

  /** Load all flow definitions from YAML files */
  private loadFlows(): void {
    const dirs: string[] = [];

    // 1. Bundled flows (shipped with the extension)
    const extensionFlowsDir = path.join(this.context.extensionPath, '..', '..', 'flows');
    const bundledFlowsDir = path.join(this.context.extensionPath, 'flows');
    if (fs.existsSync(bundledFlowsDir)) {
      dirs.push(bundledFlowsDir);
    } else if (fs.existsSync(extensionFlowsDir)) {
      dirs.push(extensionFlowsDir);
    }

    // 2. Workspace flows (user-configured path)
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      const config = vscode.workspace.getConfiguration("devflow");
      const flowsRelPath = config.get<string>("flowsPath", "./flows");
      const workspaceFlowsDir = path.resolve(workspaceFolders[0].uri.fsPath, flowsRelPath);
      if (fs.existsSync(workspaceFlowsDir) && !dirs.includes(workspaceFlowsDir)) {
        dirs.push(workspaceFlowsDir);
      }
    }

    for (const flowsDir of dirs) {
      const files = fs
        .readdirSync(flowsDir)
        .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(flowsDir, file), "utf-8");
        const flow = parseYaml(content) as FlowDefinition;
        if (!this.flows.has(flow.name)) {
          this.flows.set(flow.name, flow);
        }
      }
    }
  }

  /** Find matching flow for an issue type */
  findFlowForType(issueType: string): FlowDefinition | undefined {
    for (const flow of this.flows.values()) {
      if (
        flow.triggerTypes.some(
          (t) => t.toLowerCase() === issueType.toLowerCase(),
        )
      ) {
        return flow;
      }
    }
    return undefined;
  }

  /** Start a flow for a Jira issue */
  async startFlowForIssue(issueKey: string): Promise<void> {
    const issue = await this.jiraClient.getIssue(issueKey);
    const issueType = issue.fields.issuetype.name;

    const flow = this.findFlowForType(issueType);
    if (!flow) {
      vscode.window.showWarningMessage(
        `No flow defined for issue type: ${issueType}`,
      );
      return;
    }

    const enabledSteps = flow.steps.filter((s) => s.enabled);
    if (enabledSteps.length === 0) {
      vscode.window.showWarningMessage("All steps are disabled in this flow");
      return;
    }

    this.activeExecution = {
      id: `exec-${Date.now()}`,
      flowName: flow.name,
      issueKey,
      currentStepId: enabledSteps[0].id,
      status: "running",
      variables: { jira: issue.fields },
      history: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.onFlowUpdateEmitter.fire(this.activeExecution);
    vscode.window.showInformationMessage(
      `Flow "${flow.name}" started for ${issueKey}`,
    );
  }

  /** Get current step */
  getCurrentStep(): FlowStep | undefined {
    if (!this.activeExecution) {
      return undefined;
    }
    const flow = this.flows.get(this.activeExecution.flowName);
    return flow?.steps.find(
      (s) => s.id === this.activeExecution?.currentStepId,
    );
  }

  /** Advance to next step */
  async advanceStep(result: StepResult): Promise<FlowStep | undefined> {
    if (!this.activeExecution) {
      return undefined;
    }

    const flow = this.flows.get(this.activeExecution.flowName);
    if (!flow) {
      return undefined;
    }

    this.activeExecution.history.push(result);
    Object.assign(this.activeExecution.variables, result.outputs);

    const currentStep = this.getCurrentStep();
    if (!currentStep?.conditions.next) {
      this.activeExecution.status = "completed";
      this.onFlowUpdateEmitter.fire(this.activeExecution);
      return undefined;
    }

    const nextStep = flow.steps.find(
      (s) => s.id === currentStep.conditions.next && s.enabled,
    );
    if (nextStep) {
      this.activeExecution.currentStepId = nextStep.id;
      this.activeExecution.updatedAt = new Date().toISOString();
      this.onFlowUpdateEmitter.fire(this.activeExecution);
    }
    return nextStep;
  }

  /** Go back to previous step */
  goBack(): FlowStep | undefined {
    if (!this.activeExecution) {
      return undefined;
    }

    const flow = this.flows.get(this.activeExecution.flowName);
    if (!flow) {
      return undefined;
    }

    const currentStep = this.getCurrentStep();
    if (!currentStep?.conditions.back) {
      return undefined;
    }

    const prevStep = flow.steps.find(
      (s) => s.id === currentStep.conditions.back && s.enabled,
    );
    if (prevStep) {
      this.activeExecution.currentStepId = prevStep.id;
      this.activeExecution.updatedAt = new Date().toISOString();
      this.onFlowUpdateEmitter.fire(this.activeExecution);
    }
    return prevStep;
  }

  getActiveExecution(): FlowExecution | undefined {
    return this.activeExecution;
  }

  /** Interpolate variables in a template string */
  interpolate(template: string, extraVars?: Record<string, unknown>): string {
    const vars = { ...this.activeExecution?.variables, ...extraVars };
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, keyPath: string) => {
      const parts = keyPath.split('.');
      let value: unknown = vars;
      for (const part of parts) {
        if (value === null || value === undefined || typeof value !== 'object') {
          return `{{${keyPath}}}`;
        }
        value = (value as Record<string, unknown>)[part];
      }
      if (value === null || value === undefined) {
        return `{{${keyPath}}}`;
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  }

  getAllFlows(): FlowDefinition[] {
    return Array.from(this.flows.values());
  }

  /** Toggle a step's enabled state */
  toggleStep(flowName: string, stepId: string): boolean {
    const flow = this.flows.get(flowName);
    if (!flow) { return false; }
    const step = flow.steps.find(s => s.id === stepId);
    if (!step) { return false; }
    step.enabled = !step.enabled;
    return step.enabled;
  }

  /** Update a step's instructions */
  updateStepInstructions(flowName: string, stepId: string, instructions: string): boolean {
    const flow = this.flows.get(flowName);
    if (!flow) { return false; }
    const step = flow.steps.find(s => s.id === stepId);
    if (!step) { return false; }
    step.instructions = instructions;
    return true;
  }

  /** Update a step's agent */
  updateStepAgent(flowName: string, stepId: string, agent: string): boolean {
    const flow = this.flows.get(flowName);
    if (!flow) { return false; }
    const step = flow.steps.find(s => s.id === stepId);
    if (!step) { return false; }
    step.agent = agent;
    return true;
  }

  reloadFlows(): void {
    this.flows.clear();
    this.loadFlows();
  }
}
