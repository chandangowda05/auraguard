import mongoose from 'mongoose';

const GPSLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wristbandId: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  battery: { type: Number },
  signalStrength: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('GPSLog', GPSLogSchema);
