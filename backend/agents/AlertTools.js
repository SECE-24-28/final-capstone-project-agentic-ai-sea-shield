/**
 * Maritime Alert Agent Tools - MCP Protocol
 * Provides tools for:
 * - Maritime boundary querying
 * - Weather data retrieval
 * - Zone classification
 * - Hazard assessment
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";

// Tool 1: Boundary & Zone Classification
const BoundaryClassifierSchema = z.object({
    lat: z.number().describe("Latitude coordinate"),
    lng: z.number().describe("Longitude coordinate")
});

class BoundaryClassifierTool extends Tool {
    name = "classify_maritime_zone";
    description =
        "Classifies a vessel position into maritime zones: SAFE_ZONE, CORAL_REEF, SRI_LANKA_IMBL, DANGER_ZONE";
    schema = BoundaryClassifierSchema;

    async _call({ lat, lng }) {
        // Demo zone definitions
        const safeZone = {
            minLat: 8.9,
            maxLat: 9.35,
            minLng: 78.8,
            maxLng: 79.45
        };
        const coralReef = {
            minLat: 9.1,
            maxLat: 9.2,
            minLng: 79.0,
            maxLng: 79.15
        };
        const sriLanka = {
            minLat: 8.85,
            maxLat: 9.6,
            minLng: 79.4,
            maxLng: 80.5
        };

        if (
            lat >= sriLanka.minLat &&
            lat <= sriLanka.maxLat &&
            lng >= sriLanka.minLng &&
            lng <= sriLanka.maxLng
        ) {
            return JSON.stringify({
                zone: "SRI_LANKA_IMBL",
                severity: "critical",
                description: "Sri Lankan territorial waters - ILLEGAL"
            });
        }
        if (
            lat >= coralReef.minLat &&
            lat <= coralReef.maxLat &&
            lng >= coralReef.minLng &&
            lng <= coralReef.maxLng
        ) {
            return JSON.stringify({
                zone: "CORAL_REEF_ZONE",
                severity: "high",
                description: "Protected marine protected area"
            });
        }
        if (
            lat >= safeZone.minLat &&
            lat <= safeZone.maxLat &&
            lng >= safeZone.minLng &&
            lng <= safeZone.maxLng
        ) {
            return JSON.stringify({
                zone: "SAFE_ZONE",
                severity: "low",
                description: "Authorized fishing zone"
            });
        }
        return JSON.stringify({
            zone: "DANGER_ZONE",
            severity: "warning",
            description: "Outside authorized fishing area"
        });
    }
}

// Tool 2: Distance Calculator
const DistanceCalculatorSchema = z.object({
    lat1: z.number().describe("Starting latitude"),
    lng1: z.number().describe("Starting longitude"),
    lat2: z.number().describe("Destination latitude"),
    lng2: z.number().describe("Destination longitude")
});

class DistanceCalculatorTool extends Tool {
    name = "calculate_distance";
    description = "Calculates great-circle distance between two points in meters";
    schema = DistanceCalculatorSchema;

    _call({ lat1, lng1, lat2, lng2 }) {
        // Haversine formula
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return JSON.stringify({
            distanceMeters: Math.round(distance),
            distanceKm: (distance / 1000).toFixed(2)
        });
    }
}

// Tool 3: Hazard Assessment
const HazardAssessmentSchema = z.object({
    zone: z
        .string()
        .describe(
            "Maritime zone: SAFE_ZONE, CORAL_REEF_ZONE, SRI_LANKA_IMBL, DANGER_ZONE"
        ),
    weather: z.string().optional().describe("Current weather condition"),
    speed: z.number().optional().describe("Vessel speed in knots")
});

class HazardAssessmentTool extends Tool {
    name = "assess_hazards";
    description = "Assesses maritime hazards for a given zone and conditions";
    schema = HazardAssessmentSchema;

    _call({ zone, weather, speed }) {
        const hazards = {
            SRI_LANKA_IMBL: {
                level: "critical",
                hazards: ["illegal border crossing", "coast guard interception"],
                riskScore: 9.5
            },
            CORAL_REEF_ZONE: {
                level: "high",
                hazards: ["reef collision", "hull damage", "ecological damage"],
                riskScore: 8.0
            },
            DANGER_ZONE: {
                level: "warning",
                hazards: [
                    "unauthorized area",
                    "potential piracy risk",
                    "international waters"
                ],
                riskScore: 6.0
            },
            SAFE_ZONE: {
                level: "low",
                hazards: ["routine maritime operations"],
                riskScore: 2.0
            }
        };

        const baseHazard = hazards[zone] || hazards.DANGER_ZONE;
        let riskScore = baseHazard.riskScore;

        if (weather === "high_waves" || weather === "heavy_storm") {
            riskScore += 2;
        }
        if (speed && speed > 20) {
            riskScore += 1;
        }

        return JSON.stringify({
            zone,
            level: baseHazard.level,
            hazards: baseHazard.hazards,
            riskScore: Math.min(10, riskScore),
            recommendation:
                riskScore > 7 ? "IMMEDIATE ACTION REQUIRED" : "Monitor situation"
        });
    }
}

// Tool 4: Get Fisherman Safety Index
const SafetyIndexSchema = z.object({
    boatId: z.string().describe("Boat identifier"),
    lat: z.number().describe("Current latitude"),
    lng: z.number().describe("Current longitude")
});

class SafetyIndexTool extends Tool {
    name = "calculate_safety_index";
    description =
        "Calculates a fisherman safety index (0-100) based on location and maritime conditions";
    schema = SafetyIndexSchema;

    _call({ boatId, lat, lng }) {
        // Simplified safety index calculation
        const safeZoneBonus = lat > 8.9 && lat < 9.35 && lng > 78.8 && lng < 79.45 ? 40 : 0;
        const sriLankaZone = lat > 8.85 && lat < 9.6 && lng > 79.4 && lng < 80.5 ? -60 : 0;
        const boundaryWarning =
            lat > 9.2 && lat < 9.35 && lng > 79.3 && lng < 79.45 ? -20 : 0;

        let index = 50 + safeZoneBonus + sriLankaZone + boundaryWarning;
        index = Math.max(0, Math.min(100, index));

        return JSON.stringify({
            boatId,
            safetyIndex: index,
            status: index > 75 ? "SAFE" : index > 50 ? "WARNING" : "DANGER",
            recommendation:
                index < 50
                    ? "Immediate course correction required"
                    : "Continue monitoring"
        });
    }
}

export {
    BoundaryClassifierTool,
    DistanceCalculatorTool,
    HazardAssessmentTool,
    SafetyIndexTool
};
