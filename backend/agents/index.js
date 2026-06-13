/**
 * AI Agent Integration Guide for SeaShield Backend
 * 
 * This file demonstrates how to integrate the LLM-based alert agent
 * into the existing Express server.
 * 
 * Quick Start:
 * 1. Install LangChain dependencies: npm install
 * 2. Set up LLM provider via environment:
 *    - For Ollama (local): OLLAMA_BASE_URL=http://localhost:11434
 *    - For OpenAI: LLM_PROVIDER=openai LLM_API_KEY=sk-xxx
 * 3. Add this to server.js
 */

import { MaritimeAlertAgent } from "./MaritimeAlertAgent.js";
import { AlertOrchestrator } from "./AlertOrchestrator.js";
import { LLMProvider } from "./LLMProvider.js";

let orchestrator = null;

/**
 * Initialize AI Agent System
 * Call this once on server startup
 */
async function initializeAlertAgent() {
    try {
        console.log("🤖 Initializing Maritime Alert AI Agent...");

        const llm = await LLMProvider.create({
            provider: process.env.LLM_PROVIDER || "groq",
            modelName: process.env.LLM_MODEL || "llama3-8b-8192"
        });

        const agent = new MaritimeAlertAgent(llm);
        orchestrator = new AlertOrchestrator(agent, llm); // sets module-level var

        console.log("✅ Maritime Alert Agent initialized successfully");
        return orchestrator;
    } catch (error) {
        console.warn("⚠️  Alert agent initialization failed:", error.message);
        console.warn("Falling back to template-based alerts");
        return null;
    }
}

/**
 * Generate AI Alert
 * Replaces the if/else alert logic in FishermanDashboard
 * 
 * Usage:
 * const alert = await generateAIAlert({
 *   boatId: 'BOAT_001',
 *   status: 'WARNING',
 *   position: [8.95, 79.15],
 *   distanceMeters: 450,
 *   weatherCondition: 'clear'
 * });
 */
async function generateAIAlert(eventData) {
    if (!orchestrator) {
        console.warn("Alert agent not available, using fallback");
        return generateFallbackAlert(eventData);
    }

    try {
        const execution = await orchestrator.execute(eventData);
        return execution.alert;
    } catch (error) {
        console.error("AI alert generation failed:", error);
        return generateFallbackAlert(eventData);
    }
}

/**
 * Fallback alert generation (template-based)
 * Used if LLM is not available
 */
function generateFallbackAlert(eventData) {
    const FALLBACK_TEMPLATES = {
        WARNING: {
            display: `Approaching maritime border! (${eventData.distanceMeters}m away)`,
            voice: "Warning. You are approaching the maritime boundary.",
            type: "BORDER_WARNING"
        },
        WARNING_REEF: {
            display: "CAUTION: Entered Protected Coral Reef Zone.",
            voice: "Caution. You have entered a protected coral reef.",
            type: "BORDER_WARNING"
        },
        DANGER_SRI_LANKA: {
            display: "CRITICAL: CROSSED SRI LANKAN IMBL!",
            voice: "Critical Alert! You have illegally crossed into Sri Lankan waters.",
            type: "SOS"
        },
        DANGER: {
            display: "CROSSED BORDER! Return to safe zone.",
            voice: "Danger! You have left the authorized fishing zone.",
            type: "BORDER_WARNING"
        },
        SAFE: {
            display: "Boat has returned to safe open water.",
            voice: null,
            type: "INFO"
        }
    };

    const template = FALLBACK_TEMPLATES[eventData.status] || FALLBACK_TEMPLATES.SAFE;
    return {
        success: true,
        displayText: template.display,
        voiceText: template.voice,
        severity: eventData.status === "DANGER_SRI_LANKA" ? "critical" : "warning",
        source: "fallback"
    };
}

/**
 * API Endpoint Example
 * Add this to express app:
 * 
 * app.post('/api/ai-alert', async (req, res) => {
 *   const { boatId, status, position, distanceMeters, weatherCondition } = req.body;
 *   const alert = await generateAIAlert({
 *     boatId,
 *     status,
 *     position,
 *     distanceMeters,
 *     weatherCondition
 *   });
 *   res.json(alert);
 * });
 */

/**
 * Monitoring: Get orchestrator execution history
 * 
 * app.get('/api/alert-agent/history', (req, res) => {
 *   if (!orchestrator) {
 *     return res.status(503).json({ error: 'Agent not available' });
 *   }
 *   res.json({
 *     executions: orchestrator.getExecutionHistory(20)
 *   });
 * });
 */

export {
    initializeAlertAgent,
    generateAIAlert,
    generateFallbackAlert,
    AlertOrchestrator,
    MaritimeAlertAgent
};
