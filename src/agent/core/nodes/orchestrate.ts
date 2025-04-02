import { END } from '@langchain/langgraph';
import { ChatOpenAI } from "@langchain/openai";
import * as config from '../../../config';
import { ToolsProvider } from '../../../types/agent';
import { AgentStateType } from '../state';
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();
const componentName = 'Agent Orchestrate';

export function initialiseState(
    state: AgentStateType, 
    { task, toolsProvider }: { task: { query: string, context?: string }, toolsProvider: ToolsProvider }
) {
}

export async function orchestrate(
    state: AgentStateType, 
    runtimeConfig?: any
) {
}
