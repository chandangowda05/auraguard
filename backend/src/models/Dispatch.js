import mongoose from 'mongoose';

const DispatchSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wearerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName: { type: String, required: true },
  wearerName: { type: String, required: true },
  zoneName: { type: String, required: true },
  zoneType: { type: String, enum: ['restricted', 'warning', 'safe'], default: 'restricted' },
  message: { type: String, required: true },
  status: { type: String, enum: ['Assigned', 'In Progress', 'Completed'], default: 'Assigned' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Dispatch', DispatchSchema);
