import React, { useEffect, useRef, useState } from 'react';
import { useTelemetry } from '../context/LiveTelemetryContext';
import L from 'leaflet';
import { Radio, Plus, Trash2, Check, X, ShieldAlert, Search } from 'lucide-react';

const getPinIcon = (color) => {
  return L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; user-select: none;">
        <div style="position: absolute; top: -4px; width: 40px; height: 40px; border-radius: 9999px; background-color: ${color}; opacity: 0.15; pointer-events: none;" class="animate-ping"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#070b13" stroke-width="1.5" style="width: 32px; height: 32px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 32],
    popupAnchor: [0, -32]
  });
};

export default function Geofencing() {
  const { locations, geofences, addGeofence, deleteGeofence } = useTelemetry();
  
  // Map and drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [vertices, setVertices] = useState([]); // Array of { lat, lng }
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('restricted'); // 'restricted', 'warning', 'safe'
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const searchMarkerRef = useRef(null);
  
  // Track active layer items on the map
  const polygonsRef = useRef([]);
  const tempVerticesMarkersRef = useRef([]);
  const tempPolygonRef = useRef(null);
  const wearerMarkersRef = useRef({});

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Bangalore center coordinates
    const center = [12.9716, 77.5946];
    
    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true
    }).setView(center, 14);

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

  // Sync click events for drawing mode
  useEffect(() => {
    if (!mapInstance.current) return;

    const handleMapClick = (e) => {
      if (!isDrawing) return;

      const { lat, lng } = e.latlng;
      setVertices(prev => [...prev, { lat, lng }]);
    };

    mapInstance.current.on('click', handleMapClick);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('click', handleMapClick);
      }
    };
  }, [isDrawing]);

  // Update permanent geofence shapes on map
  useEffect(() => {
    if (!mapInstance.current) return;

    // A. Remove existing layers
    polygonsRef.current.forEach(layer => {
      mapInstance.current.removeLayer(layer);
    });
    polygonsRef.current = [];

    // B. Draw existing geofences
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
        fillOpacity: 0.1,
        weight: 2
      }).addTo(mapInstance.current);

      polygon.bindTooltip(fence.name, {
        permanent: true,
        direction: 'center',
        className: 'bg-slate-900/90 border border-slate-700/50 text-slate-300 font-bold text-[10px] rounded px-1.5 py-0.5 shadow-md'
      });

      polygonsRef.current.push(polygon);
    });
  }, [geofences]);

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

  // Render active wearers on the geofencing map as well
  useEffect(() => {
    if (!mapInstance.current) return;
    const currentMap = mapInstance.current;

    locations.forEach(loc => {
      if (!loc.latitude || !loc.longitude) return;
      const position = [loc.latitude, loc.longitude];

      // Determine marker color depending on safety status
      let color = '#10b981'; // Green (Safe)
      if (loc.activity === 'Emergency') {
        color = '#ef4444'; // Red
      } else if (loc.violations && loc.violations.length > 0) {
        color = '#ef4444'; // Red (Restricted)
      } else if (loc.activity === 'Running' || loc.activity === 'Inactivity') {
        color = '#f59e0b'; // Yellow (Warning)
      }

      if (wearerMarkersRef.current[loc.wristbandId]) {
        const marker = wearerMarkersRef.current[loc.wristbandId];
        marker.setLatLng(position);
        marker.getPopup().setContent(getPopupHtml(loc));
        marker.setIcon(getPinIcon(color));
      } else {
        const marker = L.marker(position, {
          icon: getPinIcon(color)
        }).addTo(currentMap);

        marker.bindPopup(getPopupHtml(loc));
        wearerMarkersRef.current[loc.wristbandId] = marker;
      }
    });

    // Remove stale markers
    const activeIds = locations.map(l => l.wristbandId);
    Object.keys(wearerMarkersRef.current).forEach(id => {
      if (!activeIds.includes(id)) {
        currentMap.removeLayer(wearerMarkersRef.current[id]);
        delete wearerMarkersRef.current[id];
      }
    });
  }, [locations]);

  // Draw TEMPORARY vertices and polygons while drawing a new zone
  useEffect(() => {
    if (!mapInstance.current) return;

    // A. Clear old temporary markers
    tempVerticesMarkersRef.current.forEach(marker => {
      mapInstance.current.removeLayer(marker);
    });
    tempVerticesMarkersRef.current = [];

    // B. Clear old temporary line
    if (tempPolygonRef.current) {
      mapInstance.current.removeLayer(tempPolygonRef.current);
      tempPolygonRef.current = null;
    }

    // C. Draw vertices markers
    vertices.forEach((vertex, idx) => {
      const marker = L.circleMarker([vertex.lat, vertex.lng], {
        radius: 5,
        color: '#3b82f6',
        fillColor: '#60a5fa',
        fillOpacity: 0.9,
        weight: 1.5
      }).addTo(mapInstance.current);

      marker.bindTooltip(`Pt ${idx + 1}`, {
        permanent: false,
        direction: 'top'
      });

      tempVerticesMarkersRef.current.push(marker);
    });

    // D. Connect vertices as polygon
    if (vertices.length >= 2) {
      const latlngs = vertices.map(v => [v.lat, v.lng]);
      tempPolygonRef.current = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 2.5,
        dashArray: '4, 6'
      }).addTo(mapInstance.current);
    }
    
    if (vertices.length >= 3) {
      const latlngs = vertices.map(v => [v.lat, v.lng]);
      if (tempPolygonRef.current) mapInstance.current.removeLayer(tempPolygonRef.current);
      tempPolygonRef.current = L.polygon(latlngs, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2.5,
        dashArray: '4, 6'
      }).addTo(mapInstance.current);
    }

  }, [vertices]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setVertices([]);
  };

  const handleSaveGeofence = async () => {
    if (!zoneName) {
      alert('Please provide a name for this geofence');
      return;
    }
    if (vertices.length < 3) {
      alert('A geofence requires at least 3 coordinates points');
      return;
    }

    const payload = {
      name: zoneName,
      coordinates: vertices,
      type: zoneType
    };

    const result = await addGeofence(payload);
    if (result) {
      // Success resets
      setIsDrawing(false);
      setVertices([]);
      setZoneName('');
    }
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setVertices([]);
    setZoneName('');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-wide">Geofencing System</h1>
        <p className="text-slate-400 text-xs mt-1">Configure security boundaries and restricted area intersections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Map Container */}
        <div className="lg:col-span-8 relative">
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
          
          {/* Drawing Status Banner */}
          {isDrawing && (
            <div className="absolute top-4 left-4 right-4 z-[999] p-4 bg-[#0b0f19]/90 border border-blue-500/30 rounded-xl backdrop-blur flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>
                  <strong>Geofence Drawing Mode Active:</strong> Click on the map to define polygon corners. 
                  ({vertices.length} coordinates registered)
                </span>
              </div>
              <button 
                onClick={() => setVertices(prev => prev.slice(0, -1))}
                disabled={vertices.length === 0}
                className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:bg-slate-800 disabled:opacity-50 text-[10px] font-bold"
              >
                Undo Point
              </button>
            </div>
          )}
        </div>

        {/* Right: Boundary Panel & Coordinates Form */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-800 bg-[#0d1321]/40 flex flex-col justify-between h-[580px] overflow-hidden">
          <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
            
            {/* Action Header */}
            {!isDrawing ? (
              <div className="space-y-3.5 pb-2 border-b border-slate-800/80">
                <div>
                  <h3 className="font-bold text-white text-sm">Zone Boundaries ({geofences.length})</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Manage existing GPS coordinates zones</p>
                </div>
                <button
                  onClick={handleStartDrawing}
                  className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl border border-blue-500/20 active:scale-95 transition-all shadow-lg shadow-blue-600/15"
                >
                  <Plus size={16} />
                  <span>Draw New Geofence</span>
                </button>
              </div>
            ) : (
              // New Boundary Form
              <div className="space-y-3.5 pb-4 border-b border-slate-800/80">
                <div>
                  <h3 className="font-bold text-white text-sm">New Boundary Form</h3>
                  <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mt-0.5">Zone Configuration</p>
                </div>
                
                {/* Zone Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Geofence Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Danger Area Gamma"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs text-slate-200 bg-slate-950 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Zone Type */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Threat Level</label>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setZoneType('safe')}
                      className={`py-2 px-1 rounded-xl border font-bold transition-colors ${zoneType === 'safe' ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-450 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      Safe
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoneType('warning')}
                      className={`py-2 px-1 rounded-xl border font-bold transition-colors ${zoneType === 'warning' ? 'bg-amber-500/10 border-amber-500/35 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      Warning
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoneType('restricted')}
                      className={`py-2 px-1 rounded-xl border font-bold transition-colors ${zoneType === 'restricted' ? 'bg-rose-500/10 border-rose-500/35 text-rose-450 text-red-400' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      Restricted
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveGeofence}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-600/10"
                  >
                    <Check size={14} />
                    <span>Save Zone</span>
                  </button>
                  <button
                    onClick={handleCancelDrawing}
                    className="flex items-center justify-center px-3.5 py-2.5 text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* List of existing geofences */}
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 pt-2">
              {geofences.map(fence => (
                <div
                  key={fence._id}
                  className="p-3.5 rounded-xl border border-slate-850 bg-slate-950/20 flex items-center justify-between"
                >
                  <div>
                    <span className="block font-bold text-xs text-white">{fence.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.25 text-[8.5px] font-extrabold uppercase rounded ${
                        fence.type === 'restricted' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : fence.type === 'warning'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {fence.type}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {fence.coordinates.length} points
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete geofence "${fence.name}"?`)) {
                        deleteGeofence(fence._id);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {geofences.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No boundaries constructed. Draw your first zone above!
                </div>
              )}
            </div>

          </div>

          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[10.5px] text-slate-500 text-center leading-relaxed">
            Restricted entries generate instant alerts and flash critical alarms to control room monitors.
          </div>
        </div>
      </div>
    </div>
  );
}
