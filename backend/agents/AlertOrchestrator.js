/**
 * LangGraph Alert Orchestrator
 * Manages the agentic workflow for maritime alert generation
 * Coordinates: Tool selection → Reasoning → Alert generation
 */

import {
    BoundaryClassifierTool,
    DistanceCalculatorTool,
    HazardAssessmentTool,
    SafetyIndexTool
} from "./AlertTools.js";

class AlertOrchestrator {
    constructor(agent, llm) {
        this.agent = agent;
        this.llm = llm;
        this.tools = {
            boundary: new BoundaryClassifierTool(),
            distance: new DistanceCalculatorTool(),
            hazard: new HazardAssessmentTool(),
            safety: new SafetyIndexTool()
        };
        this.executionHistory = [];
    }

    /**
     * Executes the alert workflow
     * Step 1: Classify maritime zone
     * Step 2: Calculate distance to boundaries
     * Step 3: Assess hazards
     * Step 4: Generate AI alert using LLM + context
     */
    async execute(eventData) {
        const executionId = `exec-${Date.now()}`;
        const startTime = Date.now();

        try {
            console.log(`[${executionId}] Starting alert workflow for boat: ${eventData.boatId}`);

            // Step 1: Classify zone
            const zoneResult = await this.tools.boundary._call({
                lat: eventData.position[0],
                lng: eventData.position[1]
            });
            const zone = JSON.parse(zoneResult);
            console.log(`[${executionId}] Zone classified: ${zone.zone}`);

            // Step 2: Calculate distance (if not already provided)
            let distance = eventData.distanceMeters;
            if (!distance && zone.zone !== 'SAFE_ZONE') {
                // Calculate to boundary center
                const boundaryCenter = [9.1, 79.2];
                const distResult = await this.tools.distance._call({
                    lat1: eventData.position[0],
                    lng1: eventData.position[1],
                    lat2: boundaryCenter[0],
                    lng2: boundaryCenter[1]
                });
                distance = JSON.parse(distResult).distanceMeters;
            }

            // Step 3: Assess hazards
            const hazardResult = await this.tools.hazard._call({
                zone: zone.zone,
                weather: eventData.weatherCondition,
                speed: eventData.speed
            });
            const hazards = JSON.parse(hazardResult);
            console.log(`[${executionId}] Risk score: ${hazards.riskScore}/10`);

            // Step 4: Calculate safety index
            const safetyResult = await this.tools.safety._call({
                boatId: eventData.boatId,
                lat: eventData.position[0],
                lng: eventData.position[1]
            });
            const safetyIndex = JSON.parse(safetyResult);

            // Step 5: Generate alert with enriched context
            const enrichedEventData = {
                ...eventData,
                distanceMeters: distance,
                zone: zone.zone,
                zoneInfo: zone,
                hazardInfo: hazards,
                safetyIndex: safetyIndex.safetyIndex
            };

            const alertResult = await this.agent.generateAlert(enrichedEventData);
            const elapsed = Date.now() - startTime;

            const execution = {
                executionId,
                eventData,
                steps: {
                    zone,
                    distance,
                    hazards,
                    safetyIndex
                },
                alert: alertResult,
                elapsed: `${elapsed}ms`
            };

            this.executionHistory.push(execution);
            console.log(`[${executionId}] Alert generated in ${elapsed}ms`);

            return execution;
        } catch (error) {
            console.error(`[${executionId}] Orchestration failed:`, error.message);
            return {
                executionId,
                error: error.message,
                alert: {
                    success: false,
                    displayText: "Alert system error",
                    voiceText: "Alert system error",
                    severity: "critical"
                }
            };
        }
    }

    /**
     * Get last N executions for monitoring/debugging
     */
    getExecutionHistory(limit = 10) {
        return this.executionHistory.slice(-limit).map((exec) => ({
            executionId: exec.executionId,
            boatId: exec.eventData.boatId,
            status: exec.eventData.status,
            zone: exec.steps?.zone?.zone,
            riskScore: exec.steps?.hazards?.riskScore,
            alertSeverity: exec.alert?.severity,
            elapsed: exec.elapsed
        }));
    }
}

export { AlertOrchestrator };
