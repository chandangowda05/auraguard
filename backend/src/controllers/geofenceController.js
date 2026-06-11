import Geofence from '../models/Geofence.js';
import { getDBStatus } from '../config/db.js';
import { mockStore } from '../config/mockStore.js';

export async function getGeofences(req, res) {
  try {
    if (getDBStatus()) {
      const geofences = await Geofence.find({});
      res.json(geofences);
    } else {
      res.json(mockStore.geofences);
    }
  } catch (error) {
    console.error('Error fetching geofences:', error);
    res.status(500).json({ error: 'Server error fetching geofences' });
  }
}

export async function createGeofence(req, res) {
  const { name, coordinates, type } = req.body;
  if (!name || !coordinates || !coordinates.length) {
    return res.status(400).json({ error: 'Geofence name and coordinates are required' });
  }

  try {
    const isDb = getDBStatus();
    let newGeofence;

    if (isDb) {
      newGeofence = await Geofence.create({ name, coordinates, type });
    } else {
      newGeofence = {
        _id: 'geo_' + Math.random().toString(36).substr(2, 9),
        name,
        coordinates,
        type: type || 'restricted',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStore.geofences.push(newGeofence);
    }

    res.status(201).json(newGeofence);
  } catch (error) {
    console.error('Error creating geofence:', error);
    res.status(500).json({ error: 'Server error creating geofence' });
  }
}

export async function updateGeofence(req, res) {
  const { id } = req.params;
  const { name, coordinates, type } = req.body;

  try {
    const isDb = getDBStatus();
    let updatedGeofence;

    if (isDb) {
      updatedGeofence = await Geofence.findByIdAndUpdate(
        id,
        { name, coordinates, type },
        { new: true }
      );
      if (!updatedGeofence) {
        return res.status(404).json({ error: 'Geofence not found' });
      }
    } else {
      const idx = mockStore.geofences.findIndex(g => g._id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Geofence not found' });
      }

      const original = mockStore.geofences[idx];
      updatedGeofence = {
        ...original,
        name: name !== undefined ? name : original.name,
        coordinates: coordinates !== undefined ? coordinates : original.coordinates,
        type: type !== undefined ? type : original.type,
        updatedAt: new Date()
      };
      mockStore.geofences[idx] = updatedGeofence;
    }

    res.json(updatedGeofence);
  } catch (error) {
    console.error('Error updating geofence:', error);
    res.status(500).json({ error: 'Server error updating geofence' });
  }
}

export async function deleteGeofence(req, res) {
  const { id } = req.params;

  try {
    if (getDBStatus()) {
      const result = await Geofence.findByIdAndDelete(id);
      if (!result) {
        return res.status(404).json({ error: 'Geofence not found' });
      }
    } else {
      const idx = mockStore.geofences.findIndex(g => g._id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Geofence not found' });
      }
      mockStore.geofences.splice(idx, 1);
    }
    res.json({ message: 'Geofence deleted successfully' });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    res.status(500).json({ error: 'Server error deleting geofence' });
  }
}
