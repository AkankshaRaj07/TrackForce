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
  Loader2
} from 'lucide-react';
import './Sites.css';

import { useEffect, useState } from 'react';
import { fetchSites, createSite, deleteSite, updateSite } from '../api/api';
import { useAuth } from '../context/AuthContext';
import AddSiteModal from '../components/AddSiteModal';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

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
      if (isManager) {
        setSites(data);
      } else {
        setSites(data.filter((s: any) => s.id === user?.siteId));
      }
    } catch (err) {
      addToast('Failed to load operational hubs', 'error');
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
      addToast('Hub deleted successfully', 'success');
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
        addToast('Hub Configuration Updated', 'success');
      } else {
        await createSite(siteData);
        addToast('Hub Node Initialized Successfully!', 'success');
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
            Operational Hubs
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
              <div className="loading-state-hub">
                <Loader2 className="spin" size={40} />
                <p>Synchronizing Hub Data...</p>
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
                          title="Edit Hub"
                          onClick={() => {
                            setEditingSite(site);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="icon-btn-small delete" 
                          title="Remove Hub"
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
                      <button className="btn-text" onClick={() => addToast('Opening hub analytics...', 'info')}>
                        <MapPin size={14} /> View Hub Map
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
                <span className="legend-item active">Active</span>
                <span className="legend-item fence">Fence</span>
              </div>
            </div>
            <div className="map-visual-mock">
              <div className="visual-circle main-hub"></div>
              <div className="visual-circle sub-hub-1"></div>
              <div className="visual-circle sub-hub-2"></div>
              <div className="map-grid-overlay"></div>
              
              {sites.slice(0, 3).map((site, idx) => (
                <div 
                  key={site.id} 
                  className={`map-label h${idx + 1}`} 
                  style={{ 
                    top: idx === 0 ? '40%' : idx === 1 ? '20%' : '70%',
                    left: idx === 0 ? '45%' : idx === 1 ? '70%' : '20%'
                  }}
                >
                  {site.name}
                </div>
              ))}
            </div>
            <div className="map-footer-info">
              <Activity size={16} color="var(--primary)" />
              <span>Real-time GPS data streaming active for all hubs</span>
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
        title="Delete Operational Hub"
        message="CRITICAL ACTION: Deleting this hub will unassign all employees from their current station. This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
};

export default Sites;
