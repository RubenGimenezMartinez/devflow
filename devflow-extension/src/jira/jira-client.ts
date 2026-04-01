import * as vscode from 'vscode';
import { JiraIssue, JiraComment, JiraIssueType } from './types';

export class JiraClient {
    private baseUrl = '';
    private email = '';
    private apiToken = '';

    constructor(private readonly context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('devflow.jira');
        this.baseUrl = config.get<string>('baseUrl', '').replace(/\/$/, '');
        this.email = config.get<string>('email', '');
    }

    /** Ensure API token is available (from secret storage) */
    private async getToken(): Promise<string> {
        if (this.apiToken) { return this.apiToken; }

        const stored = await this.context.secrets.get('devflow.jira.apiToken');
        if (stored) {
            this.apiToken = stored;
            return stored;
        }

        const token = await vscode.window.showInputBox({
            prompt: 'Enter your Jira API token',
            password: true,
            ignoreFocusOut: true
        });

        if (!token) {
            throw new Error('Jira API token is required');
        }

        await this.context.secrets.store('devflow.jira.apiToken', token);
        this.apiToken = token;
        return token;
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        if (!this.baseUrl) {
            throw new Error('Jira base URL not configured. Set devflow.jira.baseUrl in settings.');
        }

        const token = await this.getToken();
        const auth = Buffer.from(`${this.email}:${token}`).toString('base64');

        const url = `${this.baseUrl}/rest/api/3${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Jira API error ${response.status}: ${errorText}`);
        }

        return response.json() as Promise<T>;
    }

    /** Get a Jira issue by key */
    async getIssue(issueKey: string): Promise<JiraIssue> {
        return this.request<JiraIssue>(`/issue/${encodeURIComponent(issueKey)}`);
    }

    /** Add a comment to an issue */
    async addComment(issueKey: string, comment: JiraComment): Promise<void> {
        await this.request(`/issue/${encodeURIComponent(issueKey)}/comment`, {
            method: 'POST',
            body: JSON.stringify(comment)
        });
    }

    /** Get available issue types for a project */
    async getIssueTypes(projectKey: string): Promise<JiraIssueType[]> {
        const result = await this.request<JiraIssueType[]>(
            `/project/${encodeURIComponent(projectKey)}/statuses`
        );
        return result;
    }

    /** Check if connection is valid */
    async testConnection(): Promise<boolean> {
        try {
            await this.request('/myself');
            return true;
        } catch {
            return false;
        }
    }
}
