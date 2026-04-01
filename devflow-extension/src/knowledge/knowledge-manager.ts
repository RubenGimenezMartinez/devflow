import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class KnowledgeManager {
    private readonly knowledgePath: string;

    constructor(private readonly context: vscode.ExtensionContext) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const config = vscode.workspace.getConfiguration('devflow');
        const kbRelPath = config.get<string>('knowledgeBasePath', './knowledge-base');
        this.knowledgePath = workspaceFolders
            ? path.resolve(workspaceFolders[0].uri.fsPath, kbRelPath)
            : '';
    }

    /** Append an entry to a knowledge base file */
    async addEntry(category: string, entry: KnowledgeEntry): Promise<void> {
        const filePath = path.join(this.knowledgePath, `${category}.md`);
        const formatted = this.formatEntry(entry);

        if (fs.existsSync(filePath)) {
            fs.appendFileSync(filePath, '\n' + formatted, 'utf-8');
        } else {
            const header = `# ${this.capitalize(category)}\n\nAutomatic knowledge base - updated by DevFlow.\n\n`;
            fs.writeFileSync(filePath, header + formatted, 'utf-8');
        }
    }

    /** Read all entries from a category */
    readCategory(category: string): string {
        const filePath = path.join(this.knowledgePath, `${category}.md`);
        if (!fs.existsSync(filePath)) { return ''; }
        return fs.readFileSync(filePath, 'utf-8');
    }

    /** Search knowledge base for relevant content */
    search(query: string): SearchResult[] {
        if (!fs.existsSync(this.knowledgePath)) { return []; }

        const results: SearchResult[] = [];
        const files = fs.readdirSync(this.knowledgePath).filter(f => f.endsWith('.md'));
        const queryLower = query.toLowerCase();

        for (const file of files) {
            const content = fs.readFileSync(path.join(this.knowledgePath, file), 'utf-8');
            if (content.toLowerCase().includes(queryLower)) {
                results.push({
                    category: file.replace('.md', ''),
                    content,
                    relevance: this.calculateRelevance(content, queryLower)
                });
            }
        }

        return results.sort((a, b) => b.relevance - a.relevance);
    }

    private formatEntry(entry: KnowledgeEntry): string {
        return `## ${entry.title}\n\n` +
            `**Source:** ${entry.sourceIssue}\n` +
            `**Date:** ${new Date().toISOString().split('T')[0]}\n\n` +
            `${entry.content}\n\n---\n`;
    }

    private calculateRelevance(content: string, query: string): number {
        const words = query.split(/\s+/);
        const contentLower = content.toLowerCase();
        return words.filter(w => contentLower.includes(w)).length / words.length;
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
    }
}

export interface KnowledgeEntry {
    title: string;
    sourceIssue: string;
    content: string;
    tags?: string[];
}

export interface SearchResult {
    category: string;
    content: string;
    relevance: number;
}
