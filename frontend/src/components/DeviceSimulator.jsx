import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/LiveTelemetryContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Flame, 
  UserPlus, 
  Battery, 
  AlertTriangle,
  Zap
} from 'lucide-react';

export default function DeviceSimulator() {
  const { locations, simulateDeviceData } = useTelemetry();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [battery, setBattery] = useState(85);
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  
  // Custom states
  const [accelX, setAccelX] = useState(0.05);
  const [accelY, setAccelY] = useState(0.98);
  const [accelZ, setAccelZ] = useState(0.02);
  const [isPlayingPath, setIsPlayingPath] = useState(false);
  const [pathIndex, setPathIndex] = useState(0);

  // Default coordinate seed center (Bangalore)
  const centerLat = 12.9716;
  const centerLng = 77.5946;

  // Presets of coordinate paths
  const paths = {
    safe: [
      { lat: 12.9700, lng: 77.5900 },
      { lat: 12.9702, lng: 77.5905 },
      { lat: 12.9705, lng: 77.5910 },
      { lat: 12.9708, lng: 77.5915 },
      { lat: 12.9710, lng: 77.5920 },
      { lat: 12.9708, lng: 77.5925 },
      { lat: 12.9705, lng: 77.5930 },
      { lat: 12.9700, lng: 77.5935 },
    ],
    intrusion: [
      { lat: 12.9705, lng: 77.5940 }, // Warning zone border
      { lat: 12.9712, lng: 77.5943 }, // Warning zone
      { lat: 12.9722, lng: 77.5946 }, // Intrusion into Danger Alpha
      { lat: 12.9732, lng: 77.5950 }, // Deep inside Danger Alpha
      { lat: 12.9740, lng: 77.5952 }, // Inside Danger Alpha
      { lat: 12.9745, lng: 77.5945 }, // Inside Danger Alpha
      { lat: 12.9735, lng: 77.5935 }, // Exiting
      { lat: 12.9715, lng: 77.5925 }, // Safe Zone
    ]
  };

  const [activePathName, setActivePathName] = useState('safe');

  // Sync selected device coordinates when it changes
  useEffect(() => {
    if (selectedDevice) {
      const activeUser = locations.find(loc => loc.wristbandId === selectedDevice);
      if (activeUser) {
        setLatitude(activeUser.latitude || centerLat);
        setLongitude(activeUser.longitude || centerLng);
        setBattery(activeUser.battery || 85);
      }
    } else if (locations.length > 0) {
      setSelectedDevice(locations[0].wristbandId);
    }
  }, [selectedDevice, locations]);

  // Path player interval
  useEffect(() => {
    let interval = null;
    if (isPlayingPath && selectedDevice) {
      const currentPath = paths[activePathName];
      interval = setInterval(() => {
        const nextIdx = (pathIndex + 1) % currentPath.length;
        setPathIndex(nextIdx);
        const nextCoord = currentPath[nextIdx];
        setLatitude(nextCoord.lat);
        setLongitude(nextCoord.lng);
        
        // Push coordinate update
        sendTelemetry(nextCoord.lat, nextCoord.lng, 'normal', false);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isPlayingPath, pathIndex, selectedDevice, activePathName]);

  const sendTelemetry = async (lat, lng, activityName, emergencyOverride = false, rawSensors = null) => {
    if (!selectedDevice) return;
    
    const payload = {
      deviceId: selectedDevice,
      latitude: String(lat),
      longitude: String(lng),
      battery: String(battery),
      signalStrength: "5",
      emergency: emergencyOverride
    };

    if (rawSensors) {
      payload.ax = rawSensors.ax;
      payload.ay = rawSensors.ay;
      payload.az = rawSensors.az;
    } else {
      payload.activity = activityName;
    }

    await simulateDeviceData(payload);
  };

  const triggerFall = async () => {
    if (!selectedDevice) return;
    setIsPlayingPath(false);
    // Sequence fall trigger: Set raw accelerations indicating free fall, then high impact, then still
    setAccelX(0.1);
    setAccelY(0.15);
    setAccelZ(0.08);
    // Send immediate packet with classified fall
    await sendTelemetry(latitude, longitude, 'fall', false, { ax: 0.1, ay: 0.15, az: 0.08 });
  };

  const triggerRunning = async () => {
    if (!selectedDevice) return;
    setAccelX(1.3);
    setAccelY(1.7);
    setAccelZ(0.9);
    await sendTelemetry(latitude, longitude, 'running', false, { ax: 1.3, ay: 1.7, az: 0.9 });
  };

  const triggerStill = async () => {
    if (!selectedDevice) return;
    setAccelX(0.02);
    setAccelY(0.98);
    setAccelZ(0.04);
    await sendTelemetry(latitude, longitude, 'still', false, { ax: 0.02, ay: 0.98, az: 0.04 });
  };

  const triggerSOS = async () => {
    if (!selectedDevice) return;
    setIsPlayingPath(false);
    await sendTelemetry(latitude, longitude, 'normal', true);
  };

  const nudgeCoordinates = (dLat, dLng) => {
    const nextLat = Number((latitude + dLat).toFixed(6));
    const nextLng = Number((longitude + dLng).toFixed(6));
    setLatitude(nextLat);
    setLongitude(nextLng);
    sendTelemetry(nextLat, nextLng, 'normal', false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4.5 py-3.5 font-semibold text-white bg-blue-600 border border-blue-500 rounded-full shadow-2xl hover:bg-blue-500 active:scale-95 transition-all"
      >
        <Settings size={20} className={isOpen ? 'rotate-90 transition-transform duration-300' : 'transition-transform duration-300'} />
        <span>{isOpen ? 'Close Simulator' : 'Telemetry Simulator'}</span>
      </button>

      {/* Simulator Control Drawer */}
      {isOpen && (
        <div className="w-80 mt-3 p-5 rounded-3xl border border-slate-800 bg-[#0d1321]/95 backdrop-blur-md shadow-2xl space-y-4 text-slate-300 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white tracking-wide">IoT Hardware Simulator</h3>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Device telemetry board</p>
            </div>
            <Zap className="text-yellow-400 fill-yellow-400/20 animate-pulse" size={20} />
          </div>

          {/* Device Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-semibold">Active Wristband</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-200 rounded-xl bg-slate-900 border border-slate-800 focus:outline-none focus:border-blue-500"
            >
              {locations.map(loc => (
                <option key={loc.wristbandId} value={loc.wristbandId}>
                  {loc.wristbandId} - {loc.name}
                </option>
              ))}
              {locations.length === 0 && (
                <option value="">No Active Wristbands</option>
              )}
            </select>
          </div>

          {/* Battery Status */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Battery Level</span>
              <span className="text-blue-400">{battery}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Battery size={16} className="text-slate-400" />
              <input
                type="range"
                min="5"
                max="100"
                value={battery}
                onChange={(e) => setBattery(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-lg bg-slate-900 appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          {/* Coordinate Adjustment */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Coordinates Adjustment</span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-center text-xs font-semibold">
              <div></div>
              <button onClick={() => nudgeCoordinates(0.0005, 0)} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-white">▲ N</button>
              <div></div>
              
              <button onClick={() => nudgeCoordinates(0, -0.0005)} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-white">◀ W</button>
              <div className="flex items-center justify-center text-[10px] text-slate-500">Nudge</div>
              <button onClick={() => nudgeCoordinates(0, 0.0005)} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-white">E ▶</button>
              
              <div></div>
              <button onClick={() => nudgeCoordinates(-0.0005, 0)} className="py-1 rounded bg-slate-800 hover:bg-slate-700 text-white">▼ S</button>
              <div></div>
            </div>
            <div className="flex gap-2 text-[10.5px] text-slate-400 justify-center">
              <span>Lat: {latitude}</span>
              <span>•</span>
              <span>Lng: {longitude}</span>
            </div>
          </div>

          {/* Path Presets Player */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">Auto Movement Player</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActivePathName('safe');
                    setPathIndex(0);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] ${activePathName === 'safe' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 border border-transparent'}`}
                >
                  Safe Path
                </button>
                <button
                  onClick={() => {
                    setActivePathName('intrusion');
                    setPathIndex(0);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] ${activePathName === 'intrusion' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-900 border border-transparent'}`}
                >
                  Violation Path
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlayingPath(!isPlayingPath)}
                disabled={!selectedDevice}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl border border-blue-500/20 text-blue-400 transition-colors ${isPlayingPath ? 'bg-blue-600/10' : 'bg-slate-900 hover:bg-slate-800'}`}
              >
                {isPlayingPath ? <Pause size={12} /> : <Play size={12} />}
                {isPlayingPath ? 'Pause Route' : 'Run Route'}
              </button>
              <button
                onClick={() => {
                  setIsPlayingPath(false);
                  setPathIndex(0);
                  const coord = paths[activePathName][0];
                  setLatitude(coord.lat);
                  setLongitude(coord.lng);
                  sendTelemetry(coord.lat, coord.lng, 'normal', false);
                }}
                disabled={!selectedDevice}
                className="flex items-center justify-center px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          {/* AI Activity / Accelerometer Simulations */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <span className="text-xs text-slate-400 font-semibold block">MPU6050 Sensor Simulations</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={triggerStill}
                disabled={!selectedDevice}
                className="py-2 text-[10.5px] font-bold rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
              >
                Stationary
              </button>
              <button
                onClick={triggerRunning}
                disabled={!selectedDevice}
                className="py-2 text-[10.5px] font-bold rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-amber-400"
              >
                Running
              </button>
              <button
                onClick={triggerFall}
                disabled={!selectedDevice}
                className="py-2 text-[10.5px] font-bold rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400"
              >
                Fall Shock
              </button>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between font-mono px-1">
              <span>ax: {accelX}g</span>
              <span>ay: {accelY}g</span>
              <span>az: {accelZ}g</span>
            </div>
          </div>

          {/* EMERGENCY TRIGGER */}
          <button
            onClick={triggerSOS}
            disabled={!selectedDevice}
            className="w-full flex items-center justify-center gap-2 py-3 font-extrabold rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/35 active:scale-[0.98] transition-all"
          >
            <AlertTriangle size={18} className="animate-bounce" />
            <span>TRIGGER SOS PANIC</span>
          </button>
        </div>
      )}
    </div>
  );
}
