import { END } from '@langchain/langgraph';
import { ChatOpenAI } from "@langchain/openai";
import * as config from '../../../config';
import { ToolsProvider } from '../../../types/agent';
import { AgentStateType } from '../state';
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();
const componentName = 'Agent Orchestrate';

/**
 * Orchestration Node 
 * 
 * This node analyses the user's task and determines the execution path for the agent.
 * It serves as the entry point and orchestrator for the agent workflow.
 * 
 * Inputs:
 * - state: Current agent state with task information
 * - runtimeConfig: Configuration object containing the WorkspaceManager
 * 
 * Outputs:
 * - Updated agent state with:
 *   - Appropriate subtask based on task type
 *   - Next node to execute in the workflow
 */

export function initialiseState(
    state: AgentStateType, 
    { task, toolsProvider }: { task: { query: string, context?: string }, toolsProvider: ToolsProvider }
) {
    // TODO initialise agent with:
    // 1. Task information
    // 2. Empty results object
    // 3. Set nextStep to 'orchestrate'
}

export async function orchestrate(
    state: AgentStateType, 
    runtimeConfig?: any
) {
    // TODO task planning:
    // 1. Gets workspace manager from runtime config
    // 2. Creates an LLM to classify the task type using ORCHESTRATION_PROMPT
    // 3. Creates appropriate subtask based on task type (analysis/generation/both)
    // 4. Returns subtask and sets the next step in workflow
}
