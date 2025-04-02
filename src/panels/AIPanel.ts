import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as config from '../config/index';
import { chatManager } from '../chat/ChatManager';
import { Agent } from '../agent/core/Agent';
import { ExecutionResult } from '../types/agent';
import type { Message } from '../types/chat';
import type { OpenAIMessage, OpenAIRequest, OpenAIResponse } from '../types/panel';
import { pendingFileChanges } from '../agent/utils/WorkspaceManager';

export class AIPanel {
    public static currentPanel: AIPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private static readonly _outputChannel = vscode.window.createOutputChannel('AI Assistant');
    private attachedFiles: Map<string, string> = new Map();
    private readonly _extensionPath: string;
    private _chat: chatManager;
    private readonly _agentExecutor: Agent;
    private _isAgentMode: boolean = false;
    
    private get _apiKey(): string {
        return config.getApiKey();
    }
    
    private get _model(): string {
        return config.getModel();
    }

    // PANEL INITIALIZATION AND CORE FUNCTIONALITY
    
    /**
     * Creates a new panel or shows an existing one
     */
    public static async createOrShow(extensionUri: vscode.Uri): Promise<AIPanel> {
        AIPanel._outputChannel.appendLine('Creating or showing AI panel...');

        // If we already have a panel, just reveal it
        if (AIPanel.currentPanel) {
            AIPanel.currentPanel._panel.reveal();
            return AIPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'aiAssistantPanel',
            'AI Assistant',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
            }
        );

        AIPanel.currentPanel = new AIPanel(panel, extensionUri);
        AIPanel._outputChannel.appendLine('AI panel created and initialized');
        return AIPanel.currentPanel;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionPath = extensionUri.fsPath;
        AIPanel._outputChannel.appendLine('Initializing AI Assistant panel...');
        
        this._chat = new chatManager(
            'You are a helpful AI assistant for VS Code. Help the user with coding tasks, explain concepts, and assist with problem-solving.'
        );
        
        try {
            this._agentExecutor = new Agent();
            
            this._agentExecutor.progress.onProgress(message => {
                this._sendMessage({
                    type: 'agentProgress',
                    content: message
                });
            });
        } catch (error) {
            AIPanel._outputChannel.appendLine(`Error initializing agent: ${error}`);
            throw error;
        }
        
        this._setupWebview(extensionUri);
        
