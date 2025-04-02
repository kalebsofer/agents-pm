# TODO 
- api call
- copy relevant ai import from aipanel
- replace functional code from agent/ with required definitions
- order of dev for readme
   - logger (useful)
   - prompts (useful, done)
   - tool creation
   - graph creation
   - node function implementation
   - states
   - Agent class (entry point)


# Agents - Afternoon Session


Our second task is to give our extension the ability to interact with our codebase.

Your extension should:
 -


## This Template Includes

- ✅ WebView UI components [webview.html](src/webview/webview.html)
- ✅ Configuration setup for API keys [config.ts](src/config.ts)
- ✅ Extension entry point [`extension.ts`](src/extension.ts)
- ✅ Basic panel infrastructure [AIPanel.ts](src/panels/AIPanel.ts)
- ✅ Workspace Manager Tool [WorkspaceManager.ts](src/tools/WorkspaceManager.ts)



## You Need to Implement

- [ ] 

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
- LangGraph is very new, most LLMs have not been trained on sufficient data to write it for you. So you will need to write the tool calls yourself, or provide docs as context if the token limit will effectively allow.



## Resources

- 