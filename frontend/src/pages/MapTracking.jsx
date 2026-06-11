import React, { useEffect, useRef, useState } from 'react';
import { useTelemetry } from '../context/LiveTelemetryContext';
import L from 'leaflet';
import { MapPin, Battery, Activity, ShieldAlert, Navigation, Search } from 'lucide-react';

const getPinIcon = (color, isSelected = false) => {
  const size = isSelected ? 56 : 42;
  return L.divIcon({
    className: `custom-pin-icon ${isSelected ? 'selected-user-pin' : ''}`,
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none;">
        <div style="position: absolute; top: -8px; width: ${size}px; height: ${size}px; border-radius: 9999px; background-color: ${color}; opacity: ${isSelected ? 0.22 : 0.12}; pointer-events: none;" class="${isSelected ? 'animate-pulse' : 'animate-ping'}"></div>
        <div style="position: absolute; width: ${size - 10}px; height: ${size - 10}px; border-radius: 9999px; background: rgba(15, 23, 42, 0.95); border: 2px solid ${color}; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.35);"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#070b13" stroke-width="1.5" style="width: ${size - 18}px; height: ${size - 18}px; z-index: 1;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size / 2]
  });
};

const getStaffIcon = () => {
  const size = 44;
  const color = '#38bdf8';
  return L.divIcon({
    className: 'custom-pin-icon staff-pin-icon',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; user-select: none;">
        <div style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 9999px; background: rgba(56, 189, 248, 0.18); pointer-events: none;" class="animate-pulse"></div>
        <div style="position: absolute; width: ${size - 12}px; height: ${size - 12}px; border-radius: 9999px; background: #0f172a; border: 2px solid ${color}; box-shadow: 0 10px 18px rgba(56, 189, 248, 0.22);"></div>
        <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
          S
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size / 2]
  });
};

const isPointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) return false;
  const x = point.lat;
  const y = point.lng;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
};

