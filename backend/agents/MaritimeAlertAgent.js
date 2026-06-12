/**
 * Maritime Alert Agent - LangChain + LLM-based reasoning
 * Uses LangChain Core to generate contextual alert messages
 * for maritime safety events
 */

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

class MaritimeAlertAgent {
    constructor(llm) {
        this.llm = llm;
        this.alertPrompt = ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a maritime safety alert system expert. Generate concise, actionable alert messages for fishing boats in the Indian Ocean region (India-Sri Lanka boundary waters).

Alert Guidelines:
- Keep messages under 100 characters for maritime radio compatibility
- Include quantified data (distance, coordinates) when available
- Use imperative language for safety-critical alerts
- Reference established maritime zones: Safe Zone, Coral Reef Zone, Sri Lankan IMBL
- Provide immediate action recommendations
- Consider weather conditions and hazards if provided

Alert Types:
1. BORDER_WARNING: Boat approaching maritime boundary
2. HIGH_RISK_ZONE: Entered coral reef or restricted area  
3. SOS: Emergency/distress situation
4. INFO: Non-critical maritime guidance

Respond with valid JSON only:
{
  "message": "string (max 100 chars)",
  "voiceAlert": "string for text-to-speech",
  "severity": "info|warning|critical",
  "recommendedAction": "string"
}
`
            ],
            ["human", "{context}"]
        ]);

        this.chain = RunnableSequence.from([
            this.alertPrompt,
            this.llm,
            new StringOutputParser()
        ]);
    }

    async generateAlert(eventData) {
        const {
            status,
            distanceMeters,
            position,
            boatId,
            hazardType,
            weatherCondition,
            previousStatus
        } = eventData;

        const context = `
Event Status: ${status}
Boat ID: ${boatId}
Position: ${position ? `${position[0]}, ${position[1]}` : 'unknown'}
Distance to Boundary: ${distanceMeters}m
Hazard Type: ${hazardType || 'geofencing'}
Weather: ${weatherCondition || 'not provided'}
Previous Status: ${previousStatus || 'unknown'}

Generate an alert message for this maritime safety event.
Include severity level and recommended action.
`;

        try {
            const result = await this.chain.invoke({ context });
            const parsed = JSON.parse(result);
            return {
                success: true,
                displayText: parsed.message,
                voiceText: parsed.voiceAlert,
                severity: parsed.severity,
                action: parsed.recommendedAction,
                raw: result
            };
        } catch (error) {
            console.error("Alert generation error:", error.message);
            return {
                success: false,
                displayText: `Alert: ${status} detected`,
                voiceText: `Warning: ${status}`,
                severity: "warning",
                action: "Contact operations center",
                error: error.message
            };
        }
    }
}

export { MaritimeAlertAgent };
