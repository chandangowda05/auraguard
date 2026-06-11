import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wristbandId: { type: String, required: true },
  activityType: { type: String, enum: ['Normal State', 'Running', 'Inactivity', 'Fall Detection'], default: 'Normal State' },
  rawSensorData: {
    ax: Number,
    ay: Number,
    az: Number
  },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('ActivityLog', ActivityLogSchema);
