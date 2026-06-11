import GPSLog from '../models/GPSLog.js';
import Alert from '../models/Alert.js';
import ActivityLog from '../models/ActivityLog.js';
import User from '../models/User.js';
import { getDBStatus } from '../config/db.js';
import { mockStore } from '../config/mockStore.js';

export async function getReports(req, res) {
  const { range } = req.query; // 'daily', 'weekly', 'monthly'
  const timeLimit = new Date();
  
  if (range === 'daily') {
    timeLimit.setDate(timeLimit.getDate() - 1);
  } else if (range === 'weekly') {
    timeLimit.setDate(timeLimit.getDate() - 7);
  } else {
    // monthly or default
    timeLimit.setMonth(timeLimit.getMonth() - 1);
  }

  try {
    const isDb = getDBStatus();
    let alerts = [];
    let activityLogs = [];
    let gpsLogs = [];
    let users = [];

    if (isDb) {
      alerts = await Alert.find({ timestamp: { $gte: timeLimit } }).populate('userId', 'name');
      activityLogs = await ActivityLog.find({ timestamp: { $gte: timeLimit } }).populate('userId', 'name');
      gpsLogs = await GPSLog.find({ timestamp: { $gte: timeLimit } }).populate('userId', 'name');
      users = await User.find({ role: 'wearer' });
    } else {
      alerts = mockStore.alerts.filter(a => new Date(a.timestamp) >= timeLimit);
      activityLogs = mockStore.activityLogs.filter(a => new Date(a.timestamp) >= timeLimit);
      gpsLogs = mockStore.gpsLogs.filter(g => new Date(g.timestamp) >= timeLimit);
      users = mockStore.users.filter(u => u.role === 'wearer');
    }

    // Format logs
    const alertList = alerts.map(a => {
      let userName = 'Unknown';
      if (isDb && a.userId) userName = a.userId.name;
      else if (!isDb && a.userId) {
        const u = mockStore.users.find(usr => usr._id === a.userId);
        userName = u ? u.name : 'Unknown';
      }
      return {
        id: a._id,
        userName,
        wristbandId: a.wristbandId,
        alertType: a.alertType,
        severity: a.severity,
        message: a.message,
        timestamp: a.timestamp,
        status: a.status
      };
    });

    const activitySummary = {
      normal: activityLogs.filter(a => a.activityType === 'Normal State').length,
      running: activityLogs.filter(a => a.activityType === 'Running').length,
      inactivity: activityLogs.filter(a => a.activityType === 'Inactivity').length,
      fall: activityLogs.filter(a => a.activityType === 'Fall Detection').length
    };

    const alertSummary = {
      critical: alertList.filter(a => a.severity === 'Critical').length,
      warning: alertList.filter(a => a.severity === 'Warning').length,
      info: alertList.filter(a => a.severity === 'Information').length
    };

    // Calculate geofence violations (alerts with 'Restricted Area' in them)
    const geofenceViolations = alertList.filter(a => 
      a.alertType === 'Restricted Area Entry' || a.message.toLowerCase().includes('geofence')
    ).length;

    // Movement summary: coordinate log counts per user
    const movementCountPerUser = {};
    gpsLogs.forEach(g => {
      let uName = 'Unknown';
      if (isDb && g.userId) uName = g.userId.name;
      else if (!isDb && g.userId) {
        const u = mockStore.users.find(usr => usr._id === g.userId);
        uName = u ? u.name : 'Unknown';
      }
      movementCountPerUser[uName] = (movementCountPerUser[uName] || 0) + 1;
    });

    res.json({
      range,
      stats: {
        totalAlerts: alertList.length,
        alertSummary,
        activitySummary,
        geofenceViolations,
        deviceHealth: users.map(u => {
          // get latest log
          const userGps = gpsLogs.filter(g => String(g.userId) === String(u._id) || g.userId === u._id);
          const latestLog = userGps[userGps.length - 1];
          return {
            name: u.name,
            wristbandId: u.wristbandId,
            battery: latestLog ? latestLog.battery : 85,
            signalStrength: latestLog ? latestLog.signalStrength : 4,
            status: u.status
          };
        })
      },
      alerts: alertList,
      activities: activityLogs.map(a => {
        let uName = 'Unknown';
        if (isDb && a.userId) uName = a.userId.name;
        else if (!isDb && a.userId) {
          const u = mockStore.users.find(usr => usr._id === a.userId);
          uName = u ? u.name : 'Unknown';
        }
        return {
          userName: uName,
          wristbandId: a.wristbandId,
          activityType: a.activityType,
          timestamp: a.timestamp
        };
      }),
      movements: gpsLogs.map(g => {
        let uName = 'Unknown';
        if (isDb && g.userId) uName = g.userId.name;
        else if (!isDb && g.userId) {
          const u = mockStore.users.find(usr => usr._id === g.userId);
          uName = u ? u.name : 'Unknown';
        }
        return {
          userName: uName,
          wristbandId: g.wristbandId,
          latitude: g.latitude,
          longitude: g.longitude,
          timestamp: g.timestamp
        };
      }),
      movementCountPerUser
    });
  } catch (error) {
    console.error('Error compiling reports:', error);
    res.status(500).json({ error: 'Server error generating reports' });
  }
}
