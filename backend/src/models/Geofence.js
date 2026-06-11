import mongoose from 'mongoose';

const CoordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const GeofenceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  coordinates: { type: [CoordinateSchema], required: true }, // Polygon coordinates
  type: { type: String, enum: ['restricted', 'warning', 'safe'], default: 'restricted' }
}, { timestamps: true });

export default mongoose.model('Geofence', GeofenceSchema);
