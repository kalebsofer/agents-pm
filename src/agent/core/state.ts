/**
 * This file defines the state model for the LangGraph agent workflow.
 * It specifies all the data that flows through the agent graph.
 */

import { Annotation } from "@langchain/langgraph";
import { Task } from "../../types/agent";

export const AgentState = Annotation.Root({
    /**
     * The state model should track:
     * - task: The original task from the user
     * - currentSubtask: The current subtask being processed
     * - results: Results from completed subtasks
     * - nextStep: Routing decision for the next step
     * - error: Error information if any
     * 
     * Each field should have an appropriate reducer function to handle updates.
     */
    
    // The original task from the user
    task: Annotation<Task>({
        reducer: (prev, next) => next ?? prev,
    })

});

export type AgentStateType = typeof AgentState.State; 