import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state";
import { orchestrate } from "./nodes/orchestrate";
import { Logger } from "../utils/Logger";

const logger = Logger.getInstance();

export function createAgentGraph() {
    const builder = new StateGraph(AgentState)
        .addNode("orchestrate", orchestrate);
    
    builder.addEdge(START, "orchestrate");
    
    const graph = builder.compile();
    
    return graph;
} 