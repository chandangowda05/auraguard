import User from '../models/User.js';
import GPSLog from '../models/GPSLog.js';
import Alert from '../models/Alert.js';
import ActivityLog from '../models/ActivityLog.js';
import Geofence from '../models/Geofence.js';
import { getDBStatus } from '../config/db.js';
import { mockStore, mockDeviceStatus } from '../config/mockStore.js';
import { isPointInPolygon } from '../services/geofenceService.js';
import { classifyActivity } from '../services/aiActivityService.js';
import { getIo } from '../app.js'; // Helper to get WebSocket instance for broadcasts

// Cache to prevent duplicate alert spamming (e.g., 2 minutes cooldown per wearer per alert type)
const alertCooldowns = new Map();

function shouldTriggerAlert(wristbandId, alertType) {
  const key = `${wristbandId}_${alertType}`;
  const now = Date.now();
  if (alertCooldowns.has(key)) {
    const lastTriggered = alertCooldowns.get(key);
    if (now - lastTriggered < 1000 * 60 * 2) {
      // Cooldown active (2 minutes)
      return false;
    }
  }
  alertCooldowns.set(key, now);
  return true;
}

// Keep track of stillness durations in memory to trigger inactivity alerts
// map: wristbandId -> timestamp when stillness started
const stillnessTimers = new Map();

