/**
 * LLM Provider Factory
 * Supports multiple LLM backends:
 * - OpenAI (API key required)
 * - Ollama (local, no API key)
 * - Anthropic Claude (API key required)
 * - Groq (fast inference)
 */

import { ChatOpenAI } from "@langchain/openai";

class LLMProvider {
    static async create(config = {}) {
        const provider = config.provider || process.env.LLM_PROVIDER || "groq";
        const apiKey = config.apiKey || process.env.LLM_API_KEY;
        const modelName = config.modelName || process.env.LLM_MODEL || "llama3-8b-8192";

        console.log(`Initializing LLM provider: ${provider}`);

        if (provider === "groq") {
            if (!apiKey) throw new Error("Groq API key required. Set LLM_API_KEY env var.");
            return new ChatOpenAI({
                apiKey,
                modelName: modelName || "llama3-8b-8192",
                temperature: 0.7,
                maxTokens: 256,
                configuration: {
                    baseURL: "https://api.groq.com/openai/v1"
                }
            });
        }

        if (provider === "openai") {
            if (!apiKey) throw new Error("OpenAI API key required. Set LLM_API_KEY env var.");
            return new ChatOpenAI({
                apiKey,
                modelName: modelName || "gpt-3.5-turbo",
                temperature: 0.7,
                maxTokens: 256
            });
        }

        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

export { LLMProvider };
