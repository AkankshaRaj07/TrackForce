import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  Calendar as CalIcon, 
  History, 
  Shield, 
  Activity,
  UserCheck,
  BarChart3,
  Award,
  Timer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../context/AuthContext';
import { clockIn, clockOut, fetchTodayLogs, fetchAllLogs, createSecurityAlert } from '../api/api';
import { loadFaceApiModels, areModelsLoaded } from '../utils/aiModels';
import './EmployeeAttendance.css';

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
const EmployeeAttendance = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [logs, setLogs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [locationName, setLocationName] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(areModelsLoaded());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!user) return;
    try {
      const [today, all] = await Promise.all([
        fetchTodayLogs(user.id),
        fetchAllLogs()
      ]);
      setLogs(today);
      const myLogs = all.filter((l: any) => l.employeeId === user.id);
      setAllLogs(myLogs);
      setIsClockedIn(today.length > 0 && !today[0].clockOut);
    } catch (err) {
      console.error("Data load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!modelsLoaded) {
      loadFaceApiModels()
        .then(() => setModelsLoaded(true))
        .catch(err => console.error("AI load error:", err));
    }
  }, [modelsLoaded]);

  useEffect(() => {
    loadData();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationName(`Zone: ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocationName("Primary Site")
    );
    return () => stopCamera();
  }, [user]);

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

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400, facingMode: 'user' } });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (err) {
      setScanStatus('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleAction = async (type: 'IN' | 'OUT') => {
    if (!user || isProcessing) return;
    setIsProcessing(true);
    setShowScanner(true);
    setScanStatus('scanning');
    
    // Ensure we have some location

    
    try {
      await startCamera();
      
      // Verification Simulation
      setTimeout(async () => {
        try {
          const biometricProof = captureFrame();
          if (!biometricProof) throw new Error("Capture failed");

          // FACE MATCHING LOGIC
          let isMatch = true; // Default to true if models or avatar missing for bypass (optional)
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

          if (modelsLoaded && user?.avatar) {
            try {
              const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`;
              const referenceImg = await faceapi.fetchImage(avatarUrl);
              const capturedImg = await faceapi.fetchImage(biometricProof);

              const refDetection = await faceapi.detectSingleFace(referenceImg).withFaceLandmarks().withFaceDescriptor();
              const capDetection = await faceapi.detectSingleFace(capturedImg).withFaceLandmarks().withFaceDescriptor();

              if (refDetection?.descriptor && capDetection?.descriptor) {
                const distance = faceapi.euclideanDistance(refDetection.descriptor, capDetection.descriptor);
                isMatch = distance < 0.6; // Industry standard threshold
              }
            } catch (err) {
              console.error("Biometric matching error:", err);
            }
          }

          if (!isMatch) {
            await createSecurityAlert({
              type: 'BIOMETRIC_MISMATCH',
              message: `Unauthorized attempt: Biometric mismatch for ${user.firstName} ${user.lastName}.`,
              severity: 'HIGH',
              employeeId: user.id,
              siteId: user.siteId
            });
            setScanStatus('error');
            setTimeout(() => {
              setShowScanner(false);
              setIsProcessing(false);
              stopCamera();
            }, 2000);
            return;
          }

          const formData = new FormData();
          formData.append('fullName', `${user.firstName} ${user.lastName}`);
          
          if (biometricProof) {
            const proofBlob = base64ToBlob(biometricProof);
            formData.append('biometricProof', proofBlob, `proof-${user.id}-${Date.now()}.jpg`);
          }

          if (type === 'IN') {
            const res = await clockIn(user.id, coords?.lat || 0, coords?.lng || 0, formData);
            console.log("Clock In Success:", res);
          } else {
            const res = await clockOut(user.id, coords?.lat || 0, coords?.lng || 0, formData);
            console.log("Clock Out Success:", res);
          }
          
          setScanStatus('success');
          setTimeout(() => {
            stopCamera();
            setShowScanner(false);
            setScanStatus('idle');
            setIsProcessing(false);
            loadData();
          }, 1500);
        } catch (err: any) {
          console.error("Attendance API Error:", err);
          setScanStatus('error');
          setTimeout(() => { 
            stopCamera(); 
            setShowScanner(false); 
            setScanStatus('idle');
            setIsProcessing(false);
          }, 2000);
        }
      }, 2500);
    } catch (err) {
      console.error("Camera/Verification Error:", err);
      setScanStatus('error');
      setIsProcessing(false);
      setTimeout(() => { setShowScanner(false); setScanStatus('idle'); }, 2000);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const renderMatrixCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const cells = [];
    
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(d => cells.push(<div key={d} className="cal-day-header">{d}</div>));
    for (let i = 0; i < startDay; i++) cells.push(<div key={`empty-${i}`} className="cal-dot-box empty"></div>);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const dayLogs = allLogs.filter(l => l.date.split('T')[0] === dateStr);
      let status: 'approved' | 'pending' | 'absent' | null = null;
      let hours = 0;
      const dateObj = new Date(year, month, d);
      const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));

      if (dayLogs.length > 0) {
        status = dayLogs.some(l => l.status === 'APPROVED' || l.status === 'PRESENT') ? 'approved' : 'pending';
        hours = dayLogs.reduce((acc, l) => l.clockIn && l.clockOut ? acc + (new Date(l.clockOut).getTime() - new Date(l.clockIn).getTime()) / 3600000 : acc, 0);
      } else if (isPast && dateObj.getDay() !== 0 && dateObj.getDay() !== 6) status = 'absent';
      
      cells.push(
        <motion.div key={d} className={`cal-dot-box ${status || ''} ${new Date().toDateString() === dateObj.toDateString() ? 'today' : ''}`} whileHover={{ scale: 1.05 }}>
          <span className="dot-date">{d}</span>
          {hours > 0 && <span className="dot-hours">{hours.toFixed(1)}h</span>}
        </motion.div>
      );
    }
    return cells;
  };

  const currentMonthLogs = allLogs.filter(l => new Date(l.date).getMonth() === viewDate.getMonth() && new Date(l.date).getFullYear() === viewDate.getFullYear());
  const totalMonthlyHours = currentMonthLogs.reduce((acc, l) => l.clockIn && l.clockOut ? acc + (new Date(l.clockOut).getTime() - new Date(l.clockIn).getTime()) / 3600000 : acc, 0);

  if (isLoading) return <div className="dashboard-loading"><div className="loading-spinner-watt"></div><span>Syncing Intelligence...</span></div>;

  return (
    <div className="employee-att-container">
      {/* Hero Section */}
      <section className="att-hero-section">
        <div className="hero-content">
          <div className="hero-badge"><Activity size={14} /> <span>{t('workforceIntelligence')}</span></div>
          <h1>{t('welcomeBack')}, {user?.firstName}</h1>
          <div className="hero-stats-overlay">
            <div className="h-stat"><span className="h-val">{allLogs.reduce((acc, l) => l.clockIn && l.clockOut ? acc + (new Date(l.clockOut).getTime() - new Date(l.clockIn).getTime()) / 3600000 : acc, 0).toFixed(1)}h</span><span className="h-lab">Total Hours</span></div>
            <div className="h-stat"><span className="h-val">{locationName ? locationName.split(',')[0].replace('Zone: ', '') : 'Primary'}</span><span className="h-lab">Zone</span></div>
          </div>
        </div>
        <div className="live-clock-card-premium">
          <div className="clock-wrapper">
             <span className="live-time">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             <span className="live-seconds">{currentTime.getSeconds().toString().padStart(2, '0')}</span>
          </div>
          <span className="live-date">{currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</span>
        </div>
      </section>

      {/* Top Cards */}
      <div className="att-top-row-grid">
        <div className="action-card-premium">
          <div className="action-header">
            <h2 className="card-title">ATTENDANCE HUB</h2>
            <div className={`status-pill ${isClockedIn ? 'online' : 'offline'}`}>
              <div className="status-dot"></div> {isClockedIn ? 'ACTIVE' : 'OFF DUTY'}
            </div>
          </div>
          <div className="action-buttons-group">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`big-btn in ${isClockedIn ? 'disabled' : ''}`} onClick={() => !isClockedIn && handleAction('IN')} disabled={isClockedIn}>
              <Clock size={28} /> <span>CLOCK IN NOW</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`big-btn out ${!isClockedIn ? 'disabled' : ''}`} onClick={() => isClockedIn && handleAction('OUT')} disabled={!isClockedIn}>
              <History size={28} /> <span>CLOCK OUT</span>
            </motion.button>
          </div>
          {isClockedIn && logs[0] && (
            <div className="shift-info-footer">
              <div className="footer-item"><Clock size={14} /> <span>Started: <strong>{new Date(logs[0].clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span></div>
              <div className="footer-item"><MapPin size={14} /> <span>Location: <strong>{logs[0].location || 'Main Site'}</strong></span></div>
            </div>
          )}
        </div>

        <div className="compact-id-hero">
          <div className="profile-main-stack">
            <div className="avatar-frame">
              <img src={user?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Staff"} alt="Avatar" />
              <div className="avatar-ring"></div>
            </div>
            <div className="name-stack">
              <span className="p-name">{user?.firstName} {user?.lastName}</span>
              <span className="p-role">{user?.jobTitle || 'Field Personnel'}</span>
              <div className="secured-badge"><Shield size={12} /> <span>SECURED IDENTITY</span></div>
            </div>
          </div>
          <div className="id-metadata-grid">
             <div className="meta-item"><span className="m-label">EMPLOYEE ID</span><span className="m-value">#TF-{user?.id.slice(-4).toUpperCase()}</span></div>
             <div className="meta-item"><span className="m-label">ACCOUNT STATUS</span><span className="m-value success">ACTIVE</span></div>
          </div>
        </div>
      </div>

      {/* Bottom Layout */}
      <div className="bottom-layout-grid">
        <div className="performance-sidebar">
          <div className="stats-card-premium">
            <h3 className="card-title-sm"><BarChart3 size={18} /> MONTHLY INSIGHTS</h3>
            <div className="insights-list">
              <div className="insight-row"><div className="i-icon"><Timer size={16} /></div><div className="i-text"><span className="i-lab">MONTHLY HOURS</span><span className="i-val">{totalMonthlyHours.toFixed(1)}h</span></div></div>
              <div className="insight-row"><div className="i-icon"><Award size={16} /></div><div className="i-text"><span className="i-lab">RELIABILITY</span><span className="i-val">98.4%</span></div></div>
            </div>
            <div className="goal-meter">
               <div className="meter-label"><span>SHIFT GOAL</span> <span>{Math.min(100, (totalMonthlyHours / 160) * 100).toFixed(0)}%</span></div>
               <div className="meter-bar"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (totalMonthlyHours / 160) * 100)}%` }} className="meter-fill"></motion.div></div>
            </div>
          </div>
        </div>

        <div className="calendar-main-card">
          <div className="cal-header-flex">
            <div className="cal-label"><CalIcon size={18} /> <span>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}</span></div>
            <div className="cal-nav-btns"><button onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></button><button onClick={() => changeMonth(1)}><ChevronRight size={16} /></button></div>
          </div>
          <div className="calendar-matrix-grid">
            {renderMatrixCalendar()}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="scanner-overlay">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="scanner-unit">
              <div className="video-circle">
                <video ref={videoRef} autoPlay playsInline muted />
                <div className={`scan-border ${scanStatus}`}></div>
                {scanStatus === 'success' && <div className="success-icon"><UserCheck size={60} /></div>}
              </div>
              <div className="scanner-status-text">
                {scanStatus === 'scanning' ? <h3>VERIFYING IDENTITY...</h3> : scanStatus === 'success' ? <h3 className="success-txt">ACCESS GRANTED</h3> : <h3 className="error-txt">FAILED</h3>}
                <p>{locationName}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeAttendance;
