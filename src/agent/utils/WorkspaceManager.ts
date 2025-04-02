/**
 * WorkspaceManager.ts
 * 
 * Manages workspace file operations for the agent.
 * Provides safe access to read, write, and modify files in the user's workspace.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './Logger';
import { FileChange } from '../../types/agent';

// Track pending file changes across the application
export const pendingFileChanges = new Map<string, { original: string, modified: string }>();

export class WorkspaceManager {
    private readonly logger = Logger.getInstance();
    private readonly componentName = 'Workspace Manager';
    private readonly workspaceRoot: string;
    private changeHistory: FileChange[] = [];
    // Decorations for inline diff
    private additionDecorationType: vscode.TextEditorDecorationType;
    private deletionDecorationType: vscode.TextEditorDecorationType;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            this.logger.log(this.componentName, 'WARNING: No workspace folder found. Agent will have limited functionality.');
            // Set a default value so the class can still initialize, but log warnings when methods are called
            this.workspaceRoot = '';
        } else {
            this.workspaceRoot = folders[0].uri.fsPath;
            this.logger.log(this.componentName, `Workspace root set to: ${this.workspaceRoot}`);
        }
        
        // Create decoration types for inline diff
        this.additionDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            isWholeLine: true,
            after: {
                contentText: '  // Addition',
                color: 'rgba(0, 170, 0, 0.8)',
                fontStyle: 'italic'
            }
        });
        
        this.deletionDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            isWholeLine: true,
            after: {
                contentText: '  // Deletion',
                color: 'rgba(170, 0, 0, 0.8)',
                fontStyle: 'italic'
            }
        });
    }

    /**
     * Get the workspace root path
     */
    public getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }

    /**
     * Read a file from the workspace
     */
    public async readFile(filePath: string): Promise<string> {
        this.logger.log(this.componentName, `Reading file: ${filePath}`);
        
        if (!this.workspaceRoot) {
            this.logger.log(this.componentName, 'No workspace folder available. Cannot read files.');
            throw new Error('No workspace folder is open. Please open a folder to use this feature.');
        }
        
        try {
            const fullPath = this.resolveFilePath(filePath);
            const fileContent = await fs.promises.readFile(fullPath, 'utf-8');
            return fileContent;
        } catch (error) {
            const errorMessage = `Error reading file ${filePath}: ${error}`;
            this.logger.log(this.componentName, errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Write to a file in the workspace (creates if doesn't exist)
     */
    public async writeFile(filePath: string, content: string, requireConfirmation: boolean = true): Promise<boolean> {
        const fullPath = this.resolveFilePath(filePath);
        const operation: FileChange['operation'] = fs.existsSync(fullPath) ? 'modify' : 'create';
        
        this.logger.log(this.componentName, `${operation === 'create' ? 'Creating' : 'Modifying'} file: ${filePath}`);
        
        // Store original content for undo if file exists
        let originalContent: string | undefined;
        if (operation === 'modify') {
            try {
                originalContent = await this.readFile(filePath);
            } catch (error) {
                this.logger.log(this.componentName, `Could not read original content: ${error}`);
            }
        }
        
        // Get user confirmation if required
        if (requireConfirmation) {
            const action = operation === 'create' ? 'Create' : 'Modify';
            const confirmed = await this.confirmOperation(`${action} ${filePath}?`);
            if (!confirmed) {
                this.logger.log(this.componentName, 'Operation canceled by user');
                return false;
            }
        }
        
        try {
            // Ensure directory exists
            const directory = path.dirname(fullPath);
            await fs.promises.mkdir(directory, { recursive: true });
            
            // Write file
            await fs.promises.writeFile(fullPath, content, 'utf-8');
            
            // Record the change for potential undo
            this.changeHistory.push({
                filePath,
                originalContent,
                newContent: content,
                operation
            });
            
            this.logger.log(this.componentName, `Successfully ${operation === 'create' ? 'created' : 'modified'} file: ${filePath}`);
            return true;
        } catch (error) {
            const errorMessage = `Error writing to file ${filePath}: ${error}`;
            this.logger.log(this.componentName, errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Delete a file from the workspace
     */
    public async deleteFile(filePath: string, requireConfirmation: boolean = true): Promise<boolean> {
        this.logger.log(this.componentName, `Deleting file: ${filePath}`);
        
        const fullPath = this.resolveFilePath(filePath);
        
        if (!fs.existsSync(fullPath)) {
            this.logger.log(this.componentName, `File doesn't exist: ${filePath}`);
            return false;
        }
        
        // Store original content for undo
        let originalContent: string | undefined;
        try {
            originalContent = await this.readFile(filePath);
        } catch (error) {
            this.logger.log(this.componentName, `Could not read original content: ${error}`);
        }
        
        // Get user confirmation if required
        if (requireConfirmation) {
            const confirmed = await this.confirmOperation(`Delete ${filePath}?`);
            if (!confirmed) {
                this.logger.log(this.componentName, 'Delete operation canceled by user');
                return false;
            }
        }
        
        try {
            await fs.promises.unlink(fullPath);
            
            // Record the change for potential undo
            this.changeHistory.push({
                filePath,
                originalContent,
                newContent: '',
                operation: 'delete'
            });
            
            this.logger.log(this.componentName, `Successfully deleted file: ${filePath}`);
            return true;
        } catch (error) {
            const errorMessage = `Error deleting file ${filePath}: ${error}`;
            this.logger.log(this.componentName, errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * List files in a directory
     */
    public async listFiles(directoryPath: string): Promise<string[]> {
        this.logger.log(this.componentName, `Listing files in directory: ${directoryPath}`);
        
        if (!this.workspaceRoot) {
            this.logger.log(this.componentName, 'No workspace folder available. Cannot list files.');
            throw new Error('No workspace folder is open. Please open a folder to use this feature.');
        }
        
        try {
            const fullPath = this.resolveFilePath(directoryPath);
            const files = await fs.promises.readdir(fullPath);
            return files;
        } catch (error) {
            const errorMessage = `Error listing files in directory ${directoryPath}: ${error}`;
            this.logger.log(this.componentName, errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Undo the most recent file change
     */
    public async undoLastChange(): Promise<boolean> {
        const lastChange = this.changeHistory.pop();
        
        if (!lastChange) {
            this.logger.log(this.componentName, 'No changes to undo');
            return false;
        }
        
        this.logger.log(this.componentName, `Undoing last change to ${lastChange.filePath}`);
        
        try {
            if (lastChange.operation === 'delete' && lastChange.originalContent) {
                // Restore the deleted file
                await this.writeFile(lastChange.filePath, lastChange.originalContent, false);
                this.logger.log(this.componentName, `Restored deleted file: ${lastChange.filePath}`);
                return true;
            } else if (lastChange.operation === 'create') {
                // Delete the created file
                await this.deleteFile(lastChange.filePath, false);
                this.logger.log(this.componentName, `Removed created file: ${lastChange.filePath}`);
                return true;
            } else if (lastChange.operation === 'modify' && lastChange.originalContent) {
                // Restore the original content
                await this.writeFile(lastChange.filePath, lastChange.originalContent, false);
                this.logger.log(this.componentName, `Restored previous version of: ${lastChange.filePath}`);
                return true;
            }
            
            this.logger.log(this.componentName, `Could not undo change to ${lastChange.filePath}`);
            return false;
        } catch (error) {
            const errorMessage = `Error undoing change to ${lastChange.filePath}: ${error}`;
            this.logger.log(this.componentName, errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Show diff between old and new content
     */
    public async showDiff(filePath: string, originalContent: string, newContent: string): Promise<void> {
        const fileName = path.basename(filePath);
        const uri = vscode.Uri.file(filePath);
        
        // Create URIs for diff editor
        const originalUri = uri.with({ scheme: 'agent-original', path: `${uri.path}.original` });
        const newUri = uri.with({ scheme: 'agent-new', path: `${uri.path}.new` });
        
        // Register content provider
        const contentProvider = vscode.workspace.registerTextDocumentContentProvider('agent-original', {
            provideTextDocumentContent: () => originalContent
        });
        
        const newContentProvider = vscode.workspace.registerTextDocumentContentProvider('agent-new', {
            provideTextDocumentContent: () => newContent
        });
        
        // Show diff
        await vscode.commands.executeCommand('vscode.diff', originalUri, newUri, `${fileName} (Diff)`);
        
        // Dispose content providers
        contentProvider.dispose();
        newContentProvider.dispose();
    }

    /**
     * Confirm an operation with the user
     */
    private async confirmOperation(message: string): Promise<boolean> {
        const yes = 'Yes';
        const no = 'No';
        const response = await vscode.window.showInformationMessage(message, yes, no);
        return response === yes;
    }

    /**
     * Resolve a relative path to a full path
     */
    private resolveFilePath(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        return path.join(this.workspaceRoot, filePath);
    }

    /**
     * Show inline diff directly in the file with decorations
     * Returns file path for reference in chat
     */
    public async showInlineDiff(filePath: string, originalContent: string, newContent: string): Promise<string> {
        this.logger.log(this.componentName, `Showing inline diff for: ${filePath}`);
        
        // Store pending changes
        pendingFileChanges.set(filePath, { original: originalContent, modified: newContent });
        
        // Get the full file path
        const fullPath = this.resolveFilePath(filePath);
        const uri = vscode.Uri.file(fullPath);
        
        try {
            // Open the document and show it
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            
            // Calculate the diff between original and new content
            const originalLines = originalContent.split('\n');
            const newLines = newContent.split('\n');
            
            // Simple diff algorithm to find added/removed lines
            const additionDecorations: vscode.DecorationOptions[] = [];
            const deletionDecorations: vscode.DecorationOptions[] = [];
            
            // This is a simplistic diff approach - for production you might want to use a full diff library
            let longerLength = Math.max(originalLines.length, newLines.length);
            
            for (let i = 0; i < longerLength; i++) {
                const originalLine = i < originalLines.length ? originalLines[i] : null;
                const newLine = i < newLines.length ? newLines[i] : null;
                
                // If lines are different, mark them
                if (originalLine !== newLine) {
                    const range = new vscode.Range(
                        new vscode.Position(i, 0),
                        new vscode.Position(i, Math.max(originalLine?.length || 0, newLine?.length || 0))
                    );
                    
                    // If line is in new content but not original (or different), it's an addition
                    if (newLine !== null && (originalLine === null || originalLine !== newLine)) {
                        additionDecorations.push({ range });
                    }
                    
                    // If line is in original content but not new (or different), it's a deletion
                    if (originalLine !== null && (newLine === null || originalLine !== newLine)) {
                        deletionDecorations.push({ range });
                    }
                }
            }
            
            // Apply decorations
            editor.setDecorations(this.additionDecorationType, additionDecorations);
            editor.setDecorations(this.deletionDecorationType, deletionDecorations);
            
            return filePath;
        } catch (error) {
            this.logger.log(this.componentName, `Error showing inline diff: ${error}`);
            throw new Error(`Failed to show inline diff: ${error}`);
        }
    }
    
    /**
     * Apply pending changes for a specific file
     */
    public async applyPendingChanges(filePath: string): Promise<boolean> {
        const pendingChange = pendingFileChanges.get(filePath);
        
        if (!pendingChange) {
            this.logger.log(this.componentName, `No pending changes found for: ${filePath}`);
            return false;
        }
        
        // Apply the changes
        const result = await this.writeFile(filePath, pendingChange.modified, false);
        
        // Remove the pending change
        pendingFileChanges.delete(filePath);
        
        // Clear decorations in editor if open
        const uri = vscode.Uri.file(this.resolveFilePath(filePath));
        const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri.fsPath === uri.fsPath);
        
        editors.forEach(editor => {
            editor.setDecorations(this.additionDecorationType, []);
            editor.setDecorations(this.deletionDecorationType, []);
        });
        
        return result;
    }
    
    /**
     * Reject pending changes for a specific file
     */
    public rejectPendingChanges(filePath: string): boolean {
        // Remove the pending change
        const hadPendingChanges = pendingFileChanges.delete(filePath);
        
        // Clear decorations in editor if open
        const uri = vscode.Uri.file(this.resolveFilePath(filePath));
        const editors = vscode.window.visibleTextEditors.filter(editor => editor.document.uri.fsPath === uri.fsPath);
        
        editors.forEach(editor => {
            editor.setDecorations(this.additionDecorationType, []);
            editor.setDecorations(this.deletionDecorationType, []);
        });
        
        return hadPendingChanges;
    }
    
    /**
     * Get list of all files with pending changes
     */
    public getPendingChangeFiles(): string[] {
        return Array.from(pendingFileChanges.keys());
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.additionDecorationType.dispose();
        this.deletionDecorationType.dispose();
    }
} 