import * as vscode from 'vscode';

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface Tool {
    name: string;
    description: string;
    execute: (...args: any[]) => Promise<ToolResult>;
}

export interface ReadFileTool extends Tool {
    name: 'readFile';
    execute: (filePath: string) => Promise<ToolResult>;
}

export interface WriteFileTool extends Tool {
    name: 'writeFile';
    execute: (filePath: string, content: string) => Promise<ToolResult>;
}

export interface ListFilesTool extends Tool {
    name: 'listFiles';
    execute: (directoryPath: string) => Promise<ToolResult>;
}

export interface SearchCodeTool extends Tool {
    name: 'searchCode';
    execute: (query: string, filePattern?: string) => Promise<ToolResult>;
}

export interface RunCommandTool extends Tool {
    name: 'runCommand';
    execute: (command: string) => Promise<ToolResult>;
}

export type AgentTool = ReadFileTool | WriteFileTool | ListFilesTool | SearchCodeTool | RunCommandTool;


export interface ToolsProvider {
    getTools(): AgentTool[];
    getTool(name: string): AgentTool | undefined;
}

export interface ExecutionResult {
    success: boolean;
    response?: string;
    error?: string;
}

export interface ExecutionProgress {
    readonly onProgress: vscode.Event<string>;
    report(message: string): void;
}


export interface Task {
    query: string;
    context?: string;
    requiresGeneration?: boolean; // should generation follow analysis?
}

export interface SubTask {
    id: string;
    type: 'analysis' | 'generation';
    description: string;
    task: string;
    context?: string;
    dependsOn?: string[];
}

export enum TaskType {
    ANALYSIS = 'executeAnalysisTask',
    GENERATION = 'executeGenerationTask',
    ANALYSIS_WITH_GENERATION = 'executeAnalysisWithGeneration',
    IRRELEVANT = 'handleIrrelevantQuery'
}

export enum SubtaskType {
    ANALYSIS = 'analysis',
    GENERATION = 'generation',
}

// WorkspaceManager
export interface FileChange {
    filePath: string;
    originalContent?: string;
    newContent: string;
    operation: 'create' | 'modify' | 'delete';
} 