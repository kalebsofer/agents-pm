import { ChatOpenAI } from "@langchain/openai";
import { END } from '@langchain/langgraph';

import { GENERATION_PROMPT } from '../../prompts';
import * as config from '../../../config';
import { AgentStateType } from "../state";
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();
const componentName = 'Agent Generate';

export async function executeGenerationTask(state: AgentStateType, runtimeConfig?: any) {
}
