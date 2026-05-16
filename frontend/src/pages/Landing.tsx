import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  MapPin, 
  ArrowRight, 
  Languages, 
  Globe, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Sun,
  Moon,
  Activity,
  Layers,
  Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext'; 
import './Landing.css';

const fadeInUp: any = {
  initial: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer: any = {
  initial: {},
  visible: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

const Landing = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef as any,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLng);
  };

  return (
    <div className={`landing-page ${theme}`}>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      <nav className="landing-nav">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="logo-text"
        >
          TRACK<span>FORCE</span>
        </motion.div>
        <div className="nav-links">
          <button className="nav-tool-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="nav-tool-btn" onClick={toggleLanguage}>
            <Languages size={18} />
            <span className="lang-text">{i18n.language === 'en' ? 'VN' : 'EN'}</span>
          </button>
          <Link to="/login" className="nav-link-item">Login</Link>
          <Link to="/login" className="btn-get-started">
            {t('startTrial')} <ArrowRight size={18} />
          </Link>
        </div>
      </nav>

      {/* Hero Section - Kept same structure as requested */}
      <header ref={heroRef} className="hero-section">
        <motion.div style={{ y, opacity }} className="hero-container">
          <div className="hero-text-content">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {(t('intelligenceTitle') as string).split(' ').slice(0, 2).join(' ')} <span>{(t('intelligenceTitle') as string).split(' ').slice(2).join(' ')}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {t('heroDescription')}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="hero-actions"
            >
              <Link to="/login" className="btn-hero-primary">
                {t('deployNow')} <ArrowRight size={22} />
              </Link>
              <button className="btn-hero-secondary">
                {t('viewDemo')}
              </button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="hero-social-proof"
            >
              <div className="proof-avatars">
                {[1,2,3,4,5].map(i => (
                  <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i*2}`} alt="" className="avatar-img" />
                ))}
              </div>
              <span>{t('trustedByEnterprise')}</span>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: -10 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="hero-visual"
          >
            <div className="visual-wrapper">
              <img src="/assets/hero_new.png" alt="Workforce Intelligence" className="main-mockup" />
            </div>
          </motion.div>
        </motion.div>
      </header>

      {/* NEW CREATIVE SECTIONS */}

      <section className="stats-strip">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="visible"
          viewport={{ once: true }}
          className="stats-container"
        >
          {[
            { label: t('activeNodes'), val: "5,280", icon: <Activity size={16} /> },
            { label: t('dailyTransactions'), val: "1.4M", icon: <Database size={16} /> },
            { label: t('uptimeSLA'), val: "99.99%", icon: <ShieldCheck size={16} /> },
            { label: t('sitesMonitored'), val: "312", icon: <Layers size={16} /> }
          ].map((s, i) => (
            <motion.div key={i} variants={fadeInUp} className="stat-node">
              <span className="node-val">{s.val}</span>
              <span className="node-label">
                <div className="status-pulse"></div>
                {s.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="features-grid-section">
        <div className="section-header">
          <motion.span variants={fadeInUp} className="sub-title">{t('coreIntelligence')}</motion.span>
          <motion.h2 variants={fadeInUp}>{t('obsidianArchitecture')}</motion.h2>
        </div>

        <div className="mosaic-grid">
          {/* Card 1: Biometrics */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-biometric"
          >
            <div className="card-top">
              <div className="card-icon-box"><Cpu size={32} /></div>
              <h3>{t('biometricIdentityMatrix')}</h3>
              <p>{t('biometricMatrixDesc')}</p>
            </div>
            <div className="visual-identity-scanner">
              <div className="scanner-line"></div>
              <img src="/assets/security.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </motion.div>

          {/* Card 2: Geofence */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-geofence"
          >
            <div className="card-top">
              <div className="card-icon-box"><MapPin size={32} /></div>
              <h3>{t('geofenceShield')}</h3>
              <p>{t('geofenceShieldDesc')}</p>
            </div>
            <div className="visual-geofence-map">
              {[1,2,3].map(i => (
                <div key={i} className="map-ring" style={{ animationDelay: `${i}s` }}></div>
              ))}
              <div className="map-point" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                 <MapPin size={24} color="#3B82F6" />
              </div>
            </div>
          </motion.div>

          {/* Card 3: Telemetry */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-telemetry"
          >
             <div className="card-top">
              <div className="card-icon-box"><Activity size={32} /></div>
              <h3>{t('realtimeTelemetry')}</h3>
              <p>{t('telemetryDesc')}</p>
            </div>
            <div className="visual-telemetry-grid">
               {[40, 70, 45, 90, 60].map((h, i) => (
                 <motion.div 
                   key={i}
                   initial={{ height: 0 }}
                   whileInView={{ height: `${h}%` }}
                   transition={{ duration: 1, delay: i * 0.1 }}
                   className="telemetry-bar"
                 />
               ))}
            </div>
          </motion.div>

          {/* Card 4: Payroll */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mosaic-card c-payroll"
          >
            <div className="card-top">
              <div className="card-icon-box"><Zap size={32} /></div>
              <h3>{t('payrollGrid')}</h3>
              <p>{t('payrollGridDesc')}</p>
            </div>
            <div className="visual-payroll-list">
               {[
                 { id: 'TF-901', status: 'PROCESSED' },
                 { id: 'TF-902', status: 'PROCESSED' },
                 { id: 'TF-903', status: 'PENDING' },
                 { id: 'TF-904', status: 'PROCESSED' },
                 { id: 'TF-905', status: 'FLAGGED' },
                 { id: 'TF-906', status: 'PROCESSED' }
               ].map((p, i) => (
                 <div key={i} className="payroll-row">
                   <span>{p.id}</span>
                   <strong style={{ 
                     color: p.status === 'PENDING' ? '#F59E0B' : 
                            p.status === 'FLAGGED' ? '#EF4444' : '#10B981' 
                   }}>{p.status}</strong>
                 </div>
               ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="cta-section">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="cta-control-center"
        >
          <div className="cta-glow-orb"></div>
          <div className="cta-text-side">
            <h2>{t('readyOptimize')}</h2>
            <p>{t('joinElite')}</p>
            <Link to="/login" className="btn-cta-launch">
              {t('launchProject')} <ArrowRight size={24} />
            </Link>
          </div>
          <div className="cta-visual-side">
            <Globe size={300} strokeWidth={0.5} style={{ opacity: 0.2 }} />
          </div>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo-text">TRACK<span>FORCE</span></div>
            <p>{(t('heroDescription') as string).split('.')[0]}.</p>
          </div>
          <div className="footer-grid">
            <div className="footer-col">
              <h4>{t('platform')}</h4>
              <Link to="/login">{t('intelligenceHub')}</Link>
              <Link to="/login">{t('biometricMatrix')}</Link>
              <Link to="/login">{t('geofencePerimeter')}</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <Link to="#">Documentation</Link>
              <Link to="#">Security Whitepaper</Link>
              <Link to="#">API Reference</Link>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <Link to="#">About</Link>
              <Link to="#">Careers</Link>
              <Link to="#">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 TrackForce Enterprise. All Rights Reserved.</p>
          <div className="legal-links">
            <Link to="#">Terms of Service</Link>
            <Link to="#">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
