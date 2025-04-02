/**
 * Main entry point for the AI Assistant extension.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AIPanel } from './panels/AIPanel';

export function activate(context: vscode.ExtensionContext) {
	console.log('AI Assistant extension is now active');
	console.log('Registering command: agent-workshop.openAIPanel');
	
	// Register open AI Panel command
	const openAIPanelCommand = vscode.commands.registerCommand('agent-workshop.openAIPanel', () => {
		console.log('Executing command: agent-workshop.openAIPanel');
		AIPanel.createOrShow(context.extensionUri);
	});
	
	// Register status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "$(sparkle) AI";
	statusBarItem.tooltip = "Open AI Assistant";
	statusBarItem.command = 'agent-workshop.openAIPanel';
	statusBarItem.show();
	
	// Register all subscriptions
	context.subscriptions.push(
		openAIPanelCommand,
		statusBarItem
	);

	console.log('AI Assistant extension fully activated with command agent-workshop.openAIPanel registered');
}

export function deactivate() {
	if (AIPanel.currentPanel) {
		AIPanel.currentPanel.dispose();
	}
	console.log('AI Assistant extension has been deactivated');
}
