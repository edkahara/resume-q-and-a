export interface QuestionRequest {
    question: string;
}

export interface HealthResponse {
    status: string;
    pinecone_connected: boolean;
    anthropic_configured: boolean;
    index: string
}

