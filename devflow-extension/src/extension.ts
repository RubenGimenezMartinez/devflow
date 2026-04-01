import * as vscode from "vscode";
import { FlowEngine } from "./flows/flow-engine";
import { JiraClient } from "./jira/jira-client";
import { KnowledgeManager } from "./knowledge/knowledge-manager";
import { DevFlowChatParticipant } from "./agents/chat-participant";
import { DashboardPanel } from "./webview/dashboard-panel";

export function activate(context: vscode.ExtensionContext): void {
  const jiraClient = new JiraClient(context);
  const knowledgeManager = new KnowledgeManager(context);
  const flowEngine = new FlowEngine(context, jiraClient, knowledgeManager);
  const chatParticipant = new DevFlowChatParticipant(flowEngine, jiraClient);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("devflow.startFlow", async () => {
      const issueKey = await vscode.window.showInputBox({
        prompt: "Enter Jira issue key (e.g., PROJ-123)",
        placeHolder: "PROJ-123",
      });
      if (issueKey) {
        await flowEngine.startFlowForIssue(issueKey);
      }
    }),

    vscode.commands.registerCommand("devflow.openDashboard", () => {
      DashboardPanel.createOrShow(context, flowEngine);
    }),

    vscode.commands.registerCommand("devflow.configureFlows", () => {
      DashboardPanel.createOrShow(context, flowEngine, "configure");
    }),
  );

  // Register chat participant
  chatParticipant.register(context);

  console.log("DevFlow extension activated");
}

export function deactivate(): void {
  // cleanup
}
