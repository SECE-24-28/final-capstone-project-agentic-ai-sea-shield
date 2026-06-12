# SeaShield Maritime Alert AI Agent - Technical Architecture

## Overview
The Maritime Alert Agent is a **real AI agent** that replaces hardcoded if/else alert logic with LLM-based reasoning and contextual understanding.

## Tech Stack

### Core Framework
- **LangChain** (`@langchain/core`, `@langchain/community`)
  - Prompt engineering and template management
  - LLM chain orchestration
  - Tool/agent abstraction

- **LangGraph** (`@langchain/langgraph`)
  - Agentic workflow orchestration
  - State management across reasoning steps
  - Tool execution planning

- **Model Context Protocol (MCP)**
  - Tool registration and discovery
  - Extensible tool interface
  - Future integration with external services

### LLM Support
- **Ollama** (local, open-source models)
  - `llama2:latest`, `mistral`, `neural-chat`
  - No API key required
  - ~13B parameters optimal for maritime domain

- **OpenAI** (cloud, commercial)
  - `gpt-3.5-turbo` or `gpt-4`
  - Highest accuracy, requires API key

- **Future:** Anthropic Claude, Groq, Azure OpenAI

### Supporting Libraries
- **Zod** - type-safe schema validation
- **Socket.IO** - real-time event streaming
- **Express** - HTTP API server
- **Mongoose** - MongoDB integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 FishermanDashboard (React)                   │
│            Location Tracking + Real-time Updates             │
└────────────────────────────┬────────────────────────────────┘
                             │
                    socket.emit('location_update')
                             │
                ┌────────────▼──────────────┐
                │   Express Backend Server   │
                │  POST /api/ai-alert       │
                └────────────┬──────────────┘
                             │
        ┌────────────────────▼─────────────────────┐
        │      Alert Agent Orchestrator             │
        │   (AlertOrchestrator.js)                  │
        ├──────────────────────────────────────────┤
        │  1. ZONE CLASSIFICATION                   │
        │     → Boundary Classifier Tool            │
        │     → Outputs: SAFE_ZONE, CORAL_REEF...   │
        │                                           │
        │  2. DISTANCE CALCULATION                  │
        │     → Distance Calculator Tool            │
        │     → Haversine formula for maritime geom │
        │                                           │
        │  3. HAZARD ASSESSMENT                     │
        │     → Hazard Assessment Tool              │
        │     → Risk scoring (0-10 scale)           │
        │                                           │
        │  4. SAFETY INDEX COMPUTATION              │
        │     → Safety Index Tool                   │
        │     → Fisherman safety score (0-100)      │
        └─────────────┬──────────────────────────────┘
                      │
         ┌────────────▼───────────────┐
         │  MaritimeAlertAgent (LLM)   │
         │ (MaritimeAlertAgent.js)     │
         ├────────────────────────────┤
         │ LangChain Prompt Template   │
         │ + LLM Chain Execution       │
         │ + JSON Output Parsing       │
         └────────────┬────────────────┘
                      │
         ┌────────────▼───────────────┐
         │   LLM Provider (Factory)    │
         │  (LLMProvider.js)           │
         ├────────────────────────────┤
         │ OpenAI / Ollama / Claude    │
         │ Model agnostic interface    │
         └────────────┬────────────────┘
                      │
    ┌─────────────────▼──────────────────┐
    │       External LLM Service          │
    ├─────────────────────────────────────┤
    │ • Ollama (http://localhost:11434)   │
    │ • OpenAI (api.openai.com)           │
    │ • Anthropic (api.anthropic.com)     │
    └─────────────────────────────────────┘
                      │
                      │ LLM Response (JSON)
                      │
        ┌─────────────▼──────────────┐
        │   Orchestrator Completes    │
        │   Execution & Logs History  │
        └─────────────┬──────────────┘
                      │
    ┌─────────────────▼──────────────────┐
    │   Structured Alert Response         │
    ├─────────────────────────────────────┤
    │ {                                   │
    │   "displayText": "...",             │
    │   "voiceText": "...",               │
    │   "severity": "warning|critical",   │
    │   "action": "..."                   │
    │ }                                   │
    └─────────────┬──────────────────────┘
                  │
                  │ Socket.emit('system_alert')
                  ▼
        Frontend + Family Dashboard
```

## LangChain Workflow

### 1. Prompt Engineering (MaritimeAlertAgent)
- **System Prompt**: Maritime safety expert role
- **Context**: Alert type, position, hazards, weather
- **Output Format**: Strict JSON schema (100-char messages, voice alert, severity)
- **Temperature**: 0.7 (balanced creativity + consistency)

### 2. Tool Execution (AlertTools)
```
BoundaryClassifierTool
  ├─ Input: [lat, lng]
  └─ Output: zone classification (SAFE_ZONE, CORAL_REEF_ZONE, SRI_LANKA_IMBL, DANGER_ZONE)

DistanceCalculatorTool
  ├─ Input: [lat1, lng1, lat2, lng2]
  └─ Output: distance in meters using Haversine formula

HazardAssessmentTool
  ├─ Input: zone, weather, speed
  └─ Output: hazard list + risk score (0-10)

SafetyIndexTool
  ├─ Input: boatId, lat, lng
  └─ Output: fisherman safety index (0-100)
```

### 3. Orchestrator State Flow
```
START
  ↓
[Step 1] Zone Classification
  ├─ Query boundary classifier
  └─ Store zone in execution state
  ↓
[Step 2] Distance & Geolocation
  ├─ Calculate distance to boundary
  └─ Update state with distance
  ↓
[Step 3] Hazard Assessment
  ├─ Assess maritime hazards
  └─ Calculate risk score
  ↓
[Step 4] Safety Index
  ├─ Compute fisherman safety
  └─ Update boat safety profile
  ↓
[Step 5] LLM Alert Generation
  ├─ Build rich context from steps 1-4
  ├─ Call LLM with Maritime Prompt
  ├─ Parse JSON response
  └─ Validate alert message
  ↓
[Step 6] Response & History
  ├─ Return structured alert
  ├─ Log execution to history
  └─ Emit to socket/broadcast
  ↓
END
```

## MCP Integration Points

### Current Tools (Native Implementation)
- Zone classification
- Distance calculation
- Hazard assessment
- Safety index

### Future MCP Extensions
- Weather API tool (NOAA, IMD)
- AIS vessel tracking tool
- Coast Guard communication tool
- Real-time nautical chart tool
- Emergency escalation tool

## Prompt Engineering Example

```
System Role:
"You are a maritime safety alert system expert. Generate concise, 
actionable alert messages for fishing boats in the Indian Ocean region."

Input Context:
{
  "event": "DANGER_SRI_LANKA",
  "position": [9.4, 79.6],
  "distance": 150,
  "zone": "SRI_LANKA_IMBL",
  "hazards": ["illegal border crossing", "coast guard interception"],
  "riskScore": 9.5
}

Expected Output (JSON):
{
  "message": "CRITICAL: Crossed into Sri Lankan waters. Turn back now.",
  "voiceAlert": "Critical: You have illegally crossed the maritime boundary.",
  "severity": "critical",
  "recommendedAction": "Reverse course immediately to safe zone"
}
```

## Installation & Setup

### Option 1: Local (Ollama - Recommended for Dev)

```bash
# 1. Install Ollama
# macOS: brew install ollama
# Linux: curl https://ollama.ai/install.sh | sh
# Windows: Download from ollama.ai

# 2. Start Ollama daemon
ollama serve

# 3. In another terminal, pull a model
ollama pull llama2:latest

# 4. Install dependencies
cd backend
npm install

# 5. Configure environment
cp .env.example .env
# Edit .env:
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434

# 6. Start SeaShield backend
npm start
```

### Option 2: Cloud (OpenAI)

```bash
# 1. Get OpenAI API key from platform.openai.com

# 2. Set environment
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-xxxxxxx
export LLM_MODEL=gpt-3.5-turbo

# 3. Start server
npm start
```

## Performance Metrics

| Metric | Ollama (llama2) | OpenAI (GPT-3.5) |
|--------|-----------------|-----------------|
| Time to Alert | 2-4s | 0.5-1s |
| Cost per Alert | Free (local) | ~$0.001 |
| Accuracy | High | Highest |
| Privacy | Full (local) | API logs retained |
| Model Size | 13B parameters | Proprietary |

## Testing Alert Agent

```bash
# Test endpoint
curl -X POST http://localhost:5000/api/ai-alert \
  -H "Content-Type: application/json" \
  -d '{
    "boatId": "BOAT_001",
    "status": "WARNING",
    "position": [9.2, 79.3],
    "distanceMeters": 450,
    "weatherCondition": "clear"
  }'

