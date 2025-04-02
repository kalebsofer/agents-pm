(function() {
    try {
        const vscode = acquireVsCodeApi();
        
        // DOM elements
        const messageContainer = document.getElementById('message-container');
        const userInput = document.getElementById('user-input');
        const submitButton = document.getElementById('submit-button');
        const fileList = document.getElementById('file-list');
        const attachFilesButton = document.getElementById('attach-files-button');
        const clearFilesButton = document.getElementById('clear-files-button');
        const agentModeToggle = document.getElementById('agent-mode-toggle');
        const loadingIndicator = document.getElementById('loading-indicator');
        
        // State
        let isLoading = false;
        let isAgentMode = false;
        
        // Initialize
        function initialize() {
            // Set up event listeners
            setupEventListeners();
            
            // Add initial message
            addMessage('assistant', 'Assistant is ready. How can I help you?');
        }
        
        function setupEventListeners() {
            // Submit button handler
            submitButton.addEventListener('click', () => {
                submitQuestion();
            });
            
            // Enter key handler
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitQuestion();
                }
            });
            
            // Input field resize handler
            userInput.addEventListener('input', () => {
                userInput.style.height = 'auto';
                userInput.style.height = userInput.scrollHeight + 'px';
            });
            
            // Attach files button
            attachFilesButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'pickFiles'
                });
            });
            
            // Clear files button
            clearFilesButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'clearFiles'
                });
                fileList.innerHTML = '';
            });
            
            // Agent mode toggle
            agentModeToggle.addEventListener('change', () => {
                isAgentMode = agentModeToggle.checked;
                vscode.postMessage({
                    command: 'toggleAgentMode',
                    agentMode: isAgentMode
                });
                
                // Update UI to reflect agent mode
                document.body.classList.toggle('agent-mode', isAgentMode);
                updateAgentModeUI();
            });
            
            // Listen for messages from extension
            window.addEventListener('message', (event) => {
                const message = event.data;
                
                switch (message.type) {
                    case 'userMessage':
                        addMessage('user', message.content || '');
                        break;
                    case 'response':
                        hideLoading();
                        addMessage('assistant', message.content || '');
                        break;
                    case 'error':
                        hideLoading();
                        addErrorMessage(message.content || 'Unknown error');
                        break;
                    case 'fileAttached':
                        addFileToList(message.fileName || 'Unknown file');
                        break;
                    case 'loading':
                        if (message.isLoading) {
                            showLoading();
                        } else {
                            hideLoading();
                        }
                        break;
                    case 'agentProgress':
                        updateAgentProgress(message.content || '');
                        break;
                    case 'agentModeChanged':
                        if (message.enabled !== undefined) {
                            isAgentMode = message.enabled;
                            agentModeToggle.checked = isAgentMode;
                            document.body.classList.toggle('agent-mode', isAgentMode);
                            updateAgentModeUI();
                        }
                        break;
                }
            });
        }
        
        function submitQuestion() {
            const question = userInput.value.trim();
            
            if (!question || isLoading) {
                return;
            }
            
            // Send question to extension
            vscode.postMessage({
                command: 'askQuestion',
                text: question
            });
            
            // Clear input field
            userInput.value = '';
            userInput.style.height = 'auto';
            
            // Show loading state
            showLoading();
        }
        
        function addMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}-message`;
            
            // Create avatar
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.textContent = role === 'user' ? 'U' : 'AI';
            avatar.setAttribute('aria-hidden', 'true');
            
            // Create content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            
            // Format message with markdown
            contentDiv.innerHTML = formatMessage(content);
            
            // Assemble message
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(contentDiv);
            
            // Add to container
            messageContainer.appendChild(messageDiv);
            
            // Scroll to bottom
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
        
        function addErrorMessage(errorText) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message message-alert';
            errorDiv.textContent = errorText;
            
            messageContainer.appendChild(errorDiv);
            
            // Scroll to bottom
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
        
        function updateAgentProgress(progress) {
            // Check if a progress message already exists
            const existingProgress = document.querySelector('.agent-progress');
            
            if (existingProgress) {
                // Update existing progress
                existingProgress.textContent = progress;
            } else {
                // Create new progress element
                const progressDiv = document.createElement('div');
                progressDiv.className = 'agent-progress message-alert';
                progressDiv.textContent = progress;
                messageContainer.appendChild(progressDiv);
                
                // Scroll to bottom
                messageContainer.scrollTop = messageContainer.scrollHeight;
            }
        }
        
        function formatMessage(text) {
            // Simple markdown-like formatting
            // Code blocks
            text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
            
            // Inline code
            text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Bold
            text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            
            // Italic
            text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            
            // Line breaks
            text = text.replace(/\n/g, '<br>');
            
            return text;
        }
        
        function addFileToList(fileName) {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.setAttribute('role', 'listitem');
            
            // Get file name without path
            const shortName = fileName.split(/[\/\\]/).pop() || fileName;
            
            fileItem.innerHTML = `
                <span class="file-name" title="${fileName}">${shortName}</span>
                <button class="remove-file-button" aria-label="Remove ${shortName}">×</button>
            `;
            
            // Add remove button handler
            const removeButton = fileItem.querySelector('.remove-file-button');
            removeButton.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'removeFile',
                    fileName: fileName
                });
                fileItem.remove();
            });
            
            fileList.appendChild(fileItem);
        }
        
        function showLoading() {
            isLoading = true;
            loadingIndicator.style.display = 'flex';
            loadingIndicator.setAttribute('aria-hidden', 'false');
            submitButton.disabled = true;
        }
        
        function hideLoading() {
            isLoading = false;
            loadingIndicator.style.display = 'none';
            loadingIndicator.setAttribute('aria-hidden', 'true');
            submitButton.disabled = false;
        }
        
        function updateAgentModeUI() {
            const modeLabel = document.getElementById('mode-label');
            
            if (modeLabel) {
                modeLabel.textContent = isAgentMode ? 'Agent Mode: Active' : 'Chat Mode';
            }
        }
        
        // Initialize on load
        window.addEventListener('load', initialize);
        
    } catch (error) {
        console.error('Failed to initialize webview:', error);
    }
})(); 