export async function handleESP32Data(req, res) {
  const {
    deviceId, // e.g. "WB001"
    latitude,
    longitude,
    activity,  // e.g. "running", "fall", "normal", "emergency", or undefined
    battery,
    signalStrength,
    ax, ay, az, // Raw accelerations (optional)
    emergency // Boolean flag (optional, true when button pressed)
  } = req.body;

  if (!deviceId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'deviceId, latitude, and longitude are required' });
  }

  const numLat = Number(latitude);
  const numLng = Number(longitude);
  const numBattery = battery !== undefined ? Number(battery) : 85;
  const numSignal = signalStrength !== undefined ? Number(signalStrength) : 4;

  try {
    const isDb = getDBStatus();
    let user;

    // 1. Resolve Wearer
    if (isDb) {
      user = await User.findOne({ wristbandId: deviceId, role: 'wearer' });
    } else {
      user = mockStore.users.find(u => u.wristbandId === deviceId && u.role === 'wearer');
    }

    if (!user) {
      // Create a temporary mock wearer if doesn't exist to make testing super fluid!
      const tempName = `Simulated User (${deviceId})`;
      if (isDb) {
        user = await User.create({
          name: tempName,
          phone: '+1000000000',
          wristbandId: deviceId,
          role: 'wearer',
          status: 'Active'
        });
      } else {
        user = {
          _id: 'usr_' + deviceId,
          name: tempName,
          phone: '+1000000000',
          wristbandId: deviceId,
          role: 'wearer',
          status: 'Active',
          assignedZone: ''
        };
        mockStore.users.push(user);
      }
    }

    // 2. Activity Classification (AI Accelerometer Check)
    let finalActivity = 'Normal State';
    const hasRawSensor = ax !== undefined && ay !== undefined && az !== undefined;
    
    if (emergency) {
      finalActivity = 'Emergency';
    } else if (activity) {
      // Map string input to uniform display names
      const actLower = activity.toLowerCase();
      if (actLower === 'fall' || actLower === 'fall detection') finalActivity = 'Fall Detection';
      else if (actLower === 'running') finalActivity = 'Running';
      else if (actLower === 'inactivity' || actLower === 'still') finalActivity = 'Inactivity';
      else finalActivity = 'Normal State';
    } else if (hasRawSensor) {
      // AI check using our service
      const rawClassification = classifyActivity({ ax: Number(ax), ay: Number(ay), az: Number(az) });
      
      if (rawClassification === 'Fall Detection') {
        finalActivity = 'Fall Detection';
      } else if (rawClassification === 'Running') {
        finalActivity = 'Running';
      } else if (rawClassification === 'Still') {
        // Stillness tracking: If stationary for > 5 minutes, mark as Inactivity
        const now = Date.now();
        if (!stillnessTimers.has(deviceId)) {
          stillnessTimers.set(deviceId, now);
        }
        const stillDuration = now - stillnessTimers.get(deviceId);
        if (stillDuration > 1000 * 60 * 5) {
          finalActivity = 'Inactivity';
        } else {
          finalActivity = 'Normal State'; // Under 5 minutes is still normal/safe
        }
      } else {
        stillnessTimers.delete(deviceId); // Reset timer if moving
        finalActivity = 'Normal State';
      }
    } else {
      stillnessTimers.delete(deviceId);
    }

    // Update dynamic health statuses (battery & last connected) in mock store
    if (!isDb) {
      mockDeviceStatus[deviceId] = {
        battery: numBattery,
        signalStrength: numSignal,
        status: 'Online',
        lastConnected: new Date()
      };
    }

    // 3. Geofencing Boundary Checks
    let geofences = [];
    if (isDb) {
      geofences = await Geofence.find({});
    } else {
      geofences = mockStore.geofences;
    }

    let activeViolations = [];
    const currentPoint = { lat: numLat, lng: numLng };

    const restrictedEntries = [];
    const warningEntries = [];
    let exitedSafeZone = false;

    for (const fence of geofences) {
      const isInside = isPointInPolygon(currentPoint, fence.coordinates);
      if (isInside) {
        if (fence.type === 'restricted') {
          restrictedEntries.push(fence.name);
          activeViolations.push(fence.name);
        } else if (fence.type === 'warning') {
          warningEntries.push(fence.name);
          activeViolations.push(fence.name);
        }
      }
    }

    // If there are safe zones configured, the wearer must be inside at least one of them
    const safeZones = geofences.filter(f => f.type === 'safe');
    if (safeZones.length > 0) {
      const insideAnySafe = safeZones.some(f => isPointInPolygon(currentPoint, f.coordinates));
      if (!insideAnySafe) {
        exitedSafeZone = true;
        activeViolations.push('Outside Safe Zone');
      }
    }

    // 4. Save Logs in DB/Mock
    let gpsLog;
    let activityLog;
    const generatedAlerts = [];

    if (isDb) {
      gpsLog = await GPSLog.create({
        userId: user._id,
        wristbandId: deviceId,
        latitude: numLat,
        longitude: numLng,
        battery: numBattery,
        signalStrength: numSignal
      });

      activityLog = await ActivityLog.create({
        userId: user._id,
        wristbandId: deviceId,
        activityType: finalActivity === 'Emergency' ? 'Normal State' : finalActivity,
        rawSensorData: hasRawSensor ? { ax: Number(ax), ay: Number(ay), az: Number(az) } : undefined
      });
    } else {
      gpsLog = {
        userId: user._id,
        wristbandId: deviceId,
        latitude: numLat,
        longitude: numLng,
        battery: numBattery,
        signalStrength: numSignal,
        timestamp: new Date()
      };
      mockStore.gpsLogs.push(gpsLog);

      activityLog = {
        userId: user._id,
        wristbandId: deviceId,
        activityType: finalActivity === 'Emergency' ? 'Normal State' : finalActivity,
        rawSensorData: hasRawSensor ? { ax: Number(ax), ay: Number(ay), az: Number(az) } : undefined,
        timestamp: new Date()
      };
      mockStore.activityLogs.push(activityLog);
    }

    // 5. Alert Triggers
    const alertsToTrigger = [];

    // Trigger A: Geofence violation
    if (restrictedEntries.length > 0) {
      alertsToTrigger.push({
        alertType: 'Restricted Area Entry',
        severity: 'Critical',
        message: `${user.name} entered restricted area: ${restrictedEntries.join(', ')}`
      });
    }
    if (warningEntries.length > 0) {
      alertsToTrigger.push({
        alertType: 'Warning Area Entry',
        severity: 'Warning',
        message: `${user.name} entered warning area: ${warningEntries.join(', ')}`
      });
    }
    if (exitedSafeZone) {
      alertsToTrigger.push({
        alertType: 'Safe Zone Exit',
        severity: 'Critical',
        message: `${user.name} exited the designated Safe Zone boundary!`
      });
    }

    // Trigger B: Fall Detection
    if (finalActivity === 'Fall Detection') {
      alertsToTrigger.push({
        alertType: 'Fall Detection',
        severity: 'Critical',
        message: `Emergency: Fall detected for ${user.name} (Sudden deceleration drop)`
      });
    }

    // Trigger C: Long Inactivity Detection
    if (finalActivity === 'Inactivity') {
      alertsToTrigger.push({
        alertType: 'Long Inactivity Detection',
        severity: 'Warning',
        message: `Warning: ${user.name} has been stationary for over 5 minutes`
      });
    }

    // Trigger D: Running Detection
    if (finalActivity === 'Running') {
      alertsToTrigger.push({
        alertType: 'Running Detection',
        severity: 'Warning',
        message: `Activity Alert: ${user.name} is running (High acceleration)`
      });
    }

    // Trigger E: Emergency Button
    if (emergency || finalActivity === 'Emergency') {
      alertsToTrigger.push({
        alertType: 'Emergency Button',
        severity: 'Critical',
        message: `CRITICAL ALERT: Emergency button pressed by ${user.name}!`
      });
    }

    // Create and emit the alerts
    for (const alertData of alertsToTrigger) {
      if (shouldTriggerAlert(deviceId, alertData.alertType)) {
        let alertObj;
        if (isDb) {
          alertObj = await Alert.create({
            userId: user._id,
            wristbandId: deviceId,
            alertType: alertData.alertType,
            severity: alertData.severity,
            message: alertData.message,
            location: { latitude: numLat, longitude: numLng },
            status: 'Active'
          });
          // Attach userName for websocket
          alertObj = alertObj.toObject();
          alertObj.userName = user.name;
        } else {
          alertObj = {
            _id: 'alt_' + Math.random().toString(36).substr(2, 9),
            userId: user._id,
            userName: user.name,
            wristbandId: deviceId,
            alertType: alertData.alertType,
            severity: alertData.severity,
            message: alertData.message,
            location: { latitude: numLat, longitude: numLng },
            status: 'Active',
            timestamp: new Date()
          };
          mockStore.alerts.push(alertObj);
        }
        generatedAlerts.push(alertObj);

        // Broadcast alert immediately via WebSocket
        const io = getIo();
        if (io) {
          io.emit('new_alert', alertObj);
        }
      }
    }

    // 6. Broadcast Telemetry Update via WebSocket
    const io = getIo();
    const telemetryUpdate = {
      userId: user._id,
      userName: user.name,
      wristbandId: deviceId,
      latitude: numLat,
      longitude: numLng,
      battery: numBattery,
      signalStrength: numSignal,
      activity: finalActivity,
      violations: activeViolations,
      timestamp: new Date()
    };

    if (io) {
      io.emit('telemetry', telemetryUpdate);
    }

    res.json({
      success: true,
      classifiedActivity: finalActivity,
      violations: activeViolations,
      alertsTriggered: generatedAlerts.length,
      telemetry: telemetryUpdate
    });
  } catch (error) {
    console.error('Error processing ESP32 telemetry:', error);
    res.status(500).json({ error: 'Server error processing telemetry' });
  }
}
