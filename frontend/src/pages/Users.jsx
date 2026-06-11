import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useTelemetry } from '../context/LiveTelemetryContext';
import { Search, Plus, Edit2, Trash2, Shield, User, Info, X, Check, Key } from 'lucide-react';

export default function Users() {
  const { token, isAdmin } = useAuth();
  const { geofences, refreshData } = useTelemetry();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // If editing
  const [viewDetails, setViewDetails] = useState(null); // For details viewing

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [role, setRole] = useState('wearer');
  const [wristbandId, setWristbandId] = useState('');
  const [assignedZone, setAssignedZone] = useState('');
  const [status, setStatus] = useState('Active');
  const [password, setPassword] = useState(''); // For administrators/supervisors

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setName('');
    setPhone('');
    setAge('');
    setRole('wearer');
    setWristbandId('');
    setAssignedZone('');
    setStatus('Active');
    setPassword('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setName(u.name);
    setPhone(u.phone);
    setAge(u.age || '');
    setRole(u.role);
    setWristbandId(u.wristbandId || '');
    setAssignedZone(u.assignedZone || '');
    setStatus(u.status);
    setPassword('');
    setIsModalOpen(true);
  };

  const handleDelete = async (u) => {
    if (!confirm(`Are you sure you want to delete user "${u.name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/users/${u._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(prev => prev.filter(user => user._id !== u._id));
        refreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Name and phone are required');
      return;
    }

    const payload = {
      name,
      phone,
      age: age ? Number(age) : undefined,
      role,
      status,
      assignedZone
    };

    if (role === 'wearer') {
      payload.wristbandId = wristbandId || undefined;
    } else {
      if (password) {
        payload.password = password;
      } else if (!selectedUser) {
        alert('Password is required for administrative roles');
        return;
      }
    }

    try {
      const method = selectedUser ? 'PUT' : 'POST';
      const url = selectedUser ? `${API_URL}/users/${selectedUser._id}` : `${API_URL}/users`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setIsModalOpen(false);
      fetchUsers();
      refreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const query = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query) ||
      u.wristbandId?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">User Management</h1>
          <p className="text-slate-400 text-xs mt-1">Configure telemetry profiles, zone permissions, and operator credentials</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 py-3 px-4.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/10 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add User Profile</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search by profile name, wristband ID, phone or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-xs text-slate-200 bg-slate-950/40 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Table view */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40">
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            Loading user directory list...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-2">Role</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Mobile Contact</th>
                  <th className="pb-3">Wristband ID</th>
                  <th className="pb-3">Assigned Zone</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-3.5 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'admin' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : u.role === 'supervisor' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />}
                        <span className="capitalize">{u.role}</span>
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="font-bold text-slate-100">{u.name}</span>
                      {u.age && <span className="text-[10px] text-slate-500 font-bold ml-1.5">{u.age} y/o</span>}
                    </td>
                    <td className="py-3.5 text-slate-400 font-mono">{u.phone}</td>
                    <td className="py-3.5 font-mono text-blue-400">
                      {u.wristbandId || <span className="text-slate-600 font-normal">Unassigned</span>}
                    </td>
                    <td className="py-3.5">
                      {u.assignedZone ? (
                        <span className="text-amber-400 font-semibold">{u.assignedZone}</span>
                      ) : (
                        <span className="text-slate-500">Unrestricted</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2 space-x-1">
                      <button
                        onClick={() => setViewDetails(u)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Info size={14} />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-500">
                      No matching user profile directory found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Profile Construction Form (Create/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0d1321] border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white tracking-wide">
                {selectedUser ? 'Edit User Profile' : 'Construct User Profile'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-slate-300 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5 col-span-2">
                  <label className="text-slate-400 font-bold uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold uppercase tracking-wide">Phone (Contact)</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold uppercase tracking-wide">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold uppercase tracking-wide">Operational Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2.5 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold uppercase tracking-wide">System Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="wearer">Wristband Wearer</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {/* Conditional parameters based on Role selection */}
              {role === 'wearer' ? (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-3">
                  {/* Wristband ID */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase tracking-wide">Wristband ID</label>
                    <input
                      type="text"
                      placeholder="e.g. WB001"
                      value={wristbandId}
                      onChange={(e) => setWristbandId(e.target.value)}
                      className="w-full px-3 py-2 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Assigned Zone */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold uppercase tracking-wide">Assigned Zone</label>
                    <select
                      value={assignedZone}
                      onChange={(e) => setAssignedZone(e.target.value)}
                      className="w-full px-3 py-2.5 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Unrestricted</option>
                      {geofences.map(g => (
                        <option key={g._id} value={g.name}>{g.name} ({g.type})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                // Administrator / Supervisor credentials password
                <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                  <label className="text-slate-400 font-bold uppercase tracking-wide">
                    {selectedUser ? 'New Password (Leave blank to keep same)' : 'Security Account Password'}
                  </label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-98"
              >
                {selectedUser ? 'Apply Configurations' : 'Register User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Details View Slide-in Overlay */}
      {viewDetails && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-end bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm h-full bg-[#0d1321] border-l border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6 flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white tracking-wide">Wearer Details Sheet</h3>
                <button onClick={() => setViewDetails(null)} className="text-slate-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Profile card summary */}
              <div className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-extrabold flex items-center justify-center text-lg">
                  {viewDetails.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="block font-bold text-white text-sm">{viewDetails.name}</span>
                  <span className="block text-[10px] text-slate-500 font-semibold uppercase">{viewDetails.role}</span>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">User Database ID:</span>
                  <span className="font-mono text-[10px] text-slate-300">{viewDetails._id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Mobile Link:</span>
                  <span className="font-mono text-slate-300">{viewDetails.phone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Age:</span>
                  <span className="text-slate-300">{viewDetails.age || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Wristband ID:</span>
                  <span className="font-mono text-blue-400">{viewDetails.wristbandId || 'None'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Restricted Zone Permission:</span>
                  <span className="text-slate-300">{viewDetails.assignedZone || 'None (General)'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Deployment Status:</span>
                  <span className="text-slate-300">{viewDetails.status}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewDetails(null)}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl hover:bg-slate-800 text-xs font-bold"
            >
              Close Details Sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
