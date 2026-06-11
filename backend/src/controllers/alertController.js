import Alert from '../models/Alert.js';
import User from '../models/User.js';
import { getDBStatus } from '../config/db.js';
import { mockStore } from '../config/mockStore.js';

export async function getAlerts(req, res) {
  try {
    if (getDBStatus()) {
      // Fetch alerts populated with user name
      const alerts = await Alert.find({}).sort({ timestamp: -1 }).populate('userId', 'name');
      // Format populated result to match expected API schema
      const formatted = alerts.map(a => ({
        ...a._doc,
        userName: a.userId ? a.userId.name : 'Unknown User'
      }));
      res.json(formatted);
    } else {
      const formatted = mockStore.alerts.map(a => {
        const u = mockStore.users.find(usr => usr._id === a.userId);
        return {
          ...a,
          userName: u ? u.name : 'Unknown User'
        };
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      res.json(formatted);
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Server error fetching alerts' });
  }
}

export async function createAlert(req, res) {
  const { wristbandId, userId, alertType, severity, message, location } = req.body;

  if (!alertType || !severity || !message) {
    return res.status(400).json({ error: 'AlertType, severity, and message are required' });
  }

  try {
    const isDb = getDBStatus();
    let finalUserId = userId;
    let finalWristbandId = wristbandId;

    // Resolve userId if not provided but wristbandId is present
    if (!finalUserId && finalWristbandId) {
      if (isDb) {
        const userObj = await User.findOne({ wristbandId: finalWristbandId });
        if (userObj) finalUserId = userObj._id;
      } else {
        const userObj = mockStore.users.find(u => u.wristbandId === finalWristbandId);
        if (userObj) finalUserId = userObj._id;
      }
    }

    let newAlert;
    if (isDb) {
      newAlert = await Alert.create({
        userId: finalUserId || undefined,
        wristbandId: finalWristbandId,
        alertType,
        severity,
        message,
        location,
        status: 'Active'
      });
    } else {
      newAlert = {
        _id: 'alt_' + Math.random().toString(36).substr(2, 9),
        userId: finalUserId,
        wristbandId: finalWristbandId,
        alertType,
        severity,
        message,
        location,
        status: 'Active',
        timestamp: new Date()
      };
      mockStore.alerts.push(newAlert);
    }

    res.status(201).json(newAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Server error creating alert' });
  }
}

export async function acknowledgeAlert(req, res) {
  const { id } = req.params;

  try {
    const isDb = getDBStatus();
    let updated;

    if (isDb) {
      updated = await Alert.findByIdAndUpdate(
        id,
        { status: 'Acknowledged' },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'Alert not found' });
      }
    } else {
      const idx = mockStore.alerts.findIndex(a => a._id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      mockStore.alerts[idx].status = 'Acknowledged';
      updated = mockStore.alerts[idx];
    }

    res.json({ message: 'Alert acknowledged successfully', alert: updated });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Server error acknowledging alert' });
  }
}