        this._setupMessageHandlers();
    }
    
    private _setupWebview(extensionUri: vscode.Uri): void {
        if (!this._panel.webview) {
            throw new Error('Webview is not available');
        }
        
        this._panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        };
        
        this._panel.webview.html = this._getWebviewContent();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    
    private _getWebviewContent(): string {
        try {
            const htmlPath = path.join(this._extensionPath, 'out', 'webview', 'webview.html');
            
            if (!fs.existsSync(htmlPath)) {
                throw new Error(`HTML file not found at: ${htmlPath}`);
            }
            
            let html = fs.readFileSync(htmlPath, 'utf8');

            const jsPath = vscode.Uri.file(
                path.join(this._extensionPath, 'out', 'webview', 'webview.js')
            );
            const jsUri = this._panel.webview.asWebviewUri(jsPath);
            const scriptSrc = `<script src="${jsUri}"></script>`;
            
            return html.replace('<script src="webview.js"></script>', scriptSrc);
        } catch (error) {
            this._handleError(`Error loading webview content: ${error}`);
            return `<html><body><h1>Error loading content</h1><p>${error}</p></body></html>`;
        }
    }
    
    private _setupMessageHandlers(): void {
        this._panel.webview.onDidReceiveMessage(
            async (message: {
                command: string;
                text?: string;
                fileName?: string;
                agentMode?: boolean;
                filePath?: string;
                accept?: boolean;
            }) => {
                try {
                    switch (message.command) {
                        case 'askQuestion':
                            if (message.text) {
                                AIPanel._outputChannel.appendLine(`Processing question: ${message.text}`);
                                
                                this._sendMessage({
                                    type: 'userMessage',
                                    content: message.text
                                });
                                
                                if (this._isAgentMode) {
                                    await this._handleAgentQuestion(message.text);
                                } else {
                                    await this._handleQuestion(message.text);
                                }
                            }
                            break;
                        case 'acceptChanges':
                            if (message.filePath) {
                                await this._handleAcceptChanges(message.filePath, message.accept ?? true);
                            }
                            break;
                        case 'pickFiles':
                            await this._pickFiles();
                            break;
                        case 'removeFile':
                            if (message.fileName) {
                                AIPanel._outputChannel.appendLine(`Removing file: ${message.fileName}`);
                                this.attachedFiles.delete(message.fileName);
                            }
                            break;
                        case 'clearFiles':
                            AIPanel._outputChannel.appendLine('Clearing all attached files');
                            this.attachedFiles.clear();
                            break;
                        case 'toggleAgentMode':
                            if (message.agentMode !== undefined) {
                                this._isAgentMode = message.agentMode;
                                AIPanel._outputChannel.appendLine(`Agent mode ${this._isAgentMode ? 'enabled' : 'disabled'}`);
                                this._sendMessage({
                                    type: 'agentModeChanged',
                                    enabled: this._isAgentMode
                                });
                            }
                            break;
                        default:
                            AIPanel._outputChannel.appendLine(`Unknown command: ${message.command}`);
                    }
                } catch (error) {
                    this._handleError(`Error processing message: ${error}`);
                }
            },
            null,
            this._disposables
        );
    }
    
    private _sendMessage(message: any): void {
        if (this._panel.webview) {
            this._panel.webview.postMessage(message);
        }
    }
    
    // FILE CONTEXT MANAGEMENT
    
    /**
     * Prompts the user to select files to add as context
     */
    private async _pickFiles(): Promise<void> {
        try {
            const files = await vscode.window.showOpenDialog({
                canSelectMany: true,
                openLabel: 'Add to Context',
                filters: {
                    'All Files': ['*']
                }
            });
    
            if (!files || files.length === 0) {
                return;
            }
            
            for (const file of files) {
                try {
                    const content = await vscode.workspace.fs.readFile(file);
                    const decoder = new TextDecoder();
                    this.attachFile(file.fsPath, decoder.decode(content));
                } catch (error) {
                    AIPanel._outputChannel.appendLine(`Error reading file ${file.fsPath}: ${error}`);
                }
            }
        } catch (error) {
            this._handleError(`Error picking files: ${error}`);
        }
    }
    
    /**
     * Adds a file to the context for the AI
     */
    public attachFile(fileName: string, content: string): void {
        this.attachedFiles.set(fileName, content);
        this._sendMessage({ 
            type: 'fileAttached', 
            fileName: fileName 
        });
        AIPanel._outputChannel.appendLine(`Attached file: ${fileName}`);
    }
    
    /**
     * Constructs the prompt with context files if available
     */
    private _buildPrompt(question: string): string {
        if (this.attachedFiles.size === 0) {
            return question;
        }
        
        let context = '';
        this.attachedFiles.forEach((content, fileName) => {
            context += `File: ${fileName}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        });
        
        return `Context:\n${context}\nQuestion: ${question}`;
    }
    
    // CHAT FUNCTIONALITY
    
    /**
     * Handles a question in normal chat mode
     */
    private async _handleQuestion(question: string): Promise<void> {
        try {
            AIPanel._outputChannel.appendLine('Sending request to API...');
            const startTime = Date.now();
            
            const apiKey = this._apiKey;
            if (!apiKey) {
                this._showApiKeyMissingHelp();
                throw new Error('No API key found. Please set it in settings or environment variables.');
            }
            
            AIPanel._outputChannel.appendLine('API key is available');
            
            this._chat.addUserMessage(this._buildPrompt(question));

            this._sendMessage({ type: 'loading', isLoading: true });
            
            const response = await this._callOpenAI();
            
            this._chat.addAssistantMessage(response);
            
            const duration = Date.now() - startTime;
            AIPanel._outputChannel.appendLine(`Request completed in ${duration}ms`);
            
            this._sendMessage({ type: 'loading', isLoading: false });
            
            this._sendMessage({ 
                type: 'response', 
                content: response 
            });
        } catch (error) {
            AIPanel._outputChannel.appendLine(`Failed to connect to API: ${error}`);
            
            this._sendMessage({ type: 'loading', isLoading: false });
            
            let errorMessage = error instanceof Error ? error.message : String(error);
            
            if (errorMessage.includes('API key')) {
                errorMessage = 'No API key found. Please add your API key in settings or .env file.';
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
                errorMessage = 'AI service rate limit exceeded. Please wait a moment and try again.';
            }
            
            this._sendMessage({
                type: 'error',
                content: errorMessage
            });
        }
    }
    
    private async _callOpenAI(): Promise<string> {
        const apiKey = this._apiKey;
        
        if (!apiKey) {
            this._showApiKeyMissingHelp();
            throw new Error('No API key found. Please set it in settings or environment variables.');
        }
        
        const messages = this._chat.getMessages();
        
        const requestBody: OpenAIRequest = {
            model: this._model,
            messages: messages,
            max_tokens: config.MAX_TOKENS
        };
        
        let response;
        try {
            AIPanel._outputChannel.appendLine(`Making request to ${config.OPENAI_API_ENDPOINT} with model ${this._model}`);
            AIPanel._outputChannel.appendLine(`Conversation length: ${this._chat.getchatLength()} messages, ~${this._chat.getTokenCount()} tokens`);
            
            response = await fetch(config.OPENAI_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json() as { 
                choices?: Array<{ message?: { content?: string } }>;
                error?: { message?: string, type?: string, code?: string }
            };
            
            if (!response.ok) {
                const errorMsg = data.error?.message || JSON.stringify(data);
                AIPanel._outputChannel.appendLine(`API returned error: ${errorMsg}`);
                throw new Error(`API error: ${errorMsg}`);
            }
            
            if (!data.choices || !data.choices[0]?.message?.content) {
                throw new Error('Invalid response format from API');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Network error: Could not connect to API. Please check your internet connection.');
            }
            
            AIPanel._outputChannel.appendLine(`API call error: ${error}`);
            throw error;
        }
    }
    
    // AGENT FUNCTIONALITY
    
    /**
     * Handles a question in agent mode
     */
    private async _handleAgentQuestion(question: string): Promise<void> {
        try {
            AIPanel._outputChannel.appendLine('Processing agent question...');
            
            this._sendMessage({ type: 'loading', isLoading: true });
            
            const result = await this._agentExecutor.execute(question);
            
            this._sendMessage({ type: 'loading', isLoading: false });
            
            AIPanel._outputChannel.appendLine(`Agent execution completed. Success: ${result.success}`);
            
            if (result.success) {
                if (!result.response || result.response.trim() === '') {
                    AIPanel._outputChannel.appendLine('WARNING: Empty response received from agent');
                    this._sendMessage({
                        type: 'error',
                        content: 'The agent completed successfully but returned an empty response. Please try again.'
                    });
                    return;
                }
                
                AIPanel._outputChannel.appendLine(`Response length: ${result.response.length} characters`);
                AIPanel._outputChannel.appendLine(`Response preview: ${result.response.substring(0, 100)}...`);
                
                this._chat.addAssistantMessage(result.response);
                
                this._sendMessage({ 
                    type: 'response', 
                    content: result.response
                });
                
                this._updatePendingFilesUI();
            } else {
                AIPanel._outputChannel.appendLine(`Agent execution failed: ${result.error || 'Unknown error'}`);
                
                this._sendMessage({
                    type: 'error',
                    content: result.error || 'Unknown error'
                });
            }
        } catch (error) {
            AIPanel._outputChannel.appendLine(`Error in agent execution: ${error}`);
            this._sendMessage({ type: 'loading', isLoading: false });
            this._sendMessage({
                type: 'error',
                content: error instanceof Error ? error.message : String(error)
            });
        }
    }
    
    /**
     * Handle accepting or rejecting changes for a file
     */
    private async _handleAcceptChanges(filePath: string, accept: boolean): Promise<void> {
        try {
            AIPanel._outputChannel.appendLine(`${accept ? 'Accepting' : 'Rejecting'} changes for: ${filePath}`);
            
            const result = await this._agentExecutor.execute(
                `${accept ? 'Accept' : 'Reject'} changes for file: ${filePath}`
            );
            
            this._sendMessage({
                type: 'fileChangeResult',
                filePath,
                accepted: accept,
                success: result.success,
                message: result.success 
                    ? `Changes ${accept ? 'applied to' : 'rejected for'} ${filePath}` 
                    : (result.error || 'Failed to process changes')
            });
            
            this._updatePendingFilesUI();
        } catch (error) {
            this._handleError(`Error ${accept ? 'accepting' : 'rejecting'} changes: ${error}`);
        }
    }
    
    private _updatePendingFilesUI(): void {
        const pendingFiles = Array.from(pendingFileChanges.keys());
        
        this._sendMessage({
            type: 'pendingFilesUpdate',
            files: pendingFiles
        });
    }
    
    // HELPER FUNCTIONS
    
    private _showApiKeyMissingHelp(): void {
        const message = 'API key not found. Set it in settings or .env file.';
        const setKey = 'Set in Settings';
        const envHelp = 'Show .env Help';
        
        vscode.window.showErrorMessage(message, setKey, envHelp).then(selection => {
            if (selection === setKey) {
                vscode.commands.executeCommand('workbench.action.openSettings', `${config.SECTION}.${config.API_KEY}`);
            } else if (selection === envHelp) {}
        });
    }
    
    private _handleError(message: string): void {
        AIPanel._outputChannel.appendLine(`Error: ${message}`);
        vscode.window.showErrorMessage(message);
    }
    
    public isVisible(): boolean {
        return this._panel.visible;
    }
    
    public sendMessage(message: any): void {
        this._sendMessage(message);
    }
    
    // DISPOSAL
    
    public dispose(): void {
        AIPanel._outputChannel.appendLine('Disposing AI panel...');
        AIPanel.currentPanel = undefined;
        this._panel.dispose();
        
        this._agentExecutor.dispose();
        
        for (const disposable of this._disposables) {
            disposable.dispose();
        }
        this._disposables = [];
        
        AIPanel._outputChannel.appendLine('AI panel disposed');
    }
} 