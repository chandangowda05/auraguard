import GPSLog from '../models/GPSLog.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { getDBStatus } from '../config/db.js';
import { mockStore, mockDeviceStatus } from '../config/mockStore.js';

export async function getLocations(req, res) {
  try {
    const isDb = getDBStatus();
    let wearers = [];

    if (isDb) {
      wearers = await User.find({ role: 'wearer' });
    } else {
      wearers = mockStore.users.filter(u => u.role === 'wearer');
    }

    const locations = [];

    for (const wearer of wearers) {
      let latestGps = null;
      let latestActivity = 'Normal State';

      if (isDb) {
        // Find latest GPS log
        latestGps = await GPSLog.findOne({ userId: wearer._id }).sort({ timestamp: -1 });
        // Find latest Activity log
        const actLog = await ActivityLog.findOne({ userId: wearer._id }).sort({ timestamp: -1 });
        if (actLog) {
          latestActivity = actLog.activityType;
        }
      } else {
        const userLogs = mockStore.gpsLogs.filter(g => g.userId === wearer._id);
        if (userLogs.length > 0) {
          latestGps = userLogs[userLogs.length - 1];
        }
        
        const userActs = mockStore.activityLogs.filter(a => a.userId === wearer._id);
        if (userActs.length > 0) {
          latestActivity = userActs[userActs.length - 1].activityType;
        }
      }

      // Dynamic battery check
      let battery = 85;
      let signalStrength = 4;
      let status = wearer.status;

      if (!isDb && mockDeviceStatus[wearer.wristbandId]) {
        battery = mockDeviceStatus[wearer.wristbandId].battery;
        signalStrength = mockDeviceStatus[wearer.wristbandId].signalStrength;
      } else if (latestGps) {
        battery = latestGps.battery !== undefined ? latestGps.battery : 85;
        signalStrength = latestGps.signalStrength !== undefined ? latestGps.signalStrength : 4;
      }

      locations.push({
        userId: wearer._id,
        name: wearer.name,
        wristbandId: wearer.wristbandId,
        assignedZone: wearer.assignedZone,
        status: status,
        latitude: latestGps ? latestGps.latitude : 12.9716, // Fallback center of Bangalore
        longitude: latestGps ? latestGps.longitude : 77.5946,
        battery,
        signalStrength,
        activity: latestActivity,
        timestamp: latestGps ? latestGps.timestamp : new Date()
      });
    }

    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Server error fetching locations' });
  }
}

export async function createLocation(req, res) {
  const { wristbandId, latitude, longitude, battery, signalStrength } = req.body;

  if (!wristbandId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'wristbandId, latitude, and longitude are required' });
  }

  try {
    const isDb = getDBStatus();
    let user;

    if (isDb) {
      user = await User.findOne({ wristbandId });
    } else {
      user = mockStore.users.find(u => u.wristbandId === wristbandId);
    }

    if (!user) {
      return res.status(404).json({ error: 'No user assigned to this wristband' });
    }

    const numLat = Number(latitude);
    const numLng = Number(longitude);
    const numBattery = battery !== undefined ? Number(battery) : 85;
    const numSignal = signalStrength !== undefined ? Number(signalStrength) : 4;

    let newGpsLog;
    if (isDb) {
      newGpsLog = await GPSLog.create({
        userId: user._id,
        wristbandId,
        latitude: numLat,
        longitude: numLng,
        battery: numBattery,
        signalStrength: numSignal
      });
    } else {
      newGpsLog = {
        userId: user._id,
        wristbandId,
        latitude: numLat,
        longitude: numLng,
        battery: numBattery,
        signalStrength: numSignal,
        timestamp: new Date()
      };
      mockStore.gpsLogs.push(newGpsLog);
    }

    res.status(201).json(newGpsLog);
  } catch (error) {
    console.error('Error creating GPS log:', error);
    res.status(500).json({ error: 'Server error creating GPS log' });
  }
}
