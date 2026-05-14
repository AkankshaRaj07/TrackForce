import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Plus, 
  Search, 
  Activity, 
  Shield, 
  Edit2,
  Trash2,
  Users,
  Loader2,
  Navigation
} from 'lucide-react';
import './Sites.css';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchSites, createSite, deleteSite, updateSite } from '../api/api';
import { useAuth } from '../context/AuthContext';
import AddSiteModal from '../components/AddSiteModal';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

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
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to recenter map
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center);
  return null;
};


const Sites = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;

  const [sites, setSites] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<any>(null);
  const [toasts, setToasts] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);


  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const data = await fetchSites();
      let filteredSites = data;
      if (!isManager) {
        filteredSites = data.filter((s: any) => s.id === user?.siteId);
      }
      setSites(filteredSites);
      
      if (filteredSites.length > 0) {
        setMapCenter([filteredSites[0].latitude || 20.5937, filteredSites[0].longitude || 78.9629]);
      }
    } catch (err) {
      addToast('Failed to load operational sites', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteSite = (siteId: string) => {
    setSiteToDelete(siteId);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;
    try {
      await deleteSite(siteToDelete);
      addToast('Site deleted successfully', 'success');
      loadSites();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSiteToDelete(null);
      setIsConfirmOpen(false);
    }
  };

  const handleSaveSite = async (siteData: any) => {
    try {
      if (editingSite) {
        await updateSite(editingSite.id, siteData);
        addToast('Site Configuration Updated', 'success');
      } else {
        await createSite(siteData);
        addToast('Site Node Initialized Successfully!', 'success');
      }
      loadSites();
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'error');
      throw err;
    }
  };

  return (
    <div className="sites-page">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>

      <header className="page-header-premium">
        <div className="header-text">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Operational Sites
          </motion.h1>
          <p>Configure geo-fencing and manage site-specific workforce assignments.</p>
        </div>
        {isManager && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-primary" 
            onClick={() => {
              setEditingSite(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={18} /> Add New Site
          </motion.button>
        )}
      </header>

      <div className="sites-layout">
        <div className="sites-list-section">
          <div className="glass-card search-filter-card">
            <div className="search-box">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Find a site..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="sites-grid">
            {loading ? (
              <div className="loading-state-site">
                <Loader2 className="spin" size={40} color="var(--primary)" />
                <p>Synchronizing Site Data...</p>
              </div>
            ) : (
              sites.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((site) => (
                <motion.div 
                  key={site.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card site-card"
                >
                  <div className="site-card-header">
                    <div className="site-icon-wrapper">
                      <MapPin size={20} />
                    </div>
                    <div className="site-status">
                      <span className="status-dot active"></span>
                      ACTIVE
                    </div>
                    {isManager && (
                      <div className="site-actions-premium">
                        <button 
                          className="icon-btn-small edit" 
                          title="Edit Site"
                          onClick={() => {
                            setEditingSite(site);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="icon-btn-small delete" 
                          title="Remove Site"
                          onClick={() => handleDeleteSite(site.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="site-card-body">
                    <h3>{site.name}</h3>
                    <p className="address">{site.location}</p>
                    
                    <div className="site-stats-row">
                      <div className="site-stat">
                        <Users size={14} />
                        <span>{site._count?.employees || 0} Employees</span>
                      </div>
                      <div className="site-stat">
                        <Shield size={14} />
                        <span>{site.geofenceRadius || 500}m Fence</span>
                      </div>
                    </div>
                    
                    {site.latitude && site.latitude !== 0 ? (
                      <div className="coord-badge">
                        📍 {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                      </div>
                    ) : (
                      <div className="coord-badge warning">
                        ⚠️ No Geofence Set
                      </div>
                    )}
                  </div>

                  <div className="site-card-footer">
                    {isManager && (
                      <button className="btn-text" onClick={() => setMapCenter([site.latitude, site.longitude])}>
                        <Navigation size={14} /> Center on Map
                      </button>
                    )}
                  </div>

                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="map-preview-section">
          <div className="glass-card map-preview-card">
            <div className="map-header">
              <h3>Geofence Visualization</h3>
              <div className="map-legend">
                <span className="legend-item active">Operational</span>
                <span className="legend-item fence">Geofence</span>
              </div>
            </div>
            <div className="map-visual-real">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <ChangeView center={mapCenter} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                {sites.map(site => (
                  site.latitude && (
                    <div key={site.id}>
                      <Marker position={[site.latitude, site.longitude]} icon={siteIcon}>
                        <Popup>
                          <strong>{site.name}</strong><br/>
                          {site.location}
                        </Popup>
                      </Marker>
                      <Circle 
                        center={[site.latitude, site.longitude]}
                        radius={site.geofenceRadius || 500}
                        pathOptions={{ color: 'var(--primary)', fillColor: 'var(--primary)', fillOpacity: 0.1 }}
                      />
                    </div>
                  )
                ))}
              </MapContainer>
            </div>
            <div className="map-footer-info">
              <Activity size={16} color="var(--primary)" />
              <span>Real-time GPS data streaming active for all sites</span>
            </div>
          </div>
        </div>
      </div>


      <AddSiteModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingSite(null);
        }}
        onSave={handleSaveSite}
        addToast={addToast}
        initialData={editingSite}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Operational Site"
        message="CRITICAL ACTION: Deleting this site will unassign all employees from their current station. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
};

export default Sites;
