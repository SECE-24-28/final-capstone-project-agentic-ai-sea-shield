import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  boatId: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  status: { type: String, enum: ['SAFE', 'WARNING', 'DANGER', 'OFFLINE', 'WARNING_REEF', 'DANGER_SRI_LANKA'], default: 'SAFE' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Location', locationSchema);
