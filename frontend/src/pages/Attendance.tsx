import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';


import * as faceapi from 'face-api.js';
import { 
  Check, 
  X, 
  FileText,
  Calendar, 
  ChevronLeft, 
  Clock,
  Camera,
  MapPin,
  Shield,
  Trash2,
  UserPlus,
  User,
  CheckCircle,
  XCircle,
  LayoutGrid,
  Search,
  Filter,
  ChevronRight,
  Pencil,
} from 'lucide-react';


import { clockIn, deleteAttendance, fetchTodayLogs, fetchAllLogs, updateAttendanceStatus, clockOut, enrollBiometric, createSecurityAlert, fetchEmployees, fetchSites, logManualAttendance, updateAttendanceTimes } from '../api/api';
import { exportToCSV } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import type { ToastType } from '../components/Toast';

import { loadFaceApiModels, areModelsLoaded } from '../utils/aiModels';
import './Attendance.css';
import EmployeeAttendance from './EmployeeAttendance';



const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const base64ToBlob = (base64: string) => {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

const Attendance = () => {
  const navigate = useNavigate();
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
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(areModelsLoaded());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasDefaultedRef = useRef(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'timecard' | 'timeline' | 'grid'>('timecard');


  const [toasts, setToasts] = useState<any[]>([]);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [logToPurge, setLogToPurge] = useState<string | null>(null);
  const isClockedIn = logs.length > 0 && !logs[0].clockOut;

  const [employees, setEmployees] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [showManualLog, setShowManualLog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    clockIn: '',
    clockOut: ''
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showInTimePicker, setShowInTimePicker] = useState(false);
  const [showOutTimePicker, setShowOutTimePicker] = useState(false);
  const [manualData, setManualData] = useState({
    employeeId: '',
    siteId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '09:00',
    clockOut: '17:00',
    status: 'PRESENT'
  });

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    date: new Date().toISOString().split('T')[0],
    message: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('all');

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const isMockProof = (proof: string | null) => {
    if (!proof) return true;
    return !proof.includes('/uploads/') && !proof.startsWith('data:') && !proof.startsWith('http://localhost:5000/uploads') && !proof.startsWith('https://');
  };

  useEffect(() => {
    if (!modelsLoaded) {
      loadFaceApiModels()
        .then(() => setModelsLoaded(true))
        .catch(err => {
          console.error("AI load error:", err);
          addToast("AI initialization failed.", 'error');
        });
    }
  }, [modelsLoaded]);

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
      setEmployees(Array.isArray(empList) ? empList.filter((e: any) => e.role !== 'ADMIN') : []);
      setSites(Array.isArray(siteList) ? siteList : []);
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
        fetchAllLogs()
      ]);
      setLogs(today);
      setAllLogs(all);

      // Smart default: If today has no logs but there are logs in the database,
      // and we haven't smart-defaulted yet, default the daily selection to the most recent date with records.
      if (all && all.length > 0 && !hasDefaultedRef.current) {
        const todayStr = new Date().toISOString().split('T')[0];
        const hasLogsForToday = all.some((log: any) => {
          const dObj = new Date(log.date);
          const dStr = `${dObj.getFullYear()}-${(dObj.getMonth() + 1).toString().padStart(2, '0')}-${dObj.getDate().toString().padStart(2, '0')}`;
          return dStr === todayStr;
        });

        if (!hasLogsForToday && selectedDate === todayStr) {
          const dates = all.map((log: any) => new Date(log.date));
          const maxDate = new Date(Math.max(...dates.map((d: any) => d.getTime())));
          const maxDateStr = `${maxDate.getFullYear()}-${(maxDate.getMonth() + 1).toString().padStart(2, '0')}-${maxDate.getDate().toString().padStart(2, '0')}`;
          setSelectedDate(maxDateStr);
          hasDefaultedRef.current = true;
        }
      }
    } catch (err) {
      console.error("Data load error:", err);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh interval (30 seconds)
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, isManagement]);



  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED' | 'PRESENT' | 'ABSENT') => {
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    try {
      const dateStr = new Date(editingLog.date).toISOString().split('T')[0];
      const fullIn = `${dateStr}T${editForm.clockIn}:00`;
      const fullOut = editForm.clockOut ? `${dateStr}T${editForm.clockOut}:00` : null;

      await updateAttendanceTimes(editingLog.id, fullIn, fullOut);
      addToast("Log updated successfully", 'success');
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || "Failed to update log", 'error');
    }
  };



  const handleClockOut = async () => {
    if (!user) return;
    if (isManagement) {
      handleDirectClockOut();
      return;
    }
    setIsClockingOut(true);
    setIsEnrolling(false);
    setShowScanner(true);
  };

  const handleDirectClockOut = async () => {
    if (!user) return;
    if (!navigator.geolocation) {
      addToast("Geolocation is required for tracking", 'error');
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        await clockOut(user.id, latitude, longitude);
        addToast("Management Override: Clock-out Successful.", 'success');
        const updatedLogs = await fetchTodayLogs(user.id);
        setLogs(updatedLogs);
      });
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

      const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`;

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI Detection Timed Out - Please check lighting")), 15000)
      );

      const detectionsPromise = (async () => {
        const referenceImg = await faceapi.fetchImage(avatarUrl);
        const capturedImg = await faceapi.fetchImage(biometricProof);
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
        const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`;
        const referenceImg = await faceapi.fetchImage(avatarUrl);
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
          const formData = new FormData();
          formData.append('latitude', latitude.toString());
          formData.append('longitude', longitude.toString());
          formData.append('fullName', `${user.firstName} ${user.lastName}`);
          
          if (biometricProof) {
            const proofBlob = base64ToBlob(biometricProof);
            formData.append('biometricProof', proofBlob, `proof-${user.id}-${Date.now()}.jpg`);
          }

          if (isClockingOut) {
            await clockOut(user.id, latitude, longitude, formData);
            addToast("Clock-out Successful. Goodbye!", 'success');
          } else {
            await clockIn(user.id, latitude, longitude, formData);
            addToast("Clock-in Successful. Welcome back!", 'success');
          }
          setScanStatus('success');
          const updatedLogs = await fetchTodayLogs(user.id);
          setLogs(updatedLogs);
          setTimeout(() => {
            setIsScanning(false);
            setScanStatus('idle');
            setShowScanner(false);
            setIsClockingOut(false);
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
          const formData = new FormData();
          formData.append('latitude', latitude.toString());
          formData.append('longitude', longitude.toString());
          
          await clockIn(user.id, latitude, longitude, formData);
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

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createSecurityAlert({
        type: 'CORRECTION_REQUEST',
        message: `Correction Request from ${user.firstName} ${user.lastName} for ${correctionData.date}: ${correctionData.message}`,
        severity: 'LOW',
        employeeId: user.id,
        siteId: user.siteId
      });
      addToast("Correction request submitted to management.", 'success');
      setShowCorrectionModal(false);
      setCorrectionData({ date: new Date().toISOString().split('T')[0], message: '' });
    } catch (err) {
      addToast("Failed to submit correction request", 'error');
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
                <div className="v-item"><MapPin size={14} /> {user?.site?.name || 'Assigned Site'}</div>
                <div className="v-item">Biometric Secure</div>
              </div>

              <div className="modal-actions-premium">
                <button 
                  className={`btn btn-primary btn-block btn-lg ${isScanning || !modelsLoaded ? 'loading' : ''}`}
                  onClick={isEnrolling ? handleEnrollment : handleClockAction}
                  disabled={isScanning || !modelsLoaded}
                >
                  {!modelsLoaded ? "Initializing AI..." : (isScanning ? t('verifying') : (isEnrolling ? t('beginEnrollment') : (isClockingOut ? t('clockOut') : t('clockIn'))))}
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
                <div className="form-group-premium">
                  <label>Select Employee</label>
                  <select 
                    value={manualData.employeeId} 
                    onChange={e => setManualData({...manualData, employeeId: e.target.value})}
                    required
                    className="premium-input"
                  >
                    <option value="">Choose Employee...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-premium">
                  <label>Operational Site</label>
                  <select 
                    value={manualData.siteId} 
                    onChange={e => setManualData({...manualData, siteId: e.target.value})}
                    required
                    className="premium-input"
                  >
                    <option value="">Choose Site...</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row-premium">
                  <div className="form-group-premium" style={{ position: 'relative' }}>
                    <label>Record Date</label>
                    <div 
                      className="premium-input custom-date-trigger" 
                      onClick={() => setShowCalendar(!showCalendar)}
                    >
                      <Calendar size={16} />
                      <span>{new Date(manualData.date).toLocaleDateString()}</span>
                    </div>

                    <AnimatePresence>
                      {showCalendar && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="custom-calendar-popup glass-card"
                        >
                          <div className="calendar-grid-premium">
                            <div className="cal-header">
                              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </div>
                            <div className="cal-days">
                              {['S','M','T','W','T','F','S'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
                              {Array.from({length: 31}, (_, i) => {
                                const d = i + 1;
                                const isSelected = new Date(manualData.date).getDate() === d;
                                return (
                                  <div 
                                    key={d} 
                                    className={`cal-date ${isSelected ? 'selected' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newDate = new Date();
                                      newDate.setDate(d);
                                      setManualData({...manualData, date: newDate.toISOString().split('T')[0]});
                                      setShowCalendar(false);
                                    }}
                                  >
                                    {d}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="form-group-premium">
                    <label>Attendance Status</label>
                    <select 
                      value={manualData.status} 
                      onChange={e => setManualData({...manualData, status: e.target.value})}
                      className="premium-input"
                    >
                      <option value="PRESENT">PRESENT</option>
                      <option value="LATE">LATE</option>
                      <option value="ABSENT">ABSENT</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-premium bottom-row">
                  <div className="form-group-premium" style={{ position: 'relative' }}>
                    <label>Clock-In (T1)</label>
                    <div 
                      className="premium-input custom-date-trigger" 
                      onClick={() => {
                        setShowInTimePicker(!showInTimePicker);
                        setShowOutTimePicker(false);
                        setShowCalendar(false);
                      }}
                    >
                      <Clock size={16} />
                      <span>{manualData.clockIn}</span>
                    </div>
                    <AnimatePresence>
                      {showInTimePicker && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="custom-time-popup glass-card"
                        >
                          <div className="time-picker-precision">
                            <div className="time-column">
                              <div className="col-label">Hrs</div>
                              {[...Array(24)].map((_, h) => {
                                const val = h.toString().padStart(2, '0');
                                const isSel = manualData.clockIn.startsWith(val);
                                return (
                                  <div 
                                    key={h} 
                                    className={`time-unit ${isSel ? 'selected' : ''}`}
                                    onClick={() => setManualData({...manualData, clockIn: `${val}:${manualData.clockIn.split(':')[1]}`})}
                                  >
                                    {val}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="time-column">
                              <div className="col-label">Min</div>
                              {[...Array(60)].map((_, m) => {
                                const val = m.toString().padStart(2, '0');
                                const isSel = manualData.clockIn.endsWith(val);
                                return (
                                  <div 
                                    key={m} 
                                    className={`time-unit ${isSel ? 'selected' : ''}`}
                                    onClick={() => setManualData({...manualData, clockIn: `${manualData.clockIn.split(':')[0]}:${val}`})}
                                  >
                                    {val}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <button className="btn-tiny-done" onClick={() => setShowInTimePicker(false)}>Done</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="form-group-premium" style={{ position: 'relative' }}>
                    <label>Clock-Out (T2)</label>
                    <div 
                      className="premium-input custom-date-trigger" 
                      onClick={() => {
                        setShowOutTimePicker(!showOutTimePicker);
                        setShowInTimePicker(false);
                        setShowCalendar(false);
                      }}
                    >
                      <Clock size={16} />
                      <span>{manualData.clockOut}</span>
                    </div>
                    <AnimatePresence>
                      {showOutTimePicker && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="custom-time-popup glass-card"
                        >
                          <div className="time-picker-precision">
                            <div className="time-column">
                              <div className="col-label">Hrs</div>
                              {[...Array(24)].map((_, h) => {
                                const val = h.toString().padStart(2, '0');
                                const isSel = manualData.clockOut.startsWith(val);
                                return (
                                  <div 
                                    key={h} 
                                    className={`time-unit ${isSel ? 'selected' : ''}`}
                                    onClick={() => setManualData({...manualData, clockOut: `${val}:${manualData.clockOut.split(':')[1]}`})}
                                  >
                                    {val}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="time-column">
                              <div className="col-label">Min</div>
                              {[...Array(60)].map((_, m) => {
                                const val = m.toString().padStart(2, '0');
                                const isSel = manualData.clockOut.endsWith(val);
                                return (
                                  <div 
                                    key={m} 
                                    className={`time-unit ${isSel ? 'selected' : ''}`}
                                    onClick={() => setManualData({...manualData, clockOut: `${manualData.clockOut.split(':')[0]}:${val}`})}
                                  >
                                    {val}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <button className="btn-tiny-done" onClick={() => setShowOutTimePicker(false)}>Done</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
              <div className="proof-content-obsidian" style={{ position: 'relative' }}>
                {selectedProof && isMockProof(selectedProof) ? (
                  <div className="mock-biometric-vector">
                    <svg viewBox="0 0 100 100" className="bio-scan-svg">
                      <circle cx="50" cy="50" r="40" stroke="var(--primary)" strokeWidth="1" fill="none" opacity="0.15" />
                      <circle cx="50" cy="50" r="30" stroke="var(--primary)" strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="5,5" className="spinning-circle" />
                      
                      {/* Face silhouette */}
                      <path d="M50,25 C40,25 35,32 35,45 C35,55 42,65 50,65 C58,65 65,55 65,45 C65,32 60,25 50,25 Z" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
                      <path d="M30,80 C30,70 38,68 50,68 C62,68 70,70 70,80" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
                      
                      {/* Scanner target lines */}
                      <path d="M25,25 L35,25 M25,25 L25,35" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
                      <path d="M75,25 L65,25 M75,25 L75,35" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
                      <path d="M25,75 L35,75 M25,75 L25,65" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
                      <path d="M75,75 L65,75 M75,75 L75,65" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
                      
                      {/* Laser line animation */}
                      <line x1="20" y1="50" x2="80" y2="50" stroke="var(--primary)" strokeWidth="1.5" className="laser-line" />
                      
                      {/* Node scanning points */}
                      <circle cx="45" cy="40" r="1.5" fill="var(--success)" />
                      <circle cx="55" cy="40" r="1.5" fill="var(--success)" />
                      <circle cx="50" cy="50" r="1.5" fill="var(--success)" />
                      <circle cx="42" cy="48" r="1.5" fill="var(--success)" />
                      <circle cx="58" cy="48" r="1.5" fill="var(--success)" />
                      <circle cx="50" cy="58" r="1.5" fill="var(--success)" />
                    </svg>
                    <div className="mock-biometric-label">
                      <span className="token-text">ID: {selectedProof}</span>
                      <span className="badge-verified">SYSTEM VERIFIED</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <img 
                      src={selectedProof || ''} 
                      alt="Biometric Proof" 
                      id="real-proof-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.fallback-vector-overlay');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }
                      }} 
                    />
                    <div className="fallback-vector-overlay" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '320px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                      <svg viewBox="0 0 100 100" style={{ width: '80px', height: '80px' }}>
                        <path d="M50,25 C40,25 35,32 35,45 C35,55 42,65 50,65 C58,65 65,55 65,45 C65,32 60,25 50,25 Z" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" />
                        <path d="M30,80 C30,70 38,68 50,68 C62,68 70,70 70,80" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" />
                        <line x1="20" y1="50" x2="80" y2="50" stroke="var(--error)" strokeWidth="1.5" />
                      </svg>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '12px', letterSpacing: '0.05em' }}>BIOMETRIC SNAPSHOT OFFLINE</span>
                    </div>
                  </>
                )}
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
              <div className="modal-icon-header warning" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--error)' }}>
                <Trash2 size={64} />
              </div>
              <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>Confirm Data Purge</h3>
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                Are you sure you want to permanently delete this attendance record? This action will also remove all associated break data and cannot be undone.
              </p>
              <div className="modal-actions-premium" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-block btn-lg" style={{ backgroundColor: 'var(--error)' }} onClick={confirmPurge}>
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
      <AnimatePresence>
        {showCorrectionModal && (
          <div className="proof-modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card scanner-modal-obsidian correction-modal"
              style={{ maxWidth: '450px' }}
            >
              <div className="modal-header-premium">
                <h3>Request Attendance Correction</h3>
                <button className="close-btn-premium" onClick={() => setShowCorrectionModal(false)}><X size={20} /></button>
              </div>

              <form onSubmit={handleCorrectionSubmit} className="manual-log-form" style={{ padding: '20px' }}>
                <div className="form-group-premium">
                  <label>Target Date</label>
                  <input 
                    type="date" 
                    className="premium-input" 
                    value={correctionData.date}
                    onChange={e => setCorrectionData({...correctionData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group-premium">
                  <label>Adjustment Details</label>
                  <textarea 
                    className="premium-input" 
                    placeholder="Describe the correction (e.g., 'Forgot to clock out at 17:00')"
                    value={correctionData.message}
                    onChange={e => setCorrectionData({...correctionData, message: e.target.value})}
                    required
                    rows={4}
                    style={{ resize: 'none' }}
                  ></textarea>
                </div>

                <div className="modal-actions-premium" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary btn-block btn-lg">
                    Submit Request
                  </button>
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowCorrectionModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showEditModal && (
          <div className="proof-modal-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card scanner-modal-obsidian"
            >
              <div className="modal-header-premium">
                <div className="m-title">
                  <Pencil size={20} />
                  <div>
                    <h3>Edit Attendance Record</h3>
                    <p>Adjusting logs for {editingLog?.employee?.firstName} {editingLog?.employee?.lastName}</p>
                  </div>
                </div>
                <button className="close-btn-premium" onClick={() => setShowEditModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="modal-body-premium">
                <div className="form-row-premium" style={{ padding: '20px' }}>
                   <div className="form-group-premium">
                     <label>Check-in Time</label>
                     <input 
                       type="time" 
                       className="premium-input" 
                       value={editForm.clockIn}
                       onChange={(e) => setEditForm({...editForm, clockIn: e.target.value})}
                       required
                     />
                   </div>
                   <div className="form-group-premium">
                     <label>Check-out Time</label>
                     <input 
                       type="time" 
                       className="premium-input" 
                       value={editForm.clockOut}
                       onChange={(e) => setEditForm({...editForm, clockOut: e.target.value})}
                     />
                     <p className="field-hint">Leave blank if still on-site</p>
                   </div>
                </div>

                <div className="modal-actions-premium" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 20px 20px' }}>
                  <button type="submit" className="btn btn-primary btn-block btn-lg">
                    Save Changes
                  </button>
                  <button type="button" className="btn btn-ghost btn-block" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  const filteredAllLogs = allLogs.filter(log => {
    const dateObj = new Date(log.date);
    const logDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
    
    const matchesDate = activeView === 'grid' 
      ? logDateStr.startsWith(selectedMonth)
      : logDateStr === selectedDate;
    
    if (!matchesDate) return false;

    if (selectedSite !== 'all' && log.siteId !== selectedSite) {
      return false;
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const empName = `${log.employee?.firstName} ${log.employee?.lastName}`.toLowerCase();
      const empId = log.employeeId?.toString().toLowerCase() || '';
      if (!empName.includes(s) && !empId.includes(s)) {
        return false;
      }
    }

    return true;
  });

  const statsData = (() => {
    const calcHours = (logs: any[]) => logs.reduce((acc, log) => {
      if (log.duration) return acc + (log.duration / 60);
      if (log.clockIn && log.clockOut) {
        return acc + (new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime()) / (1000 * 60 * 60);
      }
      return acc;
    }, 0);

    const approvedHours = calcHours(filteredAllLogs.filter(l => l.status === 'APPROVED' || l.status === 'PRESENT' || l.status === 'PAID'));
    const rejectedHours = calcHours(filteredAllLogs.filter(l => l.status === 'REJECTED'));
    const pendingHours = calcHours(filteredAllLogs.filter(l => l.status === 'PENDING'));
    const totalHours = approvedHours + rejectedHours + pendingHours;
    const efficiency = totalHours > 0 ? (approvedHours / totalHours) * 100 : 0;

    const todayLog = logs.length > 0 ? logs[0] : null;
    let todayHours = "00:00:00";
    if (todayLog && todayLog.clockIn) {
      const start = new Date(todayLog.clockIn).getTime();
      const end = todayLog.clockOut ? new Date(todayLog.clockOut).getTime() : Date.now();
      const diff = Math.max(0, end - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      todayHours = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    const weeklyLogs = allLogs.filter(l => {
      if (l.employeeId !== user?.id && l.employee?.id !== user?.id) return false;
      const logDate = new Date(l.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    });
    const weeklyHours = calcHours(weeklyLogs);

    return { approvedHours, rejectedHours, pendingHours, totalHours, efficiency, todayHours, weeklyHours };
  })();

  if (!isManagement) {
    return <EmployeeAttendance />;
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
      <div className={`attendance-layout ${isManagement ? 'no-sidebar' : ''}`}>
        {!isManagement && (
          <aside className="profile-sidebar glass-card">
            <div className="profile-card-mini">
              <div className="avatar-wrapper">
                <img 
                  src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`) : "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"} 
                  alt="Profile" 
                  className="large-avatar" 
                />
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
                onClick={() => {
                  if (isClockedIn) {
                    handleClockOut();
                  } else {
                    if (isManagement) {
                      handleDirectClockIn();
                    } else {
                      setIsEnrolling(false);
                      setIsClockingOut(false);
                      setShowScanner(true);
                    }
                  }
                }}
                style={isClockedIn ? { backgroundColor: 'var(--error)', color: 'white', border: 'none' } : {}}
              >
                {isClockedIn ? <X size={16} /> : <Clock size={16} />}
                {isClockedIn ? t('clockOut') : t('clockIn')}
              </button>
            </div>

            <div className="hours-summary">
              <div className="total-hours-main">
                <Clock size={18} />
                <div className="v-stack">
                  <span className="value">{statsData.totalHours.toFixed(2)}</span>
                  <span className="label">Total hours</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="attendance-main">
          <header className="main-header-row">
            <div className="title-section">
              <button className="btn-back"><ChevronLeft size={20} /></button>
              <h1>{t('workforceAttendance')}</h1>
            </div>
            
            <div className="filter-controls">
              <div className="search-hub-premium">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search personnel..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="matrix-search-input"
                />
              </div>

              <div className="filter-hub-premium">
                <Filter size={18} />
                <select 
                  value={selectedSite} 
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="site-select-premium"
                >
                  <option value="all">All Sites ({sites?.length || 0})</option>
                  {Array.isArray(sites) && sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>

              {activeView === 'grid' ? (
                <div 
                  className="date-picker-button" 
                  title="Filter by Month/Year"
                  onClick={() => setShowCalendar(true)}
                >
                  <Calendar size={16} />
                  <span>
                    {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              ) : (
                <div 
                  className="date-picker-button daily-filter"
                  onClick={() => setShowDayPicker(true)}
                >
                  <Calendar size={16} />
                  <span>{new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          </header>

          <section className="breakdown-banner glass-card">
            <div className="breakdown-info">
              <div className="b-text">
                <span className="label">Global Efficiency</span>
                <h2 className="value">{statsData.efficiency.toFixed(1)}%</h2>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${statsData.efficiency}%` }}></div>
              </div>
            </div>
            <div className="breakdown-stats">
              <div className="s-item">
                <span className="dot approved"></span> 
                {t('approved')}: {Math.round(statsData.approvedHours)} hrs
              </div>
              <div className="s-item">
                <span className="dot rejected"></span> 
                {t('rejected')}: {Math.round(statsData.rejectedHours)} hrs
              </div>
              <div className="s-item">
                <span className="dot pending"></span> 
                {t('pending')}: {Math.round(statsData.pendingHours)} hrs
              </div>
            </div>
          </section>


          <div className="action-bar">
            <div className="toggle-group">
              <button 
                className={`toggle-btn ${activeView === 'timecard' ? 'active' : ''}`}
                onClick={() => setActiveView('timecard')}
              >
                <FileText size={14} /> {t('timecard')}
              </button>
              <button 
                className={`toggle-btn ${activeView === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveView('timeline')}
              >
                <Clock size={14} /> {t('timeline')}
              </button>
            </div>
            <div className="btn-row">
              <button className="btn-outline" onClick={() => navigate('/attendance/grid')}>
                <LayoutGrid size={16} /> Monthly Grid
              </button>
              <button className="btn-outline" onClick={handleExport}>{t('exportReport')}</button>
              <button className="btn btn-primary" onClick={() => navigate('/attendance/manager')}>
                <UserPlus size={16} /> Log Manual Entry
              </button>
            </div>
          </div>

          {activeView === 'timecard' ? (
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
                  {filteredAllLogs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td data-label={t('employee')} className="emp-cell">
                        <span>{log.employee?.firstName || 'Unknown'} {log.employee?.lastName || ''}</span>
                      </td>
                      <td data-label={t('date')}>{new Date(log.date).toLocaleDateString()}</td>
                      <td data-label={t('checkin')}>{log.clockIn ? new Date(log.clockIn).toLocaleTimeString() : '---'}</td>
                      <td data-label={t('checkout')}>{log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '---'}</td>
                      <td data-label={t('verification')}>
                        <div className="proof-stack-mini">
                          {log.biometricProof && (
                            <button className="btn-proof-tiny in" title="View Check-in Identity Proof" onClick={() => setSelectedProof(log.biometricProof.startsWith('http') ? log.biometricProof : `${API_URL}${log.biometricProof}`)}>
                              <Camera size={12} /> PROOF
                            </button>
                          )}
                          {log.biometricProofOut && (
                            <button className="btn-proof-tiny out" title="View Check-out Identity Proof" onClick={() => setSelectedProof(log.biometricProofOut.startsWith('http') ? log.biometricProofOut : `${API_URL}${log.biometricProofOut}`)}>
                              <Camera size={12} /> PROOF
                            </button>
                          )}
                        </div>
                      </td>
                      <td data-label={t('status')}>
                        <span className={`badge badge-${(log.status === 'PAID' ? 'APPROVED' : log.status || 'PENDING').toLowerCase()}`}>
                          {t((log.status === 'PAID' ? 'APPROVED' : log.status || 'PENDING').toLowerCase())}
                        </span>
                      </td>
                      <td data-label={t('action')}>
                        <div className="approval-actions">
                          <button 
                            className="status-btn edit" 
                            onClick={() => {
                              setEditingLog(log);
                              setEditForm({
                                clockIn: log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : '',
                                clockOut: log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''
                              });
                              setShowEditModal(true);
                            }}
                            title="Edit Times"
                          >
                            <Pencil size={14} />
                          </button>
                          <button className="status-btn approve" onClick={() => handleStatusUpdate(log.id, 'PRESENT')} title="Mark Present" style={{ color: '#10b981' }}>
                            <CheckCircle size={14} />
                          </button>
                          <button className="status-btn reject" onClick={() => handleStatusUpdate(log.id, 'ABSENT')} title="Mark Absent" style={{ color: '#ef4444' }}>
                            <XCircle size={14} />
                          </button>
                          {log.status === 'PENDING' && (
                            <>
                              <button className="status-btn approve" onClick={() => handleStatusUpdate(log.id, 'APPROVED')} title="Approve"><Check size={14} /></button>
                              <button className="status-btn reject" onClick={() => handleStatusUpdate(log.id, 'REJECTED')} title="Reject"><X size={14} /></button>
                            </>
                          )}
                          <button className="status-btn delete" onClick={() => handleDeleteLog(log.id)} title="Purge Log" style={{ color: 'var(--error)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeView === 'timeline' ? (
            <div className="timeline-container glass-card">
              <div className="timeline-grid">
                <div className="timeline-header">
                  <div className="employee-col">Employee</div>
                  <div className="time-axis">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="time-label">{(i * 2).toString().padStart(2, '0')}:00</div>
                    ))}
                  </div>
                </div>
                
                <div className="timeline-body">
                  {Array.from(new Set(filteredAllLogs.map(l => l.employeeId))).map(empId => {
                    const empLogs = filteredAllLogs.filter(l => l.employeeId === empId);
                    const emp = empLogs[0]?.employee;
                    
                    return (
                      <div key={empId} className="timeline-row">
                        <div className="employee-col">
                          <div className="tiny-avatar"><User size={12} /></div>
                          <span className="emp-name">{emp?.firstName}</span>
                        </div>
                        <div className="shift-track">
                          {empLogs.map(log => {
                            if (!log.clockIn) return null;
                            const start = new Date(log.clockIn);
                            const end = log.clockOut ? new Date(log.clockOut) : new Date();
                            
                            const startPct = ((start.getHours() * 60 + start.getMinutes()) / 1440) * 100;
                            const durationPct = (((end.getTime() - start.getTime()) / 60000) / 1440) * 100;
                            
                            return (
                              <div 
                                key={log.id} 
                                className={`shift-bar ${log.status?.toLowerCase()}`}
                                style={{ left: `${startPct}%`, width: `${durationPct}%` }}
                                title={`${emp?.firstName}: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`}
                              >
                                {durationPct > 5 && <span className="bar-label">{Math.round((end.getTime() - start.getTime()) / 3600000)}h</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
      {renderModals()}
      
      <AnimatePresence>
        {showCalendar && (
          <div className="proof-modal-overlay month-picker-overlay" onClick={() => setShowCalendar(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card custom-month-picker"
              onClick={e => e.stopPropagation()}
            >
              <div className="picker-header">
                <button className="year-btn" onClick={() => {
                  const currentYear = parseInt(selectedMonth.split('-')[0]);
                  setSelectedMonth(`${currentYear - 1}-${selectedMonth.split('-')[1]}`);
                }}><ChevronLeft size={18} /></button>
                <span className="year-display">{selectedMonth.split('-')[0]}</span>
                <button className="year-btn" onClick={() => {
                  const currentYear = parseInt(selectedMonth.split('-')[0]);
                  setSelectedMonth(`${currentYear + 1}-${selectedMonth.split('-')[1]}`);
                }}><ChevronRight size={18} /></button>
              </div>
              
              <div className="months-grid">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
                  const monthNum = (i + 1).toString().padStart(2, '0');
                  const isSelected = selectedMonth.split('-')[1] === monthNum;
                  return (
                    <button 
                      key={m}
                      className={`month-cell ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMonth(`${selectedMonth.split('-')[0]}-${monthNum}`);
                        setShowCalendar(false);
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              
              <div className="picker-footer">
                <button className="btn-ghost btn-sm" onClick={() => {
                  setSelectedMonth(new Date().toISOString().slice(0, 7));
                  setShowCalendar(false);
                }}>Current Month</button>
                <button className="btn-primary btn-sm" onClick={() => setShowCalendar(false)}>Done</button>
              </div>
            </motion.div>
          </div>
        )}

        {showDayPicker && (
          <div className="proof-modal-overlay month-picker-overlay" onClick={() => setShowDayPicker(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card custom-day-picker"
              onClick={e => e.stopPropagation()}
            >
              <div className="picker-header">
                <button className="year-btn" onClick={() => {
                  const d = new Date(selectedDate);
                  d.setMonth(d.getMonth() - 1);
                  const y = d.getFullYear();
                  const m = (d.getMonth() + 1).toString().padStart(2, '0');
                  const day = d.getDate().toString().padStart(2, '0');
                  setSelectedDate(`${y}-${m}-${day}`);
                }}><ChevronLeft size={18} /></button>
                <span className="year-display">
                  {new Date(selectedDate).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button className="year-btn" onClick={() => {
                  const d = new Date(selectedDate);
                  d.setMonth(d.getMonth() + 1);
                  const y = d.getFullYear();
                  const m = (d.getMonth() + 1).toString().padStart(2, '0');
                  const day = d.getDate().toString().padStart(2, '0');
                  setSelectedDate(`${y}-${m}-${day}`);
                }}><ChevronRight size={18} /></button>
              </div>

              <div className="weekday-labels">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="weekday">{d}</div>
                ))}
              </div>
              
              <div className="days-grid">
                {(() => {
                  const d = new Date(selectedDate);
                  const year = d.getFullYear();
                  const month = d.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const prevMonthDays = new Date(year, month, 0).getDate();
                  
                  const cells = [];
                  for (let i = firstDay - 1; i >= 0; i--) {
                    cells.push(<div key={`prev-${i}`} className="day-cell muted">{prevMonthDays - i}</div>);
                  }
                  for (let i = 1; i <= daysInMonth; i++) {
                    const isSelected = new Date(selectedDate).getDate() === i && new Date(selectedDate).getMonth() === month;
                    cells.push(
                      <button 
                        key={i} 
                        className={`day-cell ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          const y = year;
                          const m = (month + 1).toString().padStart(2, '0');
                          const d = i.toString().padStart(2, '0');
                          setSelectedDate(`${y}-${m}-${d}`);
                          setShowDayPicker(false);
                        }}
                      >
                        {i}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
              
              <div className="picker-footer">
                <button className="btn-ghost btn-sm" onClick={() => {
                  const d = new Date();
                  const y = d.getFullYear();
                  const m = (d.getMonth() + 1).toString().padStart(2, '0');
                  const day = d.getDate().toString().padStart(2, '0');
                  setSelectedDate(`${y}-${m}-${day}`);
                  setShowDayPicker(false);
                }}>Today</button>
                <button className="btn-primary btn-sm" onClick={() => setShowDayPicker(false)}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Attendance;
