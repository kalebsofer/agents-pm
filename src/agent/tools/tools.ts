/**
 * Creates LangGraph-compatible tools using WorkspaceManager.
 */

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { WorkspaceManager } from "../utils/WorkspaceManager";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();
const componentName = 'Agent Tools';

export function createAgentTools(workspaceManager: WorkspaceManager) {
    return {
        readFile: tool(
            async ({ filePath }) => {
                try {
                    logger.log(componentName, `Reading file: ${filePath}`);
                    const content = await workspaceManager.readFile(filePath);
                    return { content };
                } catch (error) {
                    logger.log(componentName, `Error reading file: ${error}`);
                    throw new Error(`Failed to read file: ${error}`);
                }
            },
            {
                name: "readFile",
                description: "Read the contents of a file in the workspace",
                schema: z.object({
                    filePath: z.string().describe("Path to the file to read")
                })
            }
        ),
        
        editAndShowDiff: tool(
            async ({ filePath, newContent, useInlineDiff = true }) => {
                try {
                    logger.log(componentName, `Editing file with ${useInlineDiff ? 'inline' : 'diff preview'}: ${filePath}`);
                    
                    // First read the original content
                    const originalContent = await workspaceManager.readFile(filePath);
                    
                    if (useInlineDiff) {
                        // Use the new inline diff method
                        const resultPath = await workspaceManager.showInlineDiff(filePath, originalContent, newContent);
                        
                        return { 
                            success: true, 
                            message: `Changes shown inline for ${filePath}. Use the chat to accept or reject changes.`,
                            diffShown: true,
                            pendingChanges: true,
                            filePath: resultPath
                        };
                    } else {
                        // Use the traditional diff view
                        await workspaceManager.showDiff(filePath, originalContent, newContent);
                        
                        return { 
                            success: true, 
                            message: `Showing diff for ${filePath}. Use applyChanges=true to apply.`,
                            diffShown: true
                        };
                    }
                } catch (error) {
                    logger.log(componentName, `Error editing file: ${error}`);
                    throw new Error(`Failed to edit file: ${error}`);
                }
            },
            {
                name: "editAndShowDiff",
                description: "Edit a file and show changes with inline highlighting directly in the file or in a diff editor",
                schema: z.object({
                    filePath: z.string().describe("Path to the file to edit"),
                    newContent: z.string().describe("New content to replace the file with"),
                    useInlineDiff: z.boolean().optional().describe("Whether to use inline diff (true) or diff editor (false). Default: true")
                })
            }
        ),
        
        acceptChanges: tool(
            async ({ filePath, accept = true }) => {
                try {
                    logger.log(componentName, `${accept ? 'Accepting' : 'Rejecting'} changes for: ${filePath}`);
                    
                    if (accept) {
                        const result = await workspaceManager.applyPendingChanges(filePath);
                        return {
                            success: result,
                            message: result 
                                ? `Changes successfully applied to ${filePath}` 
                                : `No pending changes found for ${filePath}`
                        };
                    } else {
                        const result = workspaceManager.rejectPendingChanges(filePath);
                        return {
                            success: true,
                            message: result 
                                ? `Changes rejected for ${filePath}` 
                                : `No pending changes found for ${filePath}`
                        };
                    }
                } catch (error) {
                    logger.log(componentName, `Error handling change acceptance: ${error}`);
                    throw new Error(`Failed to process changes: ${error}`);
                }
            },
            {
                name: "acceptChanges",
                description: "Accept or reject pending changes for a file",
                schema: z.object({
                    filePath: z.string().describe("Path to the file with pending changes"),
                    accept: z.boolean().optional().describe("Whether to accept (true) or reject (false) the changes. Default: true")
                })
            }
        ),
        
        getPendingChanges: tool(
            async ({}) => {
                try {
                    logger.log(componentName, "Retrieving files with pending changes");
                    const files = workspaceManager.getPendingChangeFiles();
                    return { 
                        pendingChanges: files.length > 0,
                        files
                    };
                } catch (error) {
                    logger.log(componentName, `Error getting pending changes: ${error}`);
                    throw new Error(`Failed to get pending changes: ${error}`);
                }
            },
            {
                name: "getPendingChanges",
                description: "Get a list of files with pending changes",
                schema: z.object({})
            }
        ),
        
        writeFile: tool(
            async ({ filePath, content, requireConfirmation }) => {
                try {
                    logger.log(componentName, `Writing to file: ${filePath}`);
                    const confirmationRequired = requireConfirmation === undefined ? true : requireConfirmation;
                    const success = await workspaceManager.writeFile(filePath, content, confirmationRequired);
                    
                    if (!success) {
                        return { success: false, message: "User declined the file write operation" };
                    }
                    
                    return { success: true, filePath };
                } catch (error) {
                    logger.log(componentName, `Error writing to file: ${error}`);
                    throw new Error(`Failed to write to file: ${error}`);
                }
            },
            {
                name: "writeFile",
                description: "Write content to a file in the workspace (creates the file if it doesn't exist)",
                schema: z.object({
                    filePath: z.string().describe("Path to the file to write"),
                    content: z.string().describe("Content to write to the file"),
                    requireConfirmation: z.boolean().optional().describe("Whether to require user confirmation (default: true)")
                })
            }
        ),
        
        listFiles: tool(
            async ({ directoryPath }) => {
                try {
                    logger.log(componentName, `Listing files in directory: ${directoryPath}`);
                    const files = await workspaceManager.listFiles(directoryPath);
                    return { files };
                } catch (error) {
                    logger.log(componentName, `Error listing files: ${error}`);
                    throw new Error(`Failed to list files: ${error}`);
                }
            },
            {
                name: "listFiles",
                description: "List files in a directory",
                schema: z.object({
                    directoryPath: z.string().describe("Path to the directory to list")
                })
            }
        ),
        
        searchCode: tool(
            async ({ query, filePattern }) => {
                try {
                    logger.log(componentName, `Searching code with query: ${query}`);
                    
                    // Get workspace URI
                    const workspace = workspaceManager.getWorkspaceRoot();
                    if (!workspace) {
                        throw new Error('No workspace folder open');
                    }
                    
                    // Implement code search functionality using VS Code API
                    // This is a simplified version - in a real implementation you would use more sophisticated search
                    const vscode = require('vscode');
                    const results = [];
                    
                    // Get all text documents in the workspace
                    const textDocuments = await vscode.workspace.findFiles(
                        filePattern || '**/*.{ts,js,json,md,html,css}',
                        '**/node_modules/**'
                    );
                    
                    // For each file, search for the query
                    for (const fileUri of textDocuments) {
                        try {
                            const document = await vscode.workspace.openTextDocument(fileUri);
                            const text = document.getText();
                            
                            // Simple search for matches
                            const lines = text.split('\n');
                            for (let i = 0; i < lines.length; i++) {
                                if (lines[i].includes(query)) {
                                    results.push({
                                        file: fileUri.fsPath,
                                        line: i + 1, // Convert to 1-based line numbers
                                        text: lines[i].trim()
                                    });
                                    
                                    // Limit results per file
                                    if (results.length >= 100) {
                                        break;
                                    }
                                }
                            }
                        } catch (error) {
                            logger.log(componentName, `Error searching in file ${fileUri.fsPath}: ${error}`);
                        }
                    }
                    
                    return { results };
                } catch (error) {
                    logger.log(componentName, `Error searching code: ${error}`);
                    throw new Error(`Failed to search code: ${error}`);
                }
            },
            {
                name: "searchCode",
                description: "Search for code in the workspace using a query",
                schema: z.object({
                    query: z.string().describe("Search query to find in code"),
                    filePattern: z.string().optional().describe("Optional glob pattern to filter files (e.g., \"**/*.ts\" for TypeScript files)")
                })
            }
        ),
        
        runCommand: tool(
            async ({ command }) => {
                try {
                    logger.log(componentName, `Requesting to run command: ${command}`);
                    
                    const vscode = require('vscode');
                    const choice = await vscode.window.showWarningMessage(
                        `The agent wants to run command: ${command}`,
                        'Run', 'Cancel'
                    );
                    
                    if (choice !== 'Run') {
                        return { success: false, message: 'User declined to run the command' };
                    }
                    
                    logger.log(componentName, `Running command: ${command}`);
                    
                    const { exec } = require('child_process');
                    const { promisify } = require('util');
                    const execPromise = promisify(exec);
                    
                    const workspaceFolder = workspaceManager.getWorkspaceRoot();
                    const { stdout, stderr } = await execPromise(command, { cwd: workspaceFolder });
                    
                    if (stdout) {
                        logger.log(componentName, `Command output: ${stdout}`);
                    }
                    
                    if (stderr) {
                        logger.log(componentName, `Command error output: ${stderr}`);
                    }
                    
                    return {
                        success: true,
                        output: stdout,
                        error: stderr
                    };
                } catch (error) {
                    logger.log(componentName, `Error running command: ${error}`);
                    throw new Error(`Failed to run command: ${error}`);
                }
            },
            {
                name: "runCommand",
                description: "Run a command in the terminal (use with caution)",
                schema: z.object({
                    command: z.string().describe("Command to execute")
                })
            }
        ),
        
        analyzeAndRoute: tool(
            async ({ filePath, analysisType }) => {
                try {
                    logger.log(componentName, `Analyzing file ${filePath} with analysis type ${analysisType}`);
                    
                    // First read the file
                    const content = await workspaceManager.readFile(filePath);
                    
                    // Simple complexity check (in reality, you'd have a more sophisticated analysis)
                    const isComplex = content.split('\n').length > 100 || content.length > 5000;
                    
                    // Route to different graph nodes based on analysis
                    if (analysisType === 'complexity' && isComplex) {
                        logger.log(componentName, `File is complex, routing to detailed analysis`);
                        return new Command({
                            goto: "detailedAnalysis",
                            update: { 
                                fileContent: content,
                                filePath,
                                complexity: "high"
                            }
                        });
                    } else if (analysisType === 'security') {
                        logger.log(componentName, `Performing security analysis, routing to securityCheck`);
                        return new Command({
                            goto: "securityCheck",
                            update: { 
                                fileContent: content,
                                filePath
                            }
                        });
                    }
                    
                    // Default route to basic analysis
                    logger.log(componentName, `Performing basic analysis`);
                    return {
                        filePath,
                        content,
                        analysis: {
                            lineCount: content.split('\n').length,
                            charCount: content.length,
                            isComplex
                        }
                    };
                } catch (error) {
                    logger.log(componentName, `Error in analysis: ${error}`);
                    throw new Error(`Failed to analyze file: ${error}`);
                }
            },
            {
                name: "analyzeAndRoute",
                description: "Analyze a file and route to appropriate processing based on result",
                schema: z.object({
                    filePath: z.string().describe("Path to the file to analyze"),
                    analysisType: z.enum(["complexity", "security", "basic"]).describe("Type of analysis to perform")
                })
            }
        )
    };
}

export function getAgentTools(workspaceManager: WorkspaceManager) {
    return Object.values(createAgentTools(workspaceManager));
} 