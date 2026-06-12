# SeaShield AI Alert System - Quick Setup Guide

## What's New

✅ **Full LLM-powered AI agent** integrated into the backend
✅ **LangChain + LangGraph** orchestration for intelligent alert reasoning
✅ **Multi-tool MCP system** for zone classification, distance calculation, hazard assessment
✅ **Graceful fallback** to template-based alerts if LLM unavailable
✅ **Real-time monitoring** endpoints for agent execution history

---

## Quick Start: 2 Options

### Option 1: Local AI (Ollama) - Recommended for Development

```bash
# Step 1: Install Ollama
# macOS:
brew install ollama

# Linux:
curl https://ollama.ai/install.sh | sh

# Windows: Download from https://ollama.ai

# Step 2: Start Ollama in background
ollama serve &

# Step 3: Pull a model
ollama pull llama2:latest
# Or try: ollama pull mistral:latest (faster)

# Step 4: Install backend dependencies
cd backend
npm install

# Step 5: Create .env file
cat > .env << EOF
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=llama2:latest
MONGODB_URI=mongodb://127.0.0.1:27017/seashield
PORT=5000
NODE_ENV=development
EOF

# Step 6: Start SeaShield backend
npm start

# Step 7: In another terminal, start frontend
cd frontend
npm install
npm run dev
```

**Expected output on startup:**
```
🤖 Initializing Maritime Alert AI Agent...
✅ AI Alert Agent initialized
```

---

### Option 2: Cloud AI (OpenAI) - Fast & Accurate

```bash
# Step 1: Get OpenAI API key
# Visit https://platform.openai.com/api-keys
# Create new secret key

# Step 2: Install backend dependencies
cd backend
npm install

# Step 3: Create .env file
cat > .env << EOF
LLM_PROVIDER=openai
LLM_API_KEY=sk-your-key-here
LLM_MODEL=gpt-3.5-turbo
MONGODB_URI=mongodb://127.0.0.1:27017/seashield
PORT=5000
NODE_ENV=development
EOF

# Step 4: Start backend
npm start

# Step 5: Start frontend
cd frontend
npm install
npm run dev
```

---

## How It Works

```
FishermanDashboard
    ↓ location_update every 2-5 seconds
Backend Server
    ↓ analyzes position, status, distance
AlertOrchestrator (LangGraph)
    ├─ Step 1: Classify maritime zone (SAFE, CORAL_REEF, SRI_LANKA, DANGER)
    ├─ Step 2: Calculate distance to boundaries (Haversine)
    ├─ Step 3: Assess hazards & risk score (0-10)
    ├─ Step 4: Compute fisherman safety index (0-100)
    └─ Step 5: Call LLM with enriched context
        ↓
    LLM (Ollama or OpenAI)
        ↓ Returns JSON alert
    {
      "message": "Approaching maritime boundary in 450m. Turn away now.",
      "voiceAlert": "Warning. Maritime boundary 450 meters away.",
      "severity": "warning",
      "recommendedAction": "Turn back to safe zone"
    }
        ↓
Frontend receives alert
    ├─ Display message
    ├─ Speak via text-to-speech
    └─ Broadcast to family dashboard
```

---

## Testing the AI Alert System

### Test 1: Check Agent Status

```bash
curl http://localhost:5000/api/alert-agent/status

# Expected response:
{
  "status": "active",
  "initialized": true,
  "message": "AI Alert Agent is running"
}
```

### Test 2: Generate AI Alert

```bash
curl -X POST http://localhost:5000/api/ai-alert \
  -H "Content-Type: application/json" \
  -d '{
    "boatId": "BOAT_001",
    "status": "WARNING",
    "position": [9.2, 79.3],
    "distanceMeters": 450,
    "weatherCondition": "clear",
    "speed": 8
  }'

# Expected response:
{
  "success": true,
  "alert": {
    "success": true,
    "displayText": "Approaching maritime boundary! (450m away)",
    "voiceText": "Warning. You are approaching the maritime boundary.",
    "severity": "warning",
    "action": "Turn away to safe zone",
    "source": "llm"
  },
  "message": "AI alert generated and broadcasted"
}
```

### Test 3: View Agent Execution History

```bash
curl http://localhost:5000/api/alert-agent/history?limit=5

# Expected response:
{
  "count": 5,
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

---

## Fallback Behavior

If the LLM is unavailable (e.g., Ollama not running, OpenAI API down), the system automatically:

1. **Logs warning** in console
2. **Falls back to template-based alerts** (using AlertAgent.js)
3. **Continues normal operation** with predefined messages
4. **Retries LLM** on next alert

No user-facing disruption!

---

## Configuration Options

### Environment Variables

```bash
# LLM Provider
LLM_PROVIDER=ollama              # or "openai"
LLM_MODEL=llama2:latest         # or "gpt-3.5-turbo"

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434

