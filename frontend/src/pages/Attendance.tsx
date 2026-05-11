import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import { 
  Check, 
  X, 
  FileText,
  Calendar, 
  ChevronLeft, 
  Clock,
  Scan,
  CheckCircle2,
  Camera,
  MapPin,
  Shield,
  Search,
  Trash2,
  UserPlus
} from 'lucide-react';
import { clockIn, deleteAttendance, fetchTodayLogs, fetchAllLogs, updateAttendanceStatus, clockOut, startBreak, endBreak, enrollBiometric, createSecurityAlert, fetchEmployees, fetchSites, logManualAttendance } from '../api/api';
import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';

import './Attendance.css';

const Attendance = () => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isManagement = isAdmin || isManager;

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [showScanner, setShowScanner] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [logToPurge, setLogToPurge] = useState<string | null>(null);
  const isClockedIn = logs.length > 0 && !logs[0].clockOut;

  const [employees, setEmployees] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualData, setManualData] = useState({
    employeeId: '',
    siteId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    status: 'PRESENT'
  });

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading models:", err);
        addToast("AI initialization failed. Please refresh the page.", 'error');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (showScanner) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showScanner]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      addToast("Could not access camera. Please check permissions.", 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isManagement) {
      loadManagementData();
    }
  }, [isManagement]);

  const loadManagementData = async () => {
    try {
      const [empList, siteList] = await Promise.all([
        fetchEmployees(),
        fetchSites()
      ]);
      setEmployees(empList);
      setSites(siteList);
    } catch (err) {
      addToast("Failed to load workforce intelligence", 'error');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullIn = `${manualData.date}T${manualData.clockIn}:00`;
      const fullOut = manualData.clockOut ? `${manualData.date}T${manualData.clockOut}:00` : null;
      
      await logManualAttendance({
        ...manualData,
        clockIn: fullIn,
        clockOut: fullOut
      });
      
      addToast("Attendance logged successfully!", 'success');
      setShowManualLog(false);
      loadData(); // Refresh logs
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const loadData = async () => {
    if (!user) return;
    try {
      const [today, all] = await Promise.all([
        fetchTodayLogs(user.id),
        isAdmin || isManager ? fetchAllLogs() : Promise.resolve([])
      ]);
      setLogs(today);
      if (isAdmin || isManager) setAllLogs(all);
    } catch (err) {
      console.error("Data load error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isManagement]);

  useEffect(() => {
    if (isClockedIn && logs[0].breaks) {
      const activeBreak = logs[0].breaks.find((b: any) => !b.endTime);
      setIsOnBreak(!!activeBreak);
    }
  }, [logs, isClockedIn]);

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateAttendanceStatus(id, status);
      setAllLogs(allLogs.map(l => l.id === id ? { ...l, status } : l));
      addToast(`Log ${status.toLowerCase()} successfully`, 'success');
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleExport = () => {
    exportToCSV(allLogs, 'Attendance_Report');
  };

  const handleClockOut = async () => {
    if (!user) return;
    
    if (!navigator.geolocation) {
      addToast("Geolocation is not supported by your browser", 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await clockOut(user.id, latitude, longitude);
          addToast("Clocked out successfully! Final location logged.", 'success');
          loadData();
          setShowScanner(false);
        } catch (err: any) {
          addToast(err.message, 'error');
        }
      },
      () => {
        addToast("Please enable location access to clock out.", 'warning');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleToggleBreak = async () => {
    if (!user) return;
    try {
      if (isOnBreak) {
        await endBreak(user.id);
        addToast("Break ended!", 'success');
      } else {
        await startBreak(user.id);
        addToast("Break started!", 'info');
      }
      const updatedLogs = await fetchTodayLogs(user.id);
      setLogs(updatedLogs);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.6);
  };

  const handleEnrollment = async () => {
    if (!user || !user.avatar) {
      addToast("Reference photo not found. Please contact Admin.", 'error');
      return;
    }
    
    setIsScanning(true);
    setScanStatus('scanning');

    try {
      const biometricProof = captureFrame();
      if (!biometricProof) throw new Error("Capture failed - check camera visibility");

      const referenceImg = await faceapi.fetchImage(user.avatar);
      const capturedImg = await faceapi.fetchImage(biometricProof);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI Detection Timed Out - Please check lighting")), 15000)
      );

      const detectionsPromise = (async () => {
        const ref = await faceapi.detectSingleFace(referenceImg).withFaceLandmarks().withFaceDescriptor();
        const cap = await faceapi.detectSingleFace(capturedImg).withFaceLandmarks().withFaceDescriptor();
        return { ref, cap };
      })();

      const { ref: refDetection, cap: capDetection } = await Promise.race([detectionsPromise, timeoutPromise]) as any;

      if (refDetection?.descriptor && capDetection?.descriptor) {
        const distance = faceapi.euclideanDistance(refDetection.descriptor, capDetection.descriptor);
        if (distance < 0.6) {
          const updatedUser = await enrollBiometric(user.id, Array.from(capDetection.descriptor));
          updateUser(updatedUser);
          setScanStatus('success');
          addToast(t('enrollmentSuccess'), 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          await createSecurityAlert({
            type: 'BIOMETRIC_MISMATCH',
            message: `Enrollment Failed: Biometric mismatch for ${user.firstName} ${user.lastName}.`,
            severity: 'HIGH',
            employeeId: user.id
          });
          addToast(t('identityMismatch'), 'error');
          setScanStatus('idle');
        }
      } else {
        addToast("Face not clearly detected. Ensure your face is centered and well-lit.", 'warning');
        setScanStatus('idle');
      }
    } catch (err: any) {
      addToast(err.message || "AI Engine busy - please retry", 'error');
      setScanStatus('idle');
    } finally {
      setIsScanning(false);
    }
  };

  const handleClockAction = async () => {
    if (!user) return;
    
    if (!user.isBiometricEnrolled) {
      handleEnrollment();
      return;
    }

    setIsScanning(true);
    setScanStatus('scanning');
    
    const biometricProof = captureFrame();
    if (!biometricProof) {
      addToast("Failed to capture image", 'error');
      setIsScanning(false);
      setScanStatus('idle');
      return;
    }

    let isMatch = false;
    if (modelsLoaded && user?.avatar) {
      try {
        const referenceImg = await faceapi.fetchImage(user.avatar);
        const capturedImg = await faceapi.fetchImage(biometricProof);

        // AI Timeout Guard
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI Verification Timed Out")), 15000)
        );

        const detectionsPromise = (async () => {
          const ref = await faceapi.detectSingleFace(referenceImg).withFaceLandmarks().withFaceDescriptor();
          const cap = await faceapi.detectSingleFace(capturedImg).withFaceLandmarks().withFaceDescriptor();
          return { ref, cap };
        })();

        const result = await Promise.race([detectionsPromise, timeoutPromise]) as any;
        const { ref: refDetection, cap: capDetection } = result;

        if (refDetection?.descriptor && capDetection?.descriptor) {
          const distance = faceapi.euclideanDistance(refDetection.descriptor, capDetection.descriptor);
          isMatch = distance < 0.6;
        }
      } catch (err) {
        console.error("Verification error:", err);
      }
    }

    if (!isMatch) {
      await createSecurityAlert({
        type: 'BIOMETRIC_MISMATCH',
        message: `Clock-in Failed: Biometric mismatch for ${user.firstName} ${user.lastName}.`,
        severity: 'MEDIUM',
        employeeId: user.id,
        siteId: user.siteId
      });
      addToast("Biometric mismatch! Identity could not be verified.", 'error');
      setScanStatus('idle');
      setIsScanning(false);
      return;
    }

    if (!navigator.geolocation) {
      addToast("Geolocation is not supported by your browser", 'error');
      setScanStatus('idle');
      setIsScanning(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await clockIn(user.id, latitude, longitude, biometricProof);
          setScanStatus('success');
          addToast("Clock-in Successful. Welcome back!", 'success');
          const updatedLogs = await fetchTodayLogs(user.id);
          setLogs(updatedLogs);
          setTimeout(() => {
            setIsScanning(false);
            setScanStatus('idle');
            setShowScanner(false);
          }, 1500);
        } catch (err: any) {
          addToast(err.message, 'error');
          setScanStatus('idle');
          setIsScanning(false);
        }
      },
      (err) => {
        const msg = err.code === 1 ? "Location permission denied." : "Location request timed out.";
        addToast(msg, 'warning');
        setScanStatus('idle');
        setIsScanning(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleDirectClockIn = async () => {
    if (!user) return;
    
    if (!navigator.geolocation) {
      addToast("Geolocation is required for tracking", 'error');
      return;
    }

    setIsScanning(true);
    setScanStatus('scanning');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await clockIn(user.id, latitude, longitude, user.avatar || '');
          setScanStatus('success');
          addToast("Management Override: Clock-in Successful.", 'success');
          const updatedLogs = await fetchTodayLogs(user.id);
          setLogs(updatedLogs);
          setTimeout(() => {
            setIsScanning(false);
            setScanStatus('idle');
          }, 1500);
        } catch (err: any) {
          addToast(err.message, 'error');
          setScanStatus('idle');
          setIsScanning(false);
        }
      },
      (err) => {
        const msg = err.code === 1 ? "Location permission denied." : "Location request timed out.";
        addToast(msg, 'warning');
        setScanStatus('idle');
        setIsScanning(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleDeleteLog = async (id: string) => {
    setLogToPurge(id);
    setShowPurgeConfirm(true);
  };

  const confirmPurge = async () => {
    if (!logToPurge) return;
    try {
      await deleteAttendance(logToPurge);
      addToast('Log purged successfully', 'success');
      setShowPurgeConfirm(false);
      setLogToPurge(null);
      loadData();
    } catch (err) {
      addToast('Failed to purge log', 'error');
    }
  };

  const renderModals = () => (
    <>
      <AnimatePresence>
        {showScanner && (
          <div className="proof-modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card scanner-modal-obsidian"
            >
              <div className="modal-header-premium">
                <h3>{isEnrolling ? t('beginEnrollment') : t('secureVerification')}</h3>
                <button className="close-btn-premium" onClick={() => setShowScanner(false)}><X size={20} /></button>
              </div>

              <div className="biometric-viewport-premium">
                <div className={`scan-ring ${scanStatus}`}></div>
                <div className="camera-sim">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="camera-video"
                  />
                  <div className="scanner-line"></div>
                </div>
              </div>

              <div className="verification-info-premium">
                <div className="v-item"><MapPin size={14} /> {user?.site?.name || 'Assigned Hub'}</div>
                <div className="v-item"><Shield size={14} /> Biometric Secure</div>
              </div>

              <div className="modal-actions-premium">
                <button 
                  className={`btn btn-primary btn-block btn-lg ${isScanning || !modelsLoaded ? 'loading' : ''}`}
                  onClick={isEnrolling ? handleEnrollment : handleClockAction}
                  disabled={isScanning || !modelsLoaded}
                >
                  {!modelsLoaded ? "Initializing AI..." : (isScanning ? t('verifying') : (isEnrolling ? t('beginEnrollment') : t('clockIn')))}
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => setShowScanner(false)}>
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManualLog && (
          <div className="proof-modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card scanner-modal-obsidian manual-log-modal"
              style={{ maxWidth: '500px' }}
            >
              <div className="modal-header-premium">
                <h3>Log Manual Attendance</h3>
                <button className="close-btn-premium" onClick={() => setShowManualLog(false)}><X size={20} /></button>
              </div>

              <form onSubmit={handleManualSubmit} className="manual-log-form" style={{ padding: '20px' }}>
                <div className="form-group-premium" style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Employee</label>
                  <select 
                    value={manualData.employeeId} 
                    onChange={e => setManualData({...manualData, employeeId: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)' }}
                  >
                    <option value="" style={{ background: 'var(--surface)' }}>Choose Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id} style={{ background: 'var(--surface)' }}>{emp.firstName} {emp.lastName} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-premium" style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Operational Site Hub</label>
                  <select 
                    value={manualData.siteId} 
                    onChange={e => setManualData({...manualData, siteId: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)' }}
                  >
                    <option value="" style={{ background: 'var(--surface)' }}>Choose Hub...</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id} style={{ background: 'var(--surface)' }}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row-premium" style={{ display: 'flex', gap: '15px', marginBottom: '1.2rem' }}>
                  <div className="form-group-premium" style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Record Date</label>
                    <input 
                      type="date" 
                      value={manualData.date} 
                      onChange={e => setManualData({...manualData, date: e.target.value})}
                      required
                      style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div className="form-group-premium" style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Attendance Status</label>
                    <select 
                      value={manualData.status} 
                      onChange={e => setManualData({...manualData, status: e.target.value})}
                      style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)' }}
                    >
                      <option value="PRESENT" style={{ background: 'var(--surface)' }}>PRESENT</option>
                      <option value="LATE" style={{ background: 'var(--surface)' }}>LATE</option>
                      <option value="ABSENT" style={{ background: 'var(--surface)' }}>ABSENT</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-premium" style={{ display: 'flex', gap: '15px', marginBottom: '1.5rem' }}>
                  <div className="form-group-premium" style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Clock-In (T1)</label>
                    <input 
                      type="time" 
                      value={manualData.clockIn} 
                      onChange={e => setManualData({...manualData, clockIn: e.target.value})}
                      required
                      style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div className="form-group-premium" style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Clock-Out (T2)</label>
                    <input 
                      type="time" 
                      value={manualData.clockOut} 
                      onChange={e => setManualData({...manualData, clockOut: e.target.value})}
                      style={{ width: '100%', padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <div className="modal-actions-premium" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary btn-block btn-lg">
                    Log Official Record
                  </button>
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowManualLog(false)}>
                    Discard
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProof && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="proof-modal-overlay"
            onClick={() => setSelectedProof(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card scanner-modal-obsidian proof-card-special"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header-premium">
                <h3>{t('biometricSnapshot')}</h3>
                <button className="close-btn-premium" onClick={() => setSelectedProof(null)}><X size={20} /></button>
              </div>
              <div className="proof-content-obsidian">
                <img src={selectedProof} alt="Biometric Proof" />
                <div className="proof-meta-premium">
                  <Shield size={16} />
                  <span>AI-Verified Geometric Match</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPurgeConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="proof-modal-overlay"
            onClick={() => setShowPurgeConfirm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card scanner-modal-obsidian confirm-purge-modal"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-icon-header warning" style={{ textAlign: 'center', padding: '2rem 0', color: '#ef4444' }}>
                <Trash2 size={64} />
              </div>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Confirm Data Purge</h3>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem', lineHeight: '1.6' }}>
                Are you sure you want to permanently delete this attendance record? This action will also remove all associated break data and cannot be undone.
              </p>
              <div className="modal-actions-premium" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-block btn-lg" style={{ backgroundColor: '#ef4444' }} onClick={confirmPurge}>
                  Purge Record Permanently
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => setShowPurgeConfirm(false)}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (!isManagement) {
    return (
      <div className="enterprise-page user-view">
        <div className="premium-toast-container">
          <AnimatePresence>
            {toasts.map((t) => (
              <Toast key={t.id} {...t} onClose={removeToast} />
            ))}
          </AnimatePresence>
        </div>
        
        <div className="user-attendance-grid">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card scanner-card"
          >
            <div className="verification-placeholder">
              <div className="placeholder-icon">
                <Shield size={48} color={user?.isBiometricEnrolled ? 'var(--primary)' : 'var(--error)'} />
              </div>
              <h3>{user?.isBiometricEnrolled ? (isClockedIn ? t('status') + ': ' + t('active') : t('verificationRequired')) : t('enrollmentRequired')}</h3>
              <p>
                {!user?.isBiometricEnrolled 
                  ? t('enrollmentSubtext')
                  : isClockedIn 
                    ? `${t('clockedInAt')} ${new Date(logs[0].clockIn).toLocaleTimeString()}.`
                    : t('verificationInstruction')}
              </p>
              
              <div className="action-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                {!user?.isBiometricEnrolled ? (
                  <button 
                    className="btn btn-primary btn-lg btn-block"
                    onClick={() => {
                      if (isManagement) {
                        handleDirectClockIn();
                      } else {
                        setIsEnrolling(true);
                        setShowScanner(true);
                      }
                    }}
                  >
                    {t('beginEnrollment')}
                  </button>
                ) : !isClockedIn ? (
                    <button 
                      className="btn btn-primary btn-lg btn-block"
                      onClick={() => {
                        if (isManagement) {
                          handleDirectClockIn();
                        } else {
                          setIsEnrolling(false);
                          setShowScanner(true);
                        }
                      }}
                    >
                      {t('startSecureVerification')}
                    </button>
                ) : (
                  <>
                    <button 
                      className={`btn ${isOnBreak ? 'btn-primary' : 'btn-outline'} btn-lg btn-block`}
                      onClick={handleToggleBreak}
                    >
                      {isOnBreak ? 'End Break' : 'Start Break'}
                    </button>
                    <button 
                      className="btn btn-danger btn-lg btn-block"
                      onClick={handleClockOut}
                      style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                    >
                      {t('clockOut')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <div className="user-stats-container">
            <div className="stats-row">
              <div className="glass-card s-card">
                <span className="label">{t('todayHours')}</span>
                <h2 className="value">{logs.length > 0 ? "00:00:00" : "00:00:00"}</h2>
              </div>
              <div className="glass-card s-card">
                <span className="label">{t('weeklyProgress')}</span>
                <h2 className="value">0.0h / 40h</h2>
              </div>
            </div>

            <div className="glass-card personal-timeline">
              <div className="card-header">
                <h3>{t('history')}</h3>
                <button className="btn-ghost btn-sm">{t('requestCorrection')}</button>
              </div>
              <div className="mini-table">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="mini-row">
                    <span className="m-date">{new Date(log.date).toLocaleDateString()}</span>
                    <span className="m-time">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('active')}
                    </span>
                    <span className={`m-status ${log.clockOut ? 'approved' : 'pending'}`}>
                      {log.clockOut ? t('completed') : t('onSite')}
                    </span>
                  </div>
                )) : (
                  <div className="no-logs">{t('noLogs')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="enterprise-page">
      <div className="premium-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
      <div className="attendance-layout">
        <aside className="profile-sidebar glass-card">
          <div className="profile-card-mini">
            <div className="avatar-wrapper">
              <img src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} alt="Profile" className="large-avatar" />
              <span className="status-badge">{user?.role || 'Staff'}</span>
            </div>
            <h3>{user?.firstName} {user?.lastName}</h3>
            <p className="role-text">{user?.jobTitle || 'System Administrator'}</p>
            {user?.isBiometricEnrolled && (
              <div className="biometric-verified-badge">
                <Shield size={14} className="verified-icon" />
                <span>BIOMETRIC SECURED</span>
              </div>
            )}
          </div>

          <div className="personal-actions-sidebar">
            {isClockedIn ? (
              <div className="status-indicator active">
                <div className="pulse-dot"></div>
                <span>ON DUTY</span>
              </div>
            ) : (
              <div className="status-indicator inactive">
                <span>OFF DUTY</span>
              </div>
            )}
            
            <button 
              className={`btn ${isClockedIn ? 'btn-danger' : 'btn-primary'} btn-block`}
              onClick={isClockedIn ? handleClockOut : (isManagement ? handleDirectClockIn : () => setShowScanner(true))}
              style={isClockedIn ? { backgroundColor: '#ef4444', color: 'white', border: 'none' } : {}}
            >
              {isClockedIn ? <X size={16} /> : <Clock size={16} />}
              {isClockedIn ? t('clockOut') : t('clockIn')}
            </button>
          </div>

          <div className="hours-summary">
            <div className="total-hours-main">
              <Clock size={18} />
              <div className="v-stack">
                <span className="value">264.00</span>
                <span className="label">Total hours</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="attendance-main">
          <header className="main-header-row">
            <div className="title-section">
              <button className="btn-back"><ChevronLeft size={20} /></button>
              <h1>{t('workforceAttendance')}</h1>
            </div>
            <div className="date-picker-button">
              <Calendar size={16} />
              <span>1st Jun - 31st Jul 2022</span>
            </div>
          </header>

          <section className="breakdown-banner glass-card">
            <div className="breakdown-info">
              <div className="b-text">
                <span className="label">Global Efficiency</span>
                <h2 className="value">94.2%</h2>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '94%' }}></div>
              </div>
            </div>
            <div className="breakdown-stats">
              <div className="s-item"><span className="dot approved"></span> {t('approved')}: 92 hrs</div>
              <div className="s-item"><span className="dot rejected"></span> {t('rejected')}: 0 hrs</div>
              <div className="s-item"><span className="dot pending"></span> {t('pending')}: 0 hrs</div>
            </div>
          </section>

          <div className="action-bar">
            <div className="toggle-group">
              <button className="toggle-btn active"><FileText size={14} /> {t('timecard')}</button>
              <button className="toggle-btn"><Clock size={14} /> {t('timeline')}</button>
            </div>
            <div className="btn-row">
              <button className="btn-outline" onClick={handleExport}>{t('exportReport')}</button>
              <button className="btn btn-primary" onClick={() => setShowManualLog(true)}>
                <UserPlus size={16} /> Log Manual Entry
              </button>
            </div>
          </div>

          <div className="table-container glass-card">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>{t('employee')}</th>
                  <th>{t('date')}</th>
                  <th>{t('checkin')}</th>
                  <th>{t('checkout')}</th>
                  <th>{t('verification')}</th>
                  <th>{t('status')}</th>
                  <th>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {allLogs.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td className="emp-cell">
                      <div className="tiny-avatar">{log.employee?.firstName?.charAt(0) || 'E'}</div>
                      <span>{log.employee?.firstName} {log.employee?.lastName}</span>
                    </td>
                    <td>{new Date(log.date).toLocaleDateString()}</td>
                    <td>{log.clockIn ? new Date(log.clockIn).toLocaleTimeString() : '---'}</td>
                    <td>{log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '---'}</td>
                    <td>
                      {log.biometricProof ? (
                        <button className="btn-proof" onClick={() => setSelectedProof(log.biometricProof)}>
                          <Camera size={14} /> {t('viewProof')}
                        </button>
                      ) : (
                        <span className="no-proof">{t('noImage')}</span>
                      )}
                    </td>
                    <td><span className={`badge badge-${log.status?.toLowerCase()}`}>{t(log.status?.toLowerCase())}</span></td>
                    <td>
                      <div className="approval-actions">
                        {log.status === 'PENDING' && (
                          <>
                            <button className="status-btn approve" onClick={() => handleStatusUpdate(log.id, 'APPROVED')} title="Approve"><Check size={14} /></button>
                            <button className="status-btn reject" onClick={() => handleStatusUpdate(log.id, 'REJECTED')} title="Reject"><X size={14} /></button>
                          </>
                        )}
                        <button className="status-btn delete" onClick={() => handleDeleteLog(log.id)} title="Purge Log" style={{ color: '#ef4444' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
      {renderModals()}
    </div>
  );
};

export default Attendance;
