# Agents - Afternoon Session


Our second, more involved task, is to give our extension the ability to interact with the codebase.

The goal for our agent is to:
- Determine the required task/s from a user query
- When asked, to provide analysis of code within the working directory. 
- When appropriate, edit code and display diffs to the user.
- When accepted, save diffs to the working directory.


## This Template Includes

- ✅ Working Chat feature from this mornings session
- ✅ A recommended src/agent/ folder structure
- ✅ Instantiation of Agent, graph and agent functions
- ✅ A [logger utility](src/agent/utils/Logger.ts)
- ✅ Some useful [node prompts](src/agent/prompts.ts)


## You Need to Implement

- [ ] Graph design and implementation
- [ ] Node functionality
- [ ] State management
- [ ] Agent class
- [ ] *Tool creation (Remind me to push a custom WorkspaceManager tool).*

## Getting Started

### Prerequisites:
- [Node.js](https://nodejs.org/en/download)

### Clone and test:
```bash
git clone https://github.com/kalebsofer/agents-pm

cd agents-pm

npm install

npm run compile
```
### Test the extension:
1. With the project open, run in debugging mode: 
    - Press F5 or
    - From the Title Bar/Application Menu: "Run --> Start Debugging --> VS Code Extension"
2. From Extension Development Host, open command palette. 
    - `Ctrl+Shift+P` (Windows/Linux)
    - `Cmd+Shift+P` (MacOS)
3. Search and select `Open AI Panel` (agent-workshop.openAIPanel)

4. Test the chat feature. 
5. Toggle the agent mode, this won't do anything yet.

## API Keys

Create a `.env` file in the root of the project and add your API key.

- Use your own if you have one. 
- I will ping a temporary key on Discord (OpenAI). 
- This template uses the OpenAI API, you are free to choose your preferred LLM.

**Note, [config.ts](src/config.ts) is configured for OpenAI, you will need to tweak it for your preferred LLM.**

## Notes:
- LangGraph is fairly new, most LLMs have not been trained on sufficient data to write it for you. So you will need to write the tool calls yourself, or provide docs as context if the token limit will effectively allow.

- The logger utility should ease debugging, they are displayed in the Output tab of the Extension Development Host terminal. You may need to scroll up to "AI Agent".


## Resources

### Typescript
#### LangGraph
- Glossary: https://langchain-ai.github.io/langgraph/concepts/low_level/
- Custom Tools: https://js.langchain.com/docs/how_to/custom_tools/
- Examples: https://github.com/langchain-ai/langgraphjs/tree/main/examples


### Python
#### LangGraph
- Glossary: https://langchain-ai.github.io/langgraph/concepts/low_level/
- Custom Tools: https://python.langchain.com/docs/how_to/custom_tools/
- Tutorials: https://langchain-ai.github.io/langgraph/tutorials/
- Code Assistant: https://langchain-ai.github.io/langgraph/tutorials/code_assistant/langgraph_code_assistant/
- LangChain Academy: https://github.com/langchain-ai/langchain-academy/blob/main/module-1/agent.ipynb