export default function MapTracking() {
  const { locations, geofences, movementPaths, staff, dispatches, assignStaffToIncident } = useTelemetry();
  const [selectedUser, setSelectedUser] = useState(null);
  const [mapCentered, setMapCentered] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const findZoneForLocation = (location) => {
    return geofences.find(zone => isPointInPolygon({ lat: location.latitude, lng: location.longitude }, zone.coordinates));
  };

  const getStaffForZone = (zoneName) => {
    return staff.filter(s => s.assignedZone?.toLowerCase().includes(zoneName.toLowerCase()));
  };

  const handleDispatchToZone = async (staffMember, incident) => {
    const payload = {
      staffId: staffMember._id,
      wearerId: incident.loc.userId,
      staffName: staffMember.name,
      wearerName: incident.loc.name,
      zoneName: incident.zone.name,
      zoneType: incident.zone.type
    };

    const assigned = await assignStaffToIncident(payload);
    if (!assigned) {
      console.error('Failed to dispatch staff to incident');
    }
  };

  const getZoneCenter = (zoneName) => {
    const lowerName = zoneName?.toLowerCase?.();
    if (!lowerName) return null;
    let zone = geofences.find(z => z.name.toLowerCase() === lowerName);
    if (!zone) {
      zone = geofences.find(z => z.name.toLowerCase().includes(lowerName) || lowerName.includes(z.name.toLowerCase()));
    }
    if (!zone || !zone.coordinates || zone.coordinates.length === 0) return null;
    const latSum = zone.coordinates.reduce((sum, point) => sum + point.lat, 0);
    const lngSum = zone.coordinates.reduce((sum, point) => sum + point.lng, 0);
    return [latSum / zone.coordinates.length, lngSum / zone.coordinates.length];
  };

  const getZoneLabel = (zone) => {
    if (!zone) return 'Unknown area';
    return zone.type === 'restricted' ? 'Restricted' : zone.type === 'warning' ? 'Warning' : 'Zone';
  };

  const incidentEvents = locations
    .map(loc => {
      const zone = findZoneForLocation(loc);
      return zone && {
        loc,
        zone,
        label: getZoneLabel(zone),
        staff: getStaffForZone(zone.name)
      };
    })
    .filter(Boolean);

  const availableStaff = staff.filter(s => s.role === 'supervisor' || s.role === 'admin');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const searchMarkerRef = useRef(null);
  
  // Track active layer items to clean them up on updates
  const markersRef = useRef({});
  const polygonsRef = useRef([]);
  const staffMarkersRef = useRef({});
  const trackRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Bangalore center coordinates
    const center = [12.9716, 77.5946];
    
    // Create map instance
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(center, 14);

    // Apply sleek Dark Mode Tile Layer from CartoDB
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      searchMarkerRef.current = null;
    };
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = [];

    // 1. Search existing Geofences
    const matchedFences = geofences.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    matchedFences.forEach(fence => {
      const lats = fence.coordinates.map(c => c.lat);
      const lngs = fence.coordinates.map(c => c.lng);
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      results.push({
        name: `Zone: ${fence.name} (${fence.type})`,
        lat: avgLat,
        lng: avgLng,
        isZone: true
      });
    });

    // 2. Search OpenStreetMap Nominatim
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'AuraGuard-Smart-Wristband-Monitor'
        }
      });
      if (res.ok) {
        const data = await res.json();
        data.slice(0, 5).forEach(item => {
          results.push({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            isZone: false
          });
        });
      }
    } catch (err) {
      console.error('Nominatim search failed:', err);
    }

    setSearchResults(results);
    setIsSearching(false);
  };

  const selectSearchResult = (result) => {
    if (mapInstance.current) {
      mapInstance.current.setView([result.lat, result.lng], 16);
      
      if (!result.isZone) {
        if (searchMarkerRef.current) {
          mapInstance.current.removeLayer(searchMarkerRef.current);
        }
        searchMarkerRef.current = L.marker([result.lat, result.lng]).addTo(mapInstance.current)
          .bindPopup(`<strong class="text-slate-900">${result.name}</strong>`)
          .openPopup();
      }
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  // Fix Leaflet layout rendering bug in dynamic tabs/containers
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  // Update Geofence Polygons on Map
  useEffect(() => {
    if (!mapInstance.current) return;

    // A. Remove existing geofence layers
    polygonsRef.current.forEach(layer => {
      mapInstance.current.removeLayer(layer);
    });
    polygonsRef.current = [];

    // B. Draw new geofences
    geofences.forEach(fence => {
      const latlngs = fence.coordinates.map(c => [c.lat, c.lng]);
      
      let fillColor = '#10b981'; // safe
      let strokeColor = '#059669';
      if (fence.type === 'restricted') {
        fillColor = '#f43f5e';
        strokeColor = '#e11d48';
      } else if (fence.type === 'warning') {
        fillColor = '#fbbf24';
        strokeColor = '#d97706';
      }

      const polygon = L.polygon(latlngs, {
        color: strokeColor,
        fillColor: fillColor,
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '2, 5'
      }).addTo(mapInstance.current);

      polygon.bindTooltip(fence.name, {
        permanent: true,
        direction: 'center',
        className: 'bg-slate-900/80 border border-slate-700/50 text-slate-300 font-bold text-[10px] rounded px-1.5 py-0.5 shadow-md'
      });

      polygonsRef.current.push(polygon);
    });
  }, [geofences]);

  // Update Active Wearer Markers
  useEffect(() => {
    if (!mapInstance.current) return;

    const currentMap = mapInstance.current;
    const activeIds = new Set(locations.map(loc => loc.wristbandId));

    // Remove stale markers for disconnected or missing wearers
    Object.keys(markersRef.current).forEach(existingId => {
      if (!activeIds.has(existingId)) {
        const marker = markersRef.current[existingId];
        if (marker) currentMap.removeLayer(marker);
        delete markersRef.current[existingId];
      }
    });

    // Loop through locations to update/create markers
    locations.forEach(loc => {
      if (!loc.latitude || !loc.longitude) return;

      const position = [loc.latitude, loc.longitude];
      const isSelected = loc.wristbandId === selectedUser;

      // Determine marker color depending on safety status
      let color = '#10b981'; // Green (Safe)
      if (loc.activity === 'Emergency' || (loc.violations && loc.violations.length > 0)) {
        color = '#ef4444'; // Red
      } else if (loc.activity === 'Running' || loc.activity === 'Inactivity') {
        color = '#f59e0b'; // Yellow (Warning)
      }

      // Check if marker already exists for this wristbandId
      if (markersRef.current[loc.wristbandId]) {
        const marker = markersRef.current[loc.wristbandId];
        marker.setLatLng(position);
        marker.getPopup().setContent(getPopupHtml(loc));
        marker.setIcon(getPinIcon(color, isSelected));
      } else {
        const marker = L.marker(position, {
          icon: getPinIcon(color, isSelected)
        }).addTo(currentMap);

        marker.bindPopup(getPopupHtml(loc));
        markersRef.current[loc.wristbandId] = marker;
      }
    });

    // Clear selected user coordinates if user no longer exists
    if (selectedUser && !locations.find(loc => loc.wristbandId === selectedUser)) {
      setCurrentUserCoords(null);
    }

    // Auto-center on selected user if set
    if (selectedUser) {
      const activeUser = locations.find(loc => loc.wristbandId === selectedUser);
      if (activeUser && activeUser.latitude && activeUser.longitude) {
        currentMap.panTo([activeUser.latitude, activeUser.longitude]);
      }
    } else if (locations.length > 0 && !mapCentered) {
      const groupCoords = locations.map(l => [l.latitude, l.longitude]);
      if (groupCoords.length > 0) {
        currentMap.fitBounds(groupCoords, { padding: [50, 50] });
        setMapCentered(true);
      }
    }

  }, [locations, selectedUser, mapCentered]);

  // Update staff markers for assigned zones
  useEffect(() => {
    if (!mapInstance.current) return;
    const currentMap = mapInstance.current;

    Object.values(staffMarkersRef.current).forEach(marker => {
      currentMap.removeLayer(marker);
    });
    staffMarkersRef.current = {};

    staff.forEach(member => {
      if (!member.assignedZone) return;
      const center = getZoneCenter(member.assignedZone);
      if (!center) return;

      const marker = L.marker(center, {
        icon: getStaffIcon()
      }).addTo(currentMap);

      marker.bindPopup(`
        <div style="background: rgba(15,23,42,0.95); color: #e2e8f0; padding: 10px; border-radius: 10px; width: 180px; font-family: Inter, sans-serif;">
          <strong style="color:#fff;">${member.name}</strong><br />
          <span style="font-size:11px; color:#94a3b8;">${member.role}</span><br />
          <span style="font-size:11px; color:#94a3b8;">Assigned zone: ${member.assignedZone}</span>
        </div>
      `);

      staffMarkersRef.current[member._id] = marker;
    });
  }, [staff, geofences]);

  // Update SELECTED USER's movement path tracking polyline
  useEffect(() => {
    if (!mapInstance.current) return;

    // A. Clean up old line
    if (trackRef.current) {
      mapInstance.current.removeLayer(trackRef.current);
      trackRef.current = null;
    }

    // B. Draw new tracking line
    if (selectedUser && movementPaths[selectedUser]) {
      const pathPoints = movementPaths[selectedUser].map(p => [p.lat, p.lng]);
      
      if (pathPoints.length > 1) {
        trackRef.current = L.polyline(pathPoints, {
          color: '#3b82f6',
          weight: 3.5,
          opacity: 0.9,
          dashArray: '5, 10',
          className: 'glowing-polyline'
        }).addTo(mapInstance.current);
      }
    }
  }, [selectedUser, movementPaths]);

  // Helper to generate dynamic pop-up content html
  const getPopupHtml = (loc) => {
    return `
      <div style="font-family: 'Inter', sans-serif; background-color: #0f172a; color: #cbd5e1; padding: 10px; border-radius: 8px; border: 1px solid #1e293b; width: 180px;">
        <strong style="color: #ffffff; font-size: 13px;">${loc.name}</strong><br>
        <span style="font-size: 10px; color: #64748b; font-family: monospace;">Device ID: ${loc.wristbandId}</span>
        <hr style="border: 0; border-top: 1px solid #334155; margin: 8px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
          <span>AI State:</span>
          <span style="font-weight: bold; color: ${loc.activity === 'Fall Detection' ? '#ef4444' : '#10b981'}">${loc.activity}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
          <span>Battery:</span>
          <span style="font-weight: bold;">${loc.battery}%</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>Safety:</span>
          <span style="font-weight: bold; color: ${loc.violations && loc.violations.length > 0 ? '#ef4444' : '#10b981'}">
            ${loc.violations && loc.violations.length > 0 ? 'RESTRICTED' : 'SAFE'}
          </span>
        </div>
      </div>
    `;
  };

  const getSidebarBadge = (activity) => {
    if (activity === 'Fall Detection') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    if (activity === 'Running') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-wide">Live Map Tracking</h1>
        <p className="text-slate-400 text-xs mt-1">Real-time GPS coordination and breadcrumb tracking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Map Container */}
        <div className="lg:col-span-9 relative">
          <div ref={mapRef} style={{ height: '580px', zIndex: 1 }} className="rounded-2xl border border-slate-800 overflow-hidden shadow-2xl" />
          
          {/* Floating Search Bar */}
          <div className="absolute top-4 right-4 z-[999] w-72">
            <form onSubmit={handleSearch} className="flex gap-1.5 p-1.5 bg-[#0b0f19]/90 border border-slate-800 rounded-xl backdrop-blur-md shadow-2xl">
              <input
                type="text"
                placeholder="Search zones or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs text-slate-200 bg-slate-950/50 rounded-lg border border-slate-850 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
              >
                <Search size={14} className={isSearching ? 'animate-spin' : ''} />
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-1.5 bg-[#0b0f19]/95 border border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-850 backdrop-blur-md">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSearchResult(res)}
                    className="w-full text-left px-3 py-2 text-[10.5px] text-slate-300 hover:text-white hover:bg-slate-900/40 transition-colors block truncate"
                  >
                    {res.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Dashboard overlay */}
          <div className="absolute bottom-4 left-4 z-[999] bg-[#0b0f19]/80 border border-slate-800/80 px-4 py-3 rounded-xl backdrop-blur text-xs flex flex-wrap gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Safe Zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Warning Zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 critical-pulse" />
              <span>Restricted Zone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Staff Marker</span>
            </div>
          </div>
        </div>

        {/* Right: Active Wristband List Drawer */}
        <div className="lg:col-span-3 p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex flex-col justify-between h-[580px]">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white tracking-wide">Wristband Wearers</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Select a user to display movement paths</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#09101d]/95 p-4 text-slate-300 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Response team</div>
                  <div className="text-sm font-semibold text-white">Staff on duty</div>
                </div>
                <div className="rounded-full px-2 py-1 text-[10px] font-bold bg-slate-900/80 border border-slate-700 text-slate-300">
                  {staff.length} staff
                </div>
              </div>

              {staff.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {staff.map(member => (
                    <div key={member._id} className="rounded-2xl bg-slate-950/30 border border-slate-800 p-3 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-white">{member.name}</div>
                          <div className="text-[10px] text-slate-500">{member.role}</div>
                        </div>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 bg-slate-900/70 rounded-full px-2 py-1">
                          {member.assignedZone || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500">No staff configured yet. Add supervisors/admins in Users.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#09101d]/95 p-4 text-slate-300 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Incident response</div>
                  <div className="text-sm font-semibold text-white">Staff dispatch ready</div>
                </div>
                <div className="rounded-full px-2 py-1 text-[10px] font-bold bg-slate-900/80 border border-slate-700 text-slate-300">
                  {incidentEvents.length} active
                </div>
              </div>

              {incidentEvents.length > 0 ? (
                incidentEvents.slice(0, 2).map((incident) => (
                  <div key={incident.loc.wristbandId} className="rounded-2xl bg-slate-950/30 border border-slate-800 p-3">
                    <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">
                      <span>{incident.label} Entry</span>
                      <span>{incident.zone.name}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">{incident.loc.name}</div>
                    <div className="mt-1 text-[10px] text-slate-400">Wristband {incident.loc.wristbandId}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(incident.staff.length > 0 ? incident.staff : availableStaff).map((member) => (
                        <button
                          key={member._id}
                          onClick={() => handleDispatchToZone(member, incident)}
                          className="text-[10px] px-2 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                        >
                          Dispatch {member.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-slate-500">
                  No wearers detected inside warning or restricted zones right now.
                </div>
              )}
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
              {locations.map((loc) => {
                const isSelected = selectedUser === loc.wristbandId;
                const pathLength = movementPaths[loc.wristbandId]?.length || 0;
                return (
                  <button
                    key={loc.wristbandId}
                    onClick={() => setSelectedUser(isSelected ? null : loc.wristbandId)}
                    className={`
                      w-full p-3.5 text-left rounded-xl border flex flex-col gap-2 transition-all
                      ${isSelected 
                        ? 'bg-blue-600/10 border-blue-500 text-slate-100 shadow-md shadow-blue-500/5' 
                        : 'bg-slate-950/20 border-slate-800/80 hover:bg-slate-900/30 text-slate-400'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{loc.name}</span>
                      <span className="font-mono text-[9px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.25 rounded">
                        {loc.wristbandId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Activity size={10} />
                        <span className="capitalize">{loc.activity}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-slate-400">
                        <Battery size={11} className={loc.battery <= 20 ? 'text-red-400' : 'text-slate-400'} />
                        <span>{loc.battery}%</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 text-[9px] text-blue-400 font-bold border-t border-slate-800/80 pt-2 mt-0.5 uppercase tracking-wide">
                        <Navigation size={10} className="animate-pulse" />
                        <span>Breadcrumb active ({pathLength} points)</span>
                      </div>
                    )}
                  </button>
                );
              })}

              {locations.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No active wristbands connected.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl border border-slate-800/80 bg-[#09101d]/95 text-slate-300 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dispatch log</p>
                <p className="text-sm font-semibold text-white">Staff actions posted</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{dispatches.length} entries</span>
            </div>
            {dispatches.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dispatches.map(entry => (
                  <div key={entry._id || entry.id} className="rounded-2xl bg-slate-950/50 border border-slate-800 p-3 text-[11px] text-slate-300">
                    <div className="font-semibold text-slate-100">{entry.staffName} dispatched</div>
                    <div className="text-slate-500 text-[10px]">To {entry.zoneName} for {entry.wearerName}</div>
                    <div className="mt-2 text-[9px] uppercase tracking-[0.2em] text-slate-500">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-slate-500">Press dispatch to assign staff to nearby warning / restricted incidents.</div>
            )}
          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[10.5px] text-slate-500 font-semibold text-center leading-relaxed">
            Breadcrumbs draw automatically as users move across coordinates.
          </div>
        </div>
      </div>
    </div>
  );
}
