// Mock in-memory database store for running in Simulation Mode
import bcrypt from 'bcryptjs';

// Pre-hash password for default users
const hashedPassword = await bcrypt.hash('password123', 10);

export const mockStore = {
  users: [
    {
      _id: 'usr_admin1',
      name: 'Admin User',
      phone: '+1234567890',
      age: 35,
      role: 'admin',
      password: hashedPassword,
      status: 'Active',
      assignedZone: 'Danger Area Alpha',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'usr_sup1',
      name: 'Supervisor User',
      phone: '+1987654321',
      age: 29,
      role: 'supervisor',
      password: hashedPassword,
      status: 'Active',
      assignedZone: 'Warning Area Beta',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'usr_wearer1',
      name: 'John Doe',
      phone: '+1555010011',
      age: 24,
      wristbandId: 'WB001',
      assignedZone: 'Danger Area Alpha',
      role: 'wearer',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'usr_wearer2',
      name: 'Alice Smith',
      phone: '+1555020022',
      age: 31,
      wristbandId: 'WB002',
      assignedZone: 'Warning Area Beta',
      role: 'wearer',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'usr_wearer3',
      name: 'Robert Johnson',
      phone: '+1555030033',
      age: 45,
      wristbandId: 'WB003',
      assignedZone: '',
      role: 'wearer',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'usr_wearer4',
      name: 'Michael Brown',
      phone: '+1555040044',
      age: 29,
      wristbandId: 'WB004',
      assignedZone: 'Safe Assembly Area',
      role: 'wearer',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'usr_wearer5',
      name: 'Sarah Davis',
      phone: '+1555050055',
      age: 34,
      wristbandId: 'WB005',
      assignedZone: 'Safe Assembly Area',
      role: 'wearer',
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  geofences: [
    {
      _id: 'geo_1',
      name: 'Danger Area Alpha',
      coordinates: [
        { lat: 12.972, lng: 77.593 },
        { lat: 12.975, lng: 77.593 },
        { lat: 12.975, lng: 77.597 },
        { lat: 12.972, lng: 77.597 }
      ],
      type: 'restricted',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'geo_2',
      name: 'Warning Area Beta',
      coordinates: [
        { lat: 12.968, lng: 77.590 },
        { lat: 12.971, lng: 77.590 },
        { lat: 12.971, lng: 77.595 },
        { lat: 12.968, lng: 77.595 }
      ],
      type: 'warning',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'geo_3',
      name: 'Safe Assembly Area',
      coordinates: [
        { lat: 12.9695, lng: 77.5925 },
        { lat: 12.9715, lng: 77.5925 },
        { lat: 12.9715, lng: 77.5945 },
        { lat: 12.9695, lng: 77.5945 }
      ],
      type: 'safe',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  alerts: [
    {
      _id: 'alt_1',
      userId: 'usr_wearer1',
      wristbandId: 'WB001',
      alertType: 'Restricted Area Entry',
      severity: 'Critical',
      message: 'John Doe entered restricted area: Danger Area Alpha',
      location: { latitude: 12.973, longitude: 77.594 },
      status: 'Active',
      timestamp: new Date(Date.now() - 1000 * 60 * 15) // 15 mins ago
    },
    {
      _id: 'alt_2',
      userId: 'usr_wearer2',
      wristbandId: 'WB002',
      alertType: 'Running',
      severity: 'Warning',
      message: 'Alice Smith classified as Running (High Acceleration)',
      location: { latitude: 12.969, longitude: 77.592 },
      status: 'Active',
      timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5 mins ago
    },
    {
      _id: 'alt_3',
      userId: 'usr_wearer3',
      wristbandId: 'WB003',
      alertType: 'System Connected',
      severity: 'Information',
      message: 'Wristband WB003 online',
      location: { latitude: 12.970, longitude: 77.598 },
      status: 'Acknowledged',
      timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 mins ago
    }
  ],
  dispatches: [],
  gpsLogs: [
    {
      userId: 'usr_wearer1',
      wristbandId: 'WB001',
      latitude: 12.973,
      longitude: 77.594,
      battery: 78,
      signalStrength: 4,
      timestamp: new Date()
    },
    {
      userId: 'usr_wearer2',
      wristbandId: 'WB002',
      latitude: 12.969,
      longitude: 77.592,
      battery: 89,
      signalStrength: 5,
      timestamp: new Date()
    },
    {
      userId: 'usr_wearer3',
      wristbandId: 'WB003',
      latitude: 12.970,
      longitude: 77.598,
      battery: 92,
      signalStrength: 3,
      timestamp: new Date()
    },
    {
      userId: 'usr_wearer4',
      wristbandId: 'WB004',
      latitude: 12.970,
      longitude: 77.593,
      battery: 95,
      signalStrength: 5,
      timestamp: new Date()
    },
    {
      userId: 'usr_wearer5',
      wristbandId: 'WB005',
      latitude: 12.9705,
      longitude: 77.5935,
      battery: 82,
      signalStrength: 4,
      timestamp: new Date()
    }
  ],
  activityLogs: [
    {
      userId: 'usr_wearer1',
      wristbandId: 'WB001',
      activityType: 'Normal State',
      timestamp: new Date(),
      rawSensorData: { ax: 0.1, ay: 0.98, az: 0.05 }
    },
    {
      userId: 'usr_wearer2',
      wristbandId: 'WB002',
      activityType: 'Running',
      timestamp: new Date(),
      rawSensorData: { ax: 1.1, ay: 1.4, az: 0.9 }
    },
    {
      userId: 'usr_wearer3',
      wristbandId: 'WB003',
      activityType: 'Normal State',
      timestamp: new Date(),
      rawSensorData: { ax: 0.05, ay: 0.99, az: 0.02 }
    },
    {
      userId: 'usr_wearer4',
      wristbandId: 'WB004',
      activityType: 'Normal State',
      timestamp: new Date(),
      rawSensorData: { ax: 0.04, ay: 0.97, az: 0.03 }
    },
    {
      userId: 'usr_wearer5',
      wristbandId: 'WB005',
      activityType: 'Normal State',
      timestamp: new Date(),
      rawSensorData: { ax: 0.03, ay: 0.98, az: 0.01 }
    }
  ]
};

// Device health states (derived dynamically in mock mode)
export const mockDeviceStatus = {
  WB001: { battery: 78, signalStrength: 4, status: 'Online', lastConnected: new Date() },
  WB002: { battery: 89, signalStrength: 5, status: 'Online', lastConnected: new Date() },
  WB003: { battery: 92, signalStrength: 3, status: 'Online', lastConnected: new Date() },
  WB004: { battery: 95, signalStrength: 5, status: 'Online', lastConnected: new Date() },
  WB005: { battery: 82, signalStrength: 4, status: 'Online', lastConnected: new Date() }
};
