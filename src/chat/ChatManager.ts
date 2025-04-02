import type { Message } from '../types/chat';

function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

export class chatManager {
    private messages: Message[] = [];
    private totalTokens: number = 0;
    private readonly maxTokens: number = 100000;

    constructor(systemPrompt?: string) {
        if (systemPrompt) {
            this.addSystemMessage(systemPrompt);
        }
    }

    public addUserMessage(content: string): void {
        this.addMessage({
            role: 'user',
            content,
            timestamp: Date.now()
        });
    }

    public addAssistantMessage(content: string): void {
        this.addMessage({
            role: 'assistant',
            content,
            timestamp: Date.now()
        });
    }

    public addSystemMessage(content: string): void {
        this.addMessage({
            role: 'system',
            content,
            timestamp: Date.now()
        });
    }

    private addMessage(message: Message): void {
        const messageTokens = estimateTokens(message.content);
        
        this.pruneHistory(messageTokens);
        
        this.messages.push(message);
        this.totalTokens += messageTokens;
    }

    private pruneHistory(newMessageTokens: number): void {
        while (this.totalTokens + newMessageTokens > this.maxTokens && this.messages.length > 0) {
            const oldestNonSystemIndex = this.messages.findIndex(m => m.role !== 'system');
            
            if (oldestNonSystemIndex === -1) {
                const oldestMessage = this.messages.shift();
                if (oldestMessage) {
                    this.totalTokens -= estimateTokens(oldestMessage.content);
                }
            } else {
                const removedMessage = this.messages.splice(oldestNonSystemIndex, 1)[0];
                this.totalTokens -= estimateTokens(removedMessage.content);
            }
        }
    }

    public clearchat(keepSystemMessages: boolean = true): void {
        if (keepSystemMessages) {
            const systemMessages = this.messages.filter(m => m.role === 'system');
            this.messages = systemMessages;
            this.totalTokens = systemMessages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
        } else {
            this.messages = [];
            this.totalTokens = 0;
        }
    }

    public getMessages(): Message[] {
        return [...this.messages];
    }

    public getchatLength(): number {
        return this.messages.length;
    }

    public getTokenCount(): number {
        return this.totalTokens;
    }
} 