# OpenAI (Cloud)
LLM_API_KEY=sk-xxx...

# Alert Settings
AI_ALERT_ENABLED=true           # Enable/disable AI alerts
AI_ALERT_FALLBACK=true          # Use template fallback if AI fails
AI_ALERT_TIMEOUT=5000           # Max wait time for LLM (ms)

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/seashield

# Server
PORT=5000
NODE_ENV=development
```

---

## Model Recommendations

### Ollama Models (Local)

| Model | Size | Speed | Quality | Command |
|-------|------|-------|---------|---------|
| llama2 | 13B | Medium | Good | `ollama pull llama2:latest` |
| mistral | 7B | Fast | Good | `ollama pull mistral:latest` |
| neural-chat | 7B | Fast | Very Good | `ollama pull neural-chat:latest` |
| dolphin-mixtral | 8x7B | Slow | Excellent | `ollama pull dolphin-mixtral:latest` |

### OpenAI Models (Cloud)

| Model | Cost | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| gpt-3.5-turbo | ~$0.001/alert | Fast | Good | Production |
| gpt-4 | ~$0.03/alert | Slower | Excellent | High-stakes alerts |
| gpt-4-turbo | ~$0.01/alert | Medium | Excellent | Balanced |

---

## Troubleshooting

### Issue: "Agent not available" message

**Solution:**
```bash
# Check if Ollama is running
ollama serve &

# Or use OpenAI instead
export LLM_PROVIDER=openai
export LLM_API_KEY=sk-xxx
npm start
```

### Issue: Slow alert generation (>5 seconds)

**Solution 1:** Use a faster model
```bash
ollama pull mistral:latest
# Update .env: LLM_MODEL=mistral:latest
```

**Solution 2:** Use OpenAI instead
```bash
export LLM_PROVIDER=openai
npm start
```

### Issue: "Token limit exceeded" from OpenAI

**Solution:** The context is too large. Try:
```bash
export LLM_MODEL=gpt-3.5-turbo  # Cheaper, same performance for this task
```

### Issue: Alerts not appearing in frontend

**Solution 1:** Check browser console for errors
```javascript
// Open DevTools (F12) → Console tab
// Look for fetch errors
```

**Solution 2:** Verify backend is running
```bash
curl http://localhost:5000/api/alert-agent/status
```

**Solution 3:** Check if Socket.IO connection is active
```javascript
// In browser console:
console.log(socket.connected)  // Should be true
```

---

## Monitoring & Observability

### View all agent executions in last 24 hours

```bash
# Get last 50 executions
curl http://localhost:5000/api/alert-agent/history?limit=50

# Parse with jq for analysis
curl http://localhost:5000/api/alert-agent/history | jq '.executions[] | {boatId, zone, riskScore, elapsed}'
```

### Check agent performance metrics

```bash
curl http://localhost:5000/api/alert-agent/history | \
  jq '[.executions[] | .elapsed | gsub("ms"; "") | tonumber] | add / length'
# Returns average execution time in ms
```

---

## Architecture Files

- **Backend Agent:**
  - `backend/agents/MaritimeAlertAgent.js` - LLM chain with prompts
  - `backend/agents/AlertTools.js` - MCP tools (4 tools)
  - `backend/agents/AlertOrchestrator.js` - LangGraph workflow
  - `backend/agents/LLMProvider.js` - Model factory
  - `backend/agents/index.js` - Integration & API

- **Frontend:**
  - `frontend/src/agents/AlertAgent.js` - Template-based fallback
  - `frontend/src/pages/FishermanDashboard.jsx` - API integration

- **Documentation:**
  - `backend/AI_AGENT_ARCHITECTURE.md` - Full technical details
  - `backend/.env.example` - Configuration reference

---

## Next Steps

1. ✅ Set up LLM provider (Ollama or OpenAI)
2. ✅ Start backend server
3. ✅ Test with `/api/ai-alert` endpoint
4. ✅ Monitor with `/api/alert-agent/history`
5. 🔄 **Optional:** Fine-tune prompts in `backend/agents/MaritimeAlertAgent.js`
6. 🔄 **Optional:** Add more tools in `backend/agents/AlertTools.js`
7. 🔄 **Optional:** Train custom model on SeaShield alert data

---

## Support

For issues or questions:
1. Check `backend/.env.example` for configuration
2. Review `backend/AI_AGENT_ARCHITECTURE.md` for technical details
3. Check console logs for error messages
4. Test endpoints with `curl` commands above

Happy sailing! 🚤
