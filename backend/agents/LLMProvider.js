/**
 * LLM Provider Factory
 * Supports multiple LLM backends:
 * - OpenAI (API key required)
 * - Ollama (local, no API key)
 * - Anthropic Claude (API key required)
 * - Groq (fast inference)
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";

class LLMProvider {
    static async create(config = {}) {
        const provider = config.provider || process.env.LLM_PROVIDER || "ollama";
        const apiKey = config.apiKey || process.env.LLM_API_KEY;
        const modelName = config.modelName || process.env.LLM_MODEL || "llama2";

        console.log(`Initializing LLM provider: ${provider}`);

        if (provider === "openai") {
            if (!apiKey) {
                throw new Error("OpenAI API key required. Set LLM_API_KEY env var.");
            }
            return new ChatOpenAI({
                apiKey,
                modelName: modelName || "gpt-3.5-turbo",
                temperature: 0.7,
                maxTokens: 256
            });
        }

        if (provider === "ollama") {
            return new ChatOllama({
                baseUrl: config.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
                model: modelName || "llama2",
                temperature: 0.7
            });
        }

        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

export { LLMProvider };
