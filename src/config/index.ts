/**
 * Loads environment variables and provides access to settings.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export const SECTION = 'agent-workshop';
export const API_KEY = 'aiAPIKey';
export const MODEL = 'aiModel';
export const DEFAULT_MODEL = 'gpt-4o-mini-2024-07-18';
export const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
export const MAX_TOKENS = 4000;

function loadEnvFile() {
    const possiblePaths = [
        path.join(__dirname, '..', '..', '.env'), // From out/config to root
        path.join(__dirname, '..', '.env'),       // From out/config to out
        path.join(process.cwd(), '.env'),         // Current working directory
    ];
    
    for (const envPath of possiblePaths) {
        if (fs.existsSync(envPath)) {
            console.log(`Loading .env from: ${envPath}`);
            const result = dotenv.config({ path: envPath });
            
            if (result.error) {
                console.error(`Error parsing .env file at ${envPath}:`, result.error);
            } else {
                console.log(`.env file loaded successfully from ${envPath}`);
                return true;
            }
        }
    }
    
    console.warn('No .env file found in any of the expected locations');
    return false;
}

loadEnvFile();

export function getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(SECTION);
}

export function getApiKey(): string {
    const config = getConfig();
    const configKey = config.get<string>(API_KEY, '');
    const envKey = process.env.API_KEY || process.env.OPENAI_API_KEY || '';
    
    if (configKey) {
        console.log('API key found in VS Code settings');
    } else if (envKey) {
        console.log('API key found in environment variables');
    } else {
        console.warn('No API key found in settings or environment variables');
    }
    
    return configKey || envKey || '';
}

export function getModel(): string {
    const config = getConfig();
    return config.get<string>(MODEL, DEFAULT_MODEL);
} 