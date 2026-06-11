import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  wristbandId: { type: String },
  alertType: { type: String, required: true }, // e.g. 'Restricted Area Entry', 'Fall Detection', 'Long Inactivity', 'Running', 'Emergency Button'
  severity: { type: String, enum: ['Critical', 'Warning', 'Information'], required: true },
  message: { type: String, required: true },
  location: {
    latitude: Number,
    longitude: Number
  },
  status: { type: String, enum: ['Active', 'Acknowledged'], default: 'Active' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Alert', AlertSchema);
