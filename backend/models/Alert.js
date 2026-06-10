import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  boatId: { type: String },
  type: { type: String, required: true, enum: ['BORDER_WARNING', 'SOS', 'HIGH_RISK_ZONE', 'INFO'] },
  timestamp: { type: Date, default: Date.now },
  message: { type: String, required: true },
  location: {
    lat: { type: Number, required: false },
    lng: { type: Number, required: false }
  },
  resolved: { type: Boolean, default: false }
});

export default mongoose.model('Alert', alertSchema);
