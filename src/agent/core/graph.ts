/**
 * This file defines the LangGraph workflow for the agent, 
 * connecting nodes and defining their execution flow.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { orchestrate } from "./nodes/orchestrate";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

export function createAgentGraph() {
    /** TODO:
     * 1. Create a StateGraph with the AgentState model
     * 2. Add necessary nodes
     * 3. Define edges to route between nodes based on task type
     * Return the compiled graph.
     */
        
    const builder = new StateGraph(AgentState)
        // Add orchestration node
        .addNode("orchestrate", orchestrate);
    
    // Add edges (START/END connections)
    builder.addEdge(START, "orchestrate");
    
    // Return compiled graph
    const graph = builder.compile();
    
    // We'll manually handle initialization when invoking the graph
    return graph;
} 