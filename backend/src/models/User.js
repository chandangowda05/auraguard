import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  age: { type: Number },
  wristbandId: { type: String, unique: true, sparse: true },
  assignedZone: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  role: { type: String, enum: ['admin', 'supervisor', 'wearer'], default: 'wearer' },
  password: { type: String }, // For admin and supervisor dashboard logins
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
