import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Search, Navigation, CheckCircle2, Loader2, Sparkles, Shield } from 'lucide-react';
import './AddSiteModal.css';

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
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (s: any) => {
    setFormData({
      ...formData,
      location: s.display_name,
      latitude: parseFloat(s.lat),
      longitude: parseFloat(s.lon)
    });
    setSearchQuery(s.display_name);
    setSuggestions([]);
    addToast('Location nodes synchronized', 'success');
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
                <h3>{initialData ? 'Modify Hub Configuration' : 'Initialize Operational Hub'}</h3>
              </div>
              <button type="button" onClick={onClose} className="icon-btn"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="hub-form">
              <div className="form-group">
                <label>Hub Name</label>
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
                      placeholder="Search address for geocoding..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && <Loader2 className="spinner-icon" size={16} />}
                  </div>
                  <button 
                    type="button" 
                    className="icon-tool-btn" 
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
                          <MapPin size={14} />
                          <span>{s.display_name}</span>
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

              <div className="geofence-info-box">
                <Shield size={24} />
                <div className="geofence-config">
                  <h4>Security Perimeter (Meters)</h4>
                  <div className="radius-input-wrapper">
                    <input 
                      type="number" 
                      value={formData.geofenceRadius}
                      onChange={(e) => setFormData({...formData, geofenceRadius: parseInt(e.target.value) || 0})}
                      min="10"
                      max="5000"
                    />
                    <span>meters</span>
                  </div>
                  <p>Strict geofencing will be enforced within this radius.</p>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                  {initialData ? 'Update Hub Node' : 'Create Hub Node'}
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
