import { Annotation } from "@langchain/langgraph";
import { Task } from "../../types/agent";

export const AgentState = Annotation.Root({
    task: Annotation<Task>({
        reducer: (prev, next) => next ?? prev,
    })

});

export type AgentStateType = typeof AgentState.State; 