import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Location from './models/Location.js';
import Alert from './models/Alert.js';
import { initializeAlertAgent, generateAIAlert } from './agents/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow development frontend
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory fallback if MongoDB isn't running for the hackathon
let memoryData = {
  users: [], // List of registered users
  fleet: {}, // Map of boatId -> latest location
  alerts: [],
  messages: []
};

// Optional: MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/seashield';
let isMongoConnected = false;

// AI Alert Agent
let alertOrchestrator = null;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    isMongoConnected = true;
    seedAdmin(); // Create default admin
  })
  .catch(err => {
    console.log('MongoDB connection failed. Using in-memory fallback for demo.', err.message);
  });

// Initialize AI Alert Agent (async)
initializeAlertAgent()
  .then(orchestrator => {
    alertOrchestrator = orchestrator;
    console.log('✅ AI Alert Agent initialized');
  })
  .catch(err => {
    console.warn('⚠️  AI Alert Agent failed to initialize:', err.message);
    console.warn('Falling back to template-based alerts');
  });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('location_update', (data) => {
    // Broadcast boat movement to all clients (Family/Admin)
    socket.broadcast.emit('location_update', { ...data, timestamp: new Date() });

    // Save to memory/mongo for historical logs
    if (isMongoConnected) {
      const location = new Location({ ...data, timestamp: new Date() });
      location.save();
    } else {
      memoryData.fleet[data.boatId] = { ...data, timestamp: new Date() };
    }
  });

  socket.on('system_alert', async (data) => {
    socket.broadcast.emit('system_alert', data);
    const alertData = { ...data, timestamp: new Date() };
    if (isMongoConnected) {
      try {
        await new Alert(alertData).save();
      } catch (err) {
        console.error("Failed to save system alert to DB:", err.message);
      }
    } else {
      memoryData.alerts.push(alertData);
    }
  });

  socket.on('emergency_sos', async (data) => {
    socket.broadcast.emit('emergency_sos', data);
    const alertData = { ...data, timestamp: new Date() };
    if (isMongoConnected) {
      try {
        await new Alert(alertData).save();
      } catch (err) {
        console.error("Failed to save SOS alert to DB:", err.message);
      }
    } else {
      memoryData.alerts.push(alertData);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.post('/api/location', async (req, res) => {
  try {
    const { boatId, lat, lng, speed, status } = req.body;
    if (!boatId) return res.status(400).json({ success: false, message: 'boatId is required' });

    // Broadcast immediately to Dashboards
    io.emit('location_update', { boatId, lat, lng, speed, status, timestamp: new Date() });

    if (isMongoConnected) {
      const location = new Location({ boatId, lat, lng, speed, status });
      await location.save();
    } else {
      memoryData.fleet[boatId] = { boatId, lat, lng, speed, status, timestamp: new Date() };
    }

    res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/location/:boatId', async (req, res) => {
  try {
    const { boatId } = req.params;
    if (isMongoConnected) {
      const location = await Location.findOne({ boatId }).sort({ timestamp: -1 });
      res.status(200).json({ success: true, data: location });
    } else {
      res.status(200).json({ success: true, data: memoryData.fleet[boatId] || null });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sos', async (req, res) => {
  try {
    const { boatId, lat, lng, message } = req.body;

    // Broadcast emergency to WebSockets
    const alertData = {
      boatId: boatId || 'UNKNOWN',
      type: 'SOS',
      timestamp: new Date(),
      message: message || "Emergency signal received from fisherman boat.",
      location: { lat, lng }
    };

    io.emit('emergency_sos', alertData);

    if (isMongoConnected) {
      const alertEntry = new Alert(alertData);
      await alertEntry.save();
    } else {
      memoryData.alerts.push(alertData);
    }

    res.status(200).json({ success: true, message: 'SOS broadcasted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/alert', async (req, res) => {
  try {
    const { boatId, type, message, lat, lng } = req.body;
    const alertData = { boatId, type, message, location: { lat, lng }, timestamp: new Date() };

    io.emit('system_alert', alertData);

    if (isMongoConnected) {
      const alertEntry = new Alert(alertData);
      await alertEntry.save();
    } else {
      memoryData.alerts.push(alertData);
    }
    res.status(200).json({ success: true, message: 'Alert recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI-Powered Alert Generation Endpoint
app.post('/api/ai-alert', async (req, res) => {
  try {
    const { boatId, status, position, distanceMeters, weatherCondition, speed } = req.body;

    if (!boatId || !status || !position) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: boatId, status, position, distanceMeters'
      });
    }

    // Generate AI alert using orchestrator
    const alert = await generateAIAlert({
      boatId,
      status,
      position,
      distanceMeters: distanceMeters || 0,
      weatherCondition: weatherCondition || 'clear',
      speed: speed || 0,
      previousStatus: memoryData.fleet[boatId]?.status || 'SAFE'
    });

    // Emit alert to all connected clients
    io.emit('system_alert', {
      boatId,
      type: alert.alertType || 'INFO',
      message: alert.displayText,
      lat: position[0],
      lng: position[1],
      timestamp: new Date(),
      voiceAlert: alert.voiceText,
      severity: alert.severity,
      source: alert.source || 'ai'
    });

    // Save to DB
    if (isMongoConnected) {
      try {
        await new Alert({
          boatId,
          type: alert.alertType || 'INFO',
          message: alert.displayText,
          location: { lat: position[0], lng: position[1] }
        }).save();
      } catch (dbErr) {
        console.error('DB save failed:', dbErr.message);
      }
    } else {
      memoryData.alerts.push({
        boatId,
        type: alert.alertType || 'INFO',
        message: alert.displayText,
        location: { lat: position[0], lng: position[1] },
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      alert,
      message: 'AI alert generated and broadcasted'
    });
  } catch (error) {
    console.error('AI alert generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: true
    });
  }
});

// Alert Agent Monitoring Endpoint
app.get('/api/alert-agent/status', (req, res) => {
  res.status(200).json({
    status: alertOrchestrator ? 'active' : 'inactive',
    initialized: !!alertOrchestrator,
    message: alertOrchestrator
      ? 'AI Alert Agent is running'
      : 'AI Alert Agent not available - using template-based alerts'
  });
});

// Alert Agent History Endpoint
app.get('/api/alert-agent/history', (req, res) => {
  if (!alertOrchestrator) {
    return res.status(503).json({
      error: 'Agent not initialized',
      message: 'AI Alert Agent is not available'
    });
  }

  const limit = parseInt(req.query.limit) || 10;
  const history = alertOrchestrator.getExecutionHistory(limit);
  res.status(200).json({
    count: history.length,
    executions: history
  });
});

// Add User Model
import User from './models/User.js';

// Seed Admin User
const seedAdmin = async () => {
  if (!isMongoConnected) return;
  const adminExists = await User.findOne({ email: 'admin@seashield.com' });
  if (!adminExists) {
    await User.create({
      name: 'System Administrator',
      email: 'admin@seashield.com',
      password: 'admin', // Simple for demo
      role: 'admin',
      familyPhone: '+919999999999', // Default for testing SOS
      boatId: 'ADMIN-CONTROL'
    });
    console.log('Default Admin Account created: admin@seashield.com / admin');
  }
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, language, boatId, familyPhone } = req.body;
    // Only allow fisherman or family signup
    const finalRole = (role === 'family') ? 'family' : 'fisherman';

    if (isMongoConnected) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ success: false, message: 'User already exists' });
      const user = new User({
        name, email, password,
        role: finalRole,
        language: language || 'en',
        boatId: boatId || null,
        familyPhone: familyPhone || null
      });
      await user.save();
      res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, language: user.language, boatId: user.boatId, familyPhone: user.familyPhone } });
    } else {
      // Memory fallback
      const newUser = { id: Date.now(), name, email, password, role: finalRole, language: language || 'en', boatId: boatId || null, familyPhone: familyPhone || null, createdAt: new Date() };
      memoryData.users.push(newUser);
      res.status(201).json({ success: true, user: newUser });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role, language } = req.body;

    // Admin Shortcut for Demo
    let searchQuery = { email, password };
    if (email === 'admin' && password === 'admin') {
      searchQuery = { email: 'admin@seashield.com', password: 'admin' };
    }

    if (isMongoConnected) {
      const user = await User.findOne(searchQuery);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });


      // If language was provided in login form but not saved in DB yet (old users), or if user wants to change it
      if (language && user.language !== language) {
        user.language = language;
        await user.save();
      }

      res.status(200).json({
        success: true, user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          language: user.language,
          boatId: user.boatId,
          familyPhone: user.familyPhone
        }
      });
    } else {
      const user = memoryData.users.find(u => u.email === email && u.password === password);
      if (!user) {
        // Allow hardcoded admin if not in users
        if (email === 'admin@seashield.com' && password === 'admin') {
          return res.status(200).json({ success: true, user: { id: 'admin', name: 'System Administrator', email, role: 'admin', language: language || 'en', boatId: null } });
        }
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      res.status(200).json({ success: true, user });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const { id, familyPhone, language, name } = req.body;
    if (isMongoConnected) {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      if (familyPhone) user.familyPhone = familyPhone;
      if (language) user.language = language;
      if (name) user.name = name;

      await user.save();
      res.status(200).json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, language: user.language, boatId: user.boatId, familyPhone: user.familyPhone } });
    } else {
      const userIndex = memoryData.users.findIndex(u => u.id == id);
      if (userIndex === -1 && id !== 'admin') return res.status(404).json({ success: false, message: 'User not found' });

      if (id === 'admin') {
        // handle admin update in memory if needed
        res.status(200).json({ success: true, message: 'Admin updated (simulated)' });
      } else {
        if (familyPhone) memoryData.users[userIndex].familyPhone = familyPhone;
        if (language) memoryData.users[userIndex].language = language;
        if (name) memoryData.users[userIndex].name = name;
        res.status(200).json({ success: true, user: memoryData.users[userIndex] });
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Routes
app.get('/api/admin/users', async (req, res) => {
  try {
    if (isMongoConnected) {
      const users = await User.find({}, '-password').sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: users });
    } else {
      res.status(200).json({ success: true, data: memoryData.users });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await User.findByIdAndDelete(id);
    } else {
      memoryData.users = memoryData.users.filter(u => u.id != id);
    }
    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/alerts', async (req, res) => {
  try {
    if (isMongoConnected) {
      const alertsList = await Alert.find().sort({ timestamp: -1 }).limit(50);
      res.status(200).json({ success: true, data: alertsList });
    } else {
      res.status(200).json({ success: true, data: memoryData.alerts });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/alerts', async (req, res) => {
  try {
    if (isMongoConnected) {
      await Alert.deleteMany({});
    } else {
      memoryData.alerts = [];
    }
    res.status(200).json({ success: true, message: 'Alerts cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Trip History Route
app.get('/api/location/history/:boatId', async (req, res) => {
  try {
    const { boatId } = req.params;
    if (isMongoConnected) {
      // Get last 100 points for history
      const history = await Location.find({ boatId }).sort({ timestamp: -1 }).limit(100);
      res.status(200).json({ success: true, data: history.reverse() });
    } else {
      // Return the current point if in memory (simulated history)
      const current = memoryData.fleet[boatId];
      res.status(200).json({ success: true, data: current ? [current] : [] });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Messaging Routes
import Message from './models/Message.js';

app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    const alertData = { senderId, receiverId, content, timestamp: new Date() };

    if (isMongoConnected) {
      const msg = new Message(alertData);
      await msg.save();
    } else {
      memoryData.messages.push(alertData);
    }

    io.emit('new_message', alertData);
    res.status(201).json({ success: true, data: alertData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/messages/:receiverId', async (req, res) => {
  try {
    const { receiverId } = req.params;
    if (isMongoConnected) {
      const msgs = await Message.find({ receiverId }).sort({ timestamp: -1 }).limit(20);
      res.status(200).json({ success: true, data: msgs });
    } else {
      const msgs = memoryData.messages.filter(m => m.receiverId === receiverId);
      res.status(200).json({ success: true, data: msgs.reverse() });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fleet Monitoring (Admin) - Returns ONLY boats belonging to registered fishermen
app.get('/api/admin/fleet', async (req, res) => {
  try {
    let fishermen = [];
    if (isMongoConnected) {
      fishermen = await User.find({ role: 'fisherman' });
    } else {
      fishermen = memoryData.users.filter(u => u.role === 'fisherman');
    }

    // Only show boats for registered fishermen
    const allKnownBoatIds = fishermen.map(f => f.boatId).filter(Boolean);

    const fleetStatus = await Promise.all(allKnownBoatIds.map(async (bid) => {
      let latestLoc = null;
      if (isMongoConnected) {
        latestLoc = await Location.findOne({ boatId: bid }).sort({ timestamp: -1 });
      } else {
        latestLoc = memoryData.fleet[bid];
      }

      if (latestLoc) return latestLoc;

      // Default position if no pings received yet
      const jitter = bid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100 / 5000;
      return {
        boatId: bid,
        lat: 9.15 + jitter,
        lng: 79.15 + (jitter * -1),
        speed: 0,
        status: 'OFFLINE',
        timestamp: new Date()
      };
    }));

    res.status(200).json({ success: true, data: fleetStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
