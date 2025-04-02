export interface OpenAIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OpenAIRequest {
    model: string;
    messages: OpenAIMessage[];
    max_tokens: number;
}

export interface OpenAIResponse {
    choices: Array<{message: {content: string}}>;
    error?: {
        message: string;
        type: string;
        code?: string;
    };
} 