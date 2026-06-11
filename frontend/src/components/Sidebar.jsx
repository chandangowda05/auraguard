import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Map, 
  ShieldAlert, 
  Users, 
  Activity, 
  FilePieChart, 
  Settings, 
  LogOut,
  Radio,
  Menu,
  X
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) {
  const { user, logout, isAdmin } = useAuth();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor'] },
    { id: 'map', name: 'Map Tracking', icon: Map, roles: ['admin', 'supervisor'] },
    { id: 'geofencing', name: 'Geofencing', icon: Radio, roles: ['admin'] },
    { id: 'alerts', name: 'Alert Feed', icon: ShieldAlert, roles: ['admin', 'supervisor'] },
    { id: 'users', name: 'Users Module', icon: Users, roles: ['admin', 'supervisor'] },
    { id: 'wristbands', name: 'Wristbands', icon: Activity, roles: ['admin', 'supervisor'] },
    { id: 'reports', name: 'Reports', icon: FilePieChart, roles: ['admin', 'supervisor'] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: ['admin', 'supervisor'] },
  ];

  const filteredItems = menuItems.filter(item => {
    if (item.roles.includes('admin') && !isAdmin) return false;
    return true;
  });

  return (
    <>
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 border-r border-slate-800 bg-[#0d1321] transition-transform duration-350 ease-out
        md:translate-x-0 md:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo block */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 critical-pulse">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-wide font-sans">AuraGuard</span>
              <span className="block text-[10px] text-blue-400 font-medium tracking-widest uppercase">IoT SafeGuard</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu block */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  flex items-center w-full gap-3.5 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-150 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}
                `}
              >
                <Icon size={18} className={`transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span>{item.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 ml-auto rounded-full bg-white animate-ping" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile / Logout block */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3 px-2 py-2 mb-3">
            <div className="flex items-center justify-center w-9 h-9 font-bold text-blue-400 rounded-full bg-blue-500/10 border border-blue-500/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-semibold text-slate-200 truncate">{user?.name || 'User'}</span>
              <span className="block text-xs text-slate-500 capitalize">{user?.role || 'Operator'}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full gap-3 px-4 py-2.5 text-sm font-medium text-red-400 rounded-xl hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