# Expected response:
{
  "success": true,
  "displayText": "Approaching maritime border! (450m away)",
  "voiceText": "Warning. You are approaching the maritime boundary.",
  "severity": "warning",
  "action": "Turn away to safe zone",
  "source": "llm"
}
```

## Monitoring & Debugging

```bash
# View execution history
curl http://localhost:5000/api/alert-agent/history

# Response:
{
  "executions": [
    {
      "executionId": "exec-1718192845123",
      "boatId": "BOAT_001",
      "status": "WARNING",
      "zone": "DANGER",
      "riskScore": 6.5,
      "alertSeverity": "warning",
      "elapsed": "2345ms"
    }
  ]
}
```

## Future Enhancements

1. **Multi-turn Reasoning**: Ask follow-up questions about hazards
2. **Adaptive Prompting**: Adjust prompt based on fisherman behavior
3. **Vector Embeddings**: Use similarity search for alert templates
4. **Fine-tuning**: Train on SeaShield historical alerts
5. **Real-time Dashboard**: Monitor agent decisions in real-time
6. **A/B Testing**: Compare LLM vs. template alerts
7. **Feedback Loop**: Use family/coast guard feedback to improve LLM

## References

- LangChain Docs: https://python.langchain.com/
- Ollama Models: https://ollama.ai/library
- OpenAI API: https://platform.openai.com/docs
- Model Context Protocol: https://modelcontextprotocol.io/
