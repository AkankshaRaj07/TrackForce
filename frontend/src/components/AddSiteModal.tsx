import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Search, Navigation, CheckCircle2, Loader2, Sparkles, Shield, MousePointer2 } from 'lucide-react';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './AddSiteModal.css';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const siteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to recenter map
const MapRefresher = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 18); // Increased zoom for 'reachability' of small places
  }, [center, map]);
  return null;
};


interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (site: any) => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  initialData?: any;
}

const AddSiteModal = ({ isOpen, onClose, onSave, addToast, initialData }: AddSiteModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: 0,
    longitude: 0,
    managerName: 'Admin',
    geofenceRadius: 300
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        location: initialData.location || '',
        latitude: initialData.latitude || 0,
        longitude: initialData.longitude || 0,
        managerName: initialData.managerName || 'Admin',
        geofenceRadius: initialData.geofenceRadius || 300
      });
      setSearchQuery(initialData.location || '');
    } else {
      setFormData({
        name: '',
        location: '',
        latitude: 0,
        longitude: 0,
        managerName: 'Admin',
        geofenceRadius: 300
      });
      setSearchQuery('');
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        handleSearch(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      // Switching to Photon API (Photon is powered by Elasticsearch and often better at finding POIs like colleges)
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      // Transform Photon format to match our previous expectation or map it directly
      const formattedResults = data.features.map((f: any) => ({
        display_name: [
          f.properties.name,
          f.properties.street,
          f.properties.city,
          f.properties.state,
          f.properties.country
        ].filter(Boolean).join(', '),
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }));

      setSuggestions(formattedResults);
    } catch (err) {
      console.error(err);
      // Fallback to basic Nominatim if Photon fails
      const fallback = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const fallbackData = await fallback.json();
      setSuggestions(fallbackData);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (s: any) => {
    const lat = parseFloat(s.lat);
    const lon = parseFloat(s.lon);
    setFormData({
      ...formData,
      location: s.display_name,
      latitude: lat,
      longitude: lon
    });
    setSearchQuery(s.display_name);
    setSuggestions([]);
    addToast('Location synchronized. You can now adjust the pin on the map.', 'success');
  };

  const handleMapAction = async (lat: number, lon: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }));
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (data.display_name) {
        setFormData(prev => ({ ...prev, location: data.display_name }));
        setSearchQuery(data.display_name);
      }
    } catch (err) {
      console.error("Reverse geocode failed", err);
    }
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        handleMapAction(e.latlng.lat, e.latlng.lng);
      },
    });

    return (
      <>
        <Marker 
          position={[formData.latitude, formData.longitude]} 
          icon={siteIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e: any) => {
              const marker = e.target;
              const position = marker.getLatLng();
              handleMapAction(position.lat, position.lng);
            },
          }}
        />
        <Circle 
          center={[formData.latitude, formData.longitude]}
          radius={formData.geofenceRadius}
          pathOptions={{ color: 'var(--error)', fillColor: 'var(--error)', fillOpacity: 0.1, dashArray: '5, 5' }}
        />
      </>
    );
  };


  const fetchCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      addToast('Geolocation not supported', 'error');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        
        try {
          // Reverse Geocoding
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await response.json();
          const address = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          
          setFormData({
            ...formData,
            location: address,
            latitude: lat,
            longitude: lon
          });
          setSearchQuery(address);
          addToast('Location and Address synchronized', 'success');
        } catch (err) {
          setFormData({
            ...formData,
            latitude: lat,
            longitude: lon
          });
          addToast('Coordinates fetched (Address lookup failed)', 'info');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        addToast('Location access denied', 'error');
        setIsLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location) {
      addToast('Please fill all required fields', 'info');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card modal-content-large"
          >
            <div className="modal-header">
              <div className="title-with-sparkle">
                <Sparkles className="sparkle-icon" size={20} />
                <h3>{initialData ? 'Modify Site Configuration' : 'Initialize Operational Site'}</h3>
              </div>
              <button type="button" onClick={onClose} className="icon-btn"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="site-form-premium">
              <div className="modal-body-scrollable">
                <div className="modal-two-column-layout">
                  {/* Left Column: Essential Details */}
                  <div className="modal-column details-column">
                    <div className="form-group">
                      <label>Site Name</label>
                      <div className="input-with-icon">
                        <Navigation size={18} />
                        <input
                          type="text"
                          required
                          placeholder="e.g. London Gateway HQ"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="form-group" ref={searchRef}>
                      <label>Physical Address & Search</label>
                      <div className="location-input-group">
                        <div className="input-with-icon flex-1">
                          <Search size={18} />
                          <input
                            type="text"
                            placeholder="Search address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          {isSearching && <Loader2 className="spinner-icon" size={16} />}
                        </div>
                        <button 
                          type="button" 
                          className="icon-tool-btn-small" 
                          onClick={fetchCurrentLocation}
                          title="Use Current Location"
                        >
                          {isLocating ? <Loader2 className="spin" size={18} /> : <MapPin size={18} />}
                        </button>
                      </div>

                      <AnimatePresence>
                        {suggestions.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="suggestions-dropdown"
                          >
                            {suggestions.map((s, idx) => (
                              <div 
                                key={idx} 
                                className="suggestion-item" 
                                onClick={() => handleSelectSuggestion(s)}
                              >
                                <MapPin size={14} className="suggestion-icon" />
                                <div className="suggestion-text-stack">
                                  <span className="main-place">{s.display_name.split(',')[0]}</span>
                                  <span className="sub-address">{s.display_name.split(',').slice(1).join(',')}</span>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="coord-preview-grid">
                      <div className="coord-box">
                        <span>LATITUDE</span>
                        <code>{formData.latitude.toFixed(6)}</code>
                      </div>
                      <div className="coord-box">
                        <span>LONGITUDE</span>
                        <code>{formData.longitude.toFixed(6)}</code>
                      </div>
                    </div>

                    <div className="geofence-control-center">
                      <div className="geofence-header-premium">
                        <div className="title">
                          <Shield size={18} />
                          <span>Security Perimeter</span>
                        </div>
                        <div className="value-badge">
                          {formData.geofenceRadius} <span>meters</span>
                        </div>
                      </div>
                      
                      <div className="geofence-slider-wrapper">
                        <input 
                          type="range" 
                          min="50" 
                          max="2000" 
                          step="50"
                          value={formData.geofenceRadius}
                          onChange={(e) => setFormData({...formData, geofenceRadius: parseInt(e.target.value)})}
                          className="premium-slider"
                        />
                        <div className="slider-labels">
                          <span>50m</span>
                          <span>1km</span>
                          <span>2km</span>
                        </div>
                      </div>

                      <div className="geofence-input-sync">
                        <input 
                          type="number" 
                          value={formData.geofenceRadius}
                          onChange={(e) => setFormData({...formData, geofenceRadius: parseInt(e.target.value) || 0})}
                          min="10"
                          max="5000"
                        />
                        <span className="unit">MANUAL ENTRY (M)</span>
                      </div>
                      <p className="geofence-hint">Geofencing protocol will be strictly enforced within this radius.</p>
                    </div>

                  </div>

                  {/* Right Column: Map Selection */}
                  <div className="modal-column map-column">
                    <div className="map-selection-section-compact">
                      <div className="map-section-header">
                        <div className="title">
                          <MousePointer2 size={16} />
                          <span>Pin Placement</span>
                        </div>
                        <span className="hint">Drag or click map</span>
                      </div>
                      <div className="modal-map-container-large">
                        <MapContainer 
                          center={[formData.latitude || 20.5937, formData.longitude || 78.9629]} 
                          zoom={formData.latitude ? 15 : 4} 
                          style={{ height: '360px', width: '100%', borderRadius: '16px' }}
                        >
                          <MapRefresher center={[formData.latitude || 20.5937, formData.longitude || 78.9629]} />
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <LocationMarker />
                        </MapContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-sticky">
                <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                  {initialData ? 'Update Site Node' : 'Initialize Site Node'}
                </button>
              </div>
            </form>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddSiteModal;
