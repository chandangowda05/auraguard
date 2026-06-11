import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth, API_URL } from './AuthContext';

const LiveTelemetryContext = createContext(null);

export function LiveTelemetryProvider({ children }) {
  const { token, user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [movementPaths, setMovementPaths] = useState({}); // map: wristbandId -> array of {lat, lng}
  const [staff, setStaff] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [socket, setSocket] = useState(null);
  const [notification, setNotification] = useState(null); // Active pop-up notification

  // Helper to fetch options with token
  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [token]);

  // Fetch all core telemetry and configurations
  const fetchLocations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/locations`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        
        // Initialize movement paths with the latest coordinate
        const paths = {};
        data.forEach(loc => {
          if (loc.latitude && loc.longitude) {
            paths[loc.wristbandId] = [{ lat: loc.latitude, lng: loc.longitude }];
          }
        });
        setMovementPaths(prev => ({ ...paths, ...prev }));
      }
    } catch (e) {
      console.error('Error fetching locations', e);
    }
  }, [token, getHeaders]);

  const fetchGeofences = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/geofences`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setGeofences(data);
      }
    } catch (e) {
      console.error('Error fetching geofences', e);
    }
  }, [token, getHeaders]);

  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/alerts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (e) {
      console.error('Error fetching alerts', e);
    }
  }, [token, getHeaders]);

  const fetchStaff = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.filter(u => u.role === 'admin' || u.role === 'supervisor'));
      }
    } catch (e) {
      console.error('Error fetching staff users', e);
    }
  }, [token, getHeaders]);

  const fetchDispatches = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/dispatches`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDispatches(data);
      }
    } catch (e) {
      console.error('Error fetching dispatches', e);
    }
  }, [token, getHeaders]);

  const assignStaffToIncident = async (payload) => {
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/dispatches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setDispatches(prev => [data, ...prev]);
        return data;
      }
    } catch (e) {
      console.error('Error assigning staff to incident', e);
    }
    return null;
  };

  // Acknowledge an alert
  const acknowledgeAlert = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/alerts/${id}/acknowledge`, {
        method: 'PUT',
        headers: getHeaders()
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: 'Acknowledged' } : a));
      }
    } catch (e) {
      console.error('Error acknowledging alert', e);
    }
  };

  // Add geofence
  const addGeofence = async (fence) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/geofences`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(fence)
      });
      if (res.ok) {
        const newFence = await res.json();
        setGeofences(prev => [...prev, newFence]);
        return newFence;
      }
    } catch (e) {
      console.error('Error adding geofence', e);
    }
  };

  // Delete geofence
  const deleteGeofence = async (id) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/geofences/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setGeofences(prev => prev.filter(g => g._id !== id));
      }
    } catch (e) {
      console.error('Error deleting geofence', e);
    }
  };

  // ESP32 simulation trigger
  const simulateDeviceData = async (payload) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5001/api`;
      const res = await fetch(`${apiUrl}/esp32`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      console.error('Simulation post failed', e);
    }
  };

  // Initial Fetching when token is ready
  useEffect(() => {
    if (token) {
      fetchLocations();
      fetchGeofences();
      fetchAlerts();
      fetchStaff();
      fetchDispatches();
    }
  }, [token, fetchLocations, fetchGeofences, fetchAlerts, fetchStaff, fetchDispatches]);

  // Socket.io WebSocket Connection
  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const baseApiUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001/api`;
    const socketUrl = baseApiUrl.replace(/\/api$/, '');
    console.log('Connecting WebSockets to:', socketUrl);
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      console.log('WebSocket Connected successfully');
    });

    // Handle telemetry update from wristband (physical or simulated)
    newSocket.on('telemetry', (data) => {
      // Update locations state
      setLocations(prev => {
        const index = prev.findIndex(loc => loc.wristbandId === data.wristbandId);
        if (index === -1) {
          return [...prev, data];
        }
        const copy = [...prev];
        copy[index] = { ...copy[index], ...data };
        return copy;
      });

      // Update movement path breadcrumbs
      setMovementPaths(prev => {
        const currentPath = prev[data.wristbandId] || [];
        // Cap path points to last 50 coordinates to save memory
        const newPath = [...currentPath, { lat: data.latitude, lng: data.longitude }].slice(-50);
        return {
          ...prev,
          [data.wristbandId]: newPath
        };
      });
    });

    // Handle incoming real-time alerts
    newSocket.on('new_alert', (alert) => {
      // Insert alert at top
      setAlerts(prev => [alert, ...prev]);

      // Trigger desktop style notification bubble (modal/banner)
      setNotification(alert);

      // Play safety sound for Critical alerts if browser allows it
      if (alert.severity === 'Critical') {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav'); // Beep warning sound
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const value = {
    locations,
    geofences,
    alerts,
    movementPaths,
    staff,
    notification,
    setNotification,
    acknowledgeAlert,
    addGeofence,
    deleteGeofence,
    simulateDeviceData,
    refreshData: () => {
      fetchLocations();
      fetchGeofences();
      fetchAlerts();
      fetchStaff();
      fetchDispatches();
    },
    assignStaffToIncident,
    dispatches
  };

  return <LiveTelemetryContext.Provider value={value}>{children}</LiveTelemetryContext.Provider>;
}

export function useTelemetry() {
  const context = useContext(LiveTelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a LiveTelemetryProvider');
  }
  return context;
}
