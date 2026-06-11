import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Shield, Radio, Volume2, Save, Check } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  
  // Alert configs states
  const [inactivityLimit, setInactivityLimit] = useState(5); // 5 mins
  const [fallSensitivity, setFallSensitivity] = useState(3.0); // 3.0g
  const [runningThreshold, setRunningThreshold] = useState(1.8); // 1.8g
  const [enableSound, setEnableSound] = useState(true);
  const [enableDesktopNotifications, setEnableDesktopNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-wide">System Settings</h1>
        <p className="text-slate-400 text-xs mt-1">Configure threshold indices, firmware alerts, and credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: AI Hardware Thresholds */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4">
          <div>
            <h3 className="font-bold text-white tracking-wide">AI Firmware Threshold Index</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Parameters pushed to ESP32 MPU6050 registers</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs text-slate-300">
            {/* Inactivity Limit */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold">
                <label className="text-slate-400 uppercase tracking-wide">Stillness Inactivity Limit</label>
                <span className="text-blue-400">{inactivityLimit} Minutes</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={inactivityLimit}
                onChange={(e) => setInactivityLimit(Number(e.target.value))}
                className="w-full h-1.5 rounded bg-slate-950 appearance-none cursor-pointer accent-blue-500"
              />
              <span className="block text-[10px] text-slate-500">Duration wearer must remain stationary to trigger Warning alerts.</span>
            </div>

            {/* Fall Sensitivity */}
            <div className="space-y-1.5 border-t border-slate-800/40 pt-4">
              <div className="flex justify-between font-bold">
                <label className="text-slate-400 uppercase tracking-wide">Fall Acceleration Coefficient</label>
                <span className="text-blue-400">{fallSensitivity} Gs</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={fallSensitivity * 10}
                onChange={(e) => setFallSensitivity(Number(e.target.value) / 10)}
                className="w-full h-1.5 rounded bg-slate-950 appearance-none cursor-pointer accent-blue-500"
              />
              <span className="block text-[10px] text-slate-500">Acceleration magnitude drop threshold triggering Emergency warnings.</span>
            </div>

            {/* Running Sensitivity */}
            <div className="space-y-1.5 border-t border-slate-800/40 pt-4">
              <div className="flex justify-between font-bold">
                <label className="text-slate-400 uppercase tracking-wide">Running Acceleration Threshold</label>
                <span className="text-blue-400">{runningThreshold} Gs</span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="2"
                value={runningThreshold * 10}
                onChange={(e) => setRunningThreshold(Number(e.target.value) / 10)}
                className="w-full h-1.5 rounded bg-slate-950 appearance-none cursor-pointer accent-blue-500"
              />
              <span className="block text-[10px] text-slate-500">Repetitive motion acceleration indices for Running detection.</span>
            </div>

            {/* Save */}
            <div className="border-t border-slate-800/40 pt-4 flex justify-between items-center">
              {saved ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] animate-pulse">
                  <Check size={14} />
                  <span>Threshold parameters applied & synced!</span>
                </div>
              ) : <div />}
              <button
                type="submit"
                className="flex items-center gap-2 py-2.5 px-4 font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md"
              >
                <Save size={14} />
                <span>Save Configurations</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Audio & Notifications Alerts settings */}
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-4">
            <div>
              <h3 className="font-bold text-white tracking-wide">Alarms Notification Toggles</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Control room feedback toggles</p>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-slate-900/10 transition-colors">
                <div className="space-y-0.5">
                  <span className="block font-bold">Sound Effects Feedback</span>
                  <span className="block text-[10px] text-slate-500">Play safety beeps on Critical SOS alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableSound}
                  onChange={(e) => setEnableSound(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 focus:ring-offset-slate-900"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-slate-900/10 transition-colors border-t border-slate-800/40 pt-4">
                <div className="space-y-0.5">
                  <span className="block font-bold">Desktop Notification Modals</span>
                  <span className="block text-[10px] text-slate-500">Display popup modal bubbles</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableDesktopNotifications}
                  onChange={(e) => setEnableDesktopNotifications(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-950 border-slate-800 focus:ring-offset-slate-900"
                />
              </label>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 space-y-3">
            <h3 className="font-bold text-white tracking-wide">Account Verification</h3>
            <div className="text-xs text-slate-400 space-y-2">
              <div className="flex justify-between">
                <span>Account Name:</span>
                <span className="font-bold text-slate-200">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Access Scope:</span>
                <span className="font-bold text-blue-400 capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
