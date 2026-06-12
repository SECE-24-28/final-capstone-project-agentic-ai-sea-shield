import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Plain text for demo simplicity, use bcrypt in prod!
  role: { type: String, enum: ['fisherman', 'admin', 'family'], default: 'fisherman' },
  language: { type: String, enum: ['en', 'ta', 'si', 'ml', 'te', 'kn', 'hi', 'mr', 'gu', 'bn', 'or'], default: 'en' },
  boatId: { type: String },
  familyPhone: { type: String },
  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model('User', userSchema);
