import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true }, // 'Family_ID' or 'Admin'
  receiverId: { type: String, required: true }, // 'Boat_ID'
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

export default mongoose.model('Message', messageSchema);
