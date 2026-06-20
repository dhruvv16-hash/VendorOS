'use client';
import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Smartphone, Eye, Sparkles, Moon, Sun, RefreshCw, QrCode, Zap } from 'lucide-react';
import { useVendor } from '@/context/useVendorStore';

interface DevicePreviewerProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openQRModal: () => void;
}

export const DevicePreviewer: React.FC<DevicePreviewerProps> = ({
  children,
  activeTab,
  setActiveTab,
  openQRModal
}) => {
  const { currentStore, clearDatabase, isOffline, isDarkMode, toggleTheme } = useVendor();
  const [deviceWidth, setDeviceWidth] = useState<number>(390);
  const [currentTime, setCurrentTime] = useState<string>('12:00');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: -y * 10 }); // Max 10 degrees tilt
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const deviceOptions = [
    { width: 360, label: '360', sub: 'Compact' },
    { width: 390, label: '390', sub: 'iPhone 16' },
    { width: 412, label: '412', sub: 'Galaxy S' },
    { width: 430, label: '430', sub: 'Max' },
  ];

  return (
    <div className={`${isMobile ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'} relative flex flex-col md:flex-row overflow-hidden`}
      style={{ background: isDarkMode ? '#060810' : '#eef0f8' }}>

      {/* ── Desktop Aurora Background ── */}
      {!isMobile && (
        <>
          <div className="glow-orb" style={{
            width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(255,107,53,0.18) 0%, transparent 70%)',
            top: '-100px', right: '15%',
            animationDelay: '0s', animationDuration: '14s'
          }} />
          <div className="glow-orb" style={{
            width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            bottom: '10%', right: '30%',
            animationDelay: '-5s', animationDuration: '18s'
          }} />
          <div className="glow-orb" style={{
            width: 250, height: 250,
            background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
            top: '40%', right: '5%',
            animationDelay: '-8s', animationDuration: '20s'
          }} />
        </>
      )}

      {/* ═══════════════════════════════════════════════
          DESKTOP CONTROLLER SIDEBAR
      ═══════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-col w-80 shrink-0 select-none relative z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(10,12,20,0.95) 0%, rgba(8,10,18,0.98) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(240,242,248,0.95) 100%)',
          backdropFilter: 'blur(24px)',
          borderRight: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.8)',
          boxShadow: isDarkMode
            ? '4px 0 40px rgba(0,0,0,0.5)'
            : '4px 0 40px rgba(0,0,0,0.08)',
        }}>

        {/* Sidebar aurora tint */}
        <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />

        <div className="relative flex flex-col h-full p-5 gap-5">

          {/* Brand Mark */}
          <div className="flex items-center gap-3 pt-2">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shimmer-parent"
                style={{
                  background: 'linear-gradient(135deg, #FF6B35, #FF8C5A, #FFB347)',
                  boxShadow: '0 4px 20px rgba(255,107,53,0.45), 0 2px 0 rgba(255,255,255,0.3) inset',
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.5px'
                }}>
                VO
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                style={{ background: 'linear-gradient(135deg, #FF6B35, #FFB347)' }} />
            </div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}>
                Vendor<span className="gradient-text">OS</span>
              </h1>
              <p className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>Food-Tech Operating System</p>
            </div>
          </div>

          {/* Active Store Card */}
          <div className="rounded-2xl p-4 relative overflow-hidden shimmer-parent"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(99,102,241,0.06))'
                : 'linear-gradient(135deg, rgba(255,107,53,0.06), rgba(99,102,241,0.04))',
              border: '1px solid',
              borderColor: isDarkMode ? 'rgba(255,107,53,0.15)' : 'rgba(255,107,53,0.2)',
              boxShadow: 'var(--shadow-3d-sm)'
            }}>
            <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.6), transparent)' }} />
            <span className="text-[9px] uppercase font-black tracking-widest mb-2 block"
              style={{ color: 'var(--primary)' }}>
              ⚡ Active Workspace
            </span>
            <div className="font-black text-base flex items-center gap-2 mt-1"
              style={{ fontFamily: "'Outfit', sans-serif" }}>
              <span className="text-xl animate-float-sm inline-block">{currentStore?.logoUrl || '🍔'}</span>
              <span className="truncate">{currentStore?.name || 'Loading...'}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{currentStore?.businessType || 'Food Vendor'}</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                isOffline ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
              }`}>
                {isOffline ? '● Offline' : '● Live Sync'}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 font-black uppercase tracking-wider">
                Dev Preview
              </span>
            </div>
          </div>

          {/* Device Width Selector */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Simulated Device
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceOptions.map(d => (
                <button
                  key={d.width}
                  onClick={() => setDeviceWidth(d.width)}
                  className="py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 text-left"
                  style={{
                    background: deviceWidth === d.width
                      ? 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,179,71,0.1))'
                      : isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                    border: deviceWidth === d.width
                      ? '1px solid rgba(255,107,53,0.3)'
                      : isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                    color: deviceWidth === d.width ? 'var(--primary)' : 'var(--muted)',
                    boxShadow: deviceWidth === d.width ? '0 2px 8px rgba(255,107,53,0.15)' : 'none'
                  }}>
                  <div className="font-black text-sm">{d.label}px</div>
                  <div className="text-[9px] opacity-70 mt-0.5">{d.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 flex-1">
            <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Dev Controls
            </label>
            <div className="space-y-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all duration-200"
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
                  color: 'var(--foreground)'
                }}>
                <span className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: isDarkMode ? 'rgba(255,179,71,0.15)' : 'rgba(99,102,241,0.12)' }}>
                    {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-500" />}
                  </span>
                  {isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: 'var(--muted)' }}>
                  Theme
                </span>
              </button>

              {/* QR Button */}
              <button
                onClick={openQRModal}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,179,71,0.05))',
                  border: '1px solid rgba(255,107,53,0.2)',
                  color: 'var(--primary)'
                }}>
                <span className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255,107,53,0.15)' }}>
                    <QrCode size={14} />
                  </span>
                  Scan Store QR Menu
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                  Live
                </span>
              </button>

              {/* Wipe Data */}
              <button
                onClick={() => {
                  if (confirm('Reset simulated local database?')) {
                    clearDatabase();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  background: 'rgba(239,68,68,0.04)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  color: 'var(--danger)'
                }}>
                <span className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/10">
                    <RefreshCw size={14} />
                  </span>
                  Wipe Local Data
                </span>
                <span className="text-[9px] text-red-500/50 uppercase font-black">Reset</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t text-[10px] space-y-1"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', color: 'var(--muted)' }}>
            <p className="font-semibold">© 2026 VendorOS SaaS Inc.</p>
            <p className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-primary animate-pulse" />
              <span>Ready for live stores</span>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          DEVICE FRAME + SCREEN
      ═══════════════════════════════════════════════ */}
      <div 
        className={`flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 ${isMobile ? 'p-0 overflow-hidden' : 'p-4 md:p-8 overflow-y-auto'} relative z-10`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative flex flex-col overflow-hidden"
          style={isMobile
            ? { width: '100%', height: '100dvh' }
            : {
              width: '100%',
              maxWidth: `${deviceWidth}px`,
              height: '844px',
              borderRadius: '48px',
              border: isDarkMode ? '12px solid #1c2033' : '12px solid #d4d8e5',
              background: isDarkMode ? '#0a0c15' : '#e0e4f0',
              boxShadow: isDarkMode
                ? `0 0 0 1px rgba(255,255,255,0.06), 0 35px 90px rgba(0,0,0,0.85), 0 0 70px rgba(255,107,53,0.1), inset 0 1px 0 rgba(255,255,255,0.1)`
                : `0 0 0 1px rgba(0,0,0,0.08), 0 30px 80px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.95)`,
              transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0px)`,
              transition: tilt.x === 0 && tilt.y === 0 
                ? 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.5s ease, box-shadow 0.5s ease' 
                : 'transform 0.1s ease-out, border-color 0.5s ease, box-shadow 0.5s ease',
            }}
        >
          {/* Dynamic Island notch */}
          {!isMobile && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-1.5 px-3"
              style={{
                width: 110, height: 28,
                background: '#000',
                borderRadius: 999,
              }}>
              <div className="w-2 h-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]" />
              <div className="w-8 h-1.5 rounded-full bg-[#1a1a1a]" />
            </div>
          )}

          {/* Holographic edge glow strip */}
          {!isMobile && (
            <div className="absolute top-0 left-0 right-0 h-[1px] z-50 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,107,53,0.6), rgba(168,85,247,0.5), rgba(59,130,246,0.5), transparent)',
                backgroundSize: '300% 100%',
                animation: 'aurora-shift 5s ease infinite'
              }} />
          )}

          {/* Status bar */}
          {!isMobile && (
            <div className="hidden md:flex h-12 items-center justify-between px-7 shrink-0 z-40 text-xs pt-1 font-semibold select-none"
              style={{
                background: isDarkMode ? 'rgba(10,12,20,0.65)' : 'rgba(255,255,255,0.65)',
                color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.8)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)'
              }}>

              <span className="font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {currentTime}
              </span>
              <div className="flex items-center gap-2">
                {isOffline && (
                  <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase">
                    OFFLINE
                  </span>
                )}
                <Wifi size={12} className={isOffline ? 'text-red-400' : 'text-green-400'} />
                <Battery size={12} className="text-green-400" />
              </div>
            </div>
          )}

          {/* App viewport */}
          <div className="flex-1 overflow-hidden relative flex flex-col safe-padding-top"
            style={{ background: isDarkMode ? '#0c0e16' : '#f8faff' }}>
            {children}
          </div>
        </div>

        {/* ── Product Guide & FAQ Panel (AEO / SEO Crawl Target) ── */}
        {!isMobile && (
          <div 
            className="w-full lg:max-w-md xl:max-w-lg rounded-[32px] p-6 lg:mt-4 space-y-6 select-text text-left border relative overflow-hidden"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(10,12,20,0.95) 0%, rgba(8,10,18,0.98) 100%)' 
                : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,242,248,0.95) 100%)',
              backdropFilter: 'blur(20px)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              boxShadow: isDarkMode ? '0 20px 50px rgba(0,0,0,0.4)' : '0 20px 50px rgba(0,0,0,0.05)',
              color: isDarkMode ? 'rgba(255,255,255,0.9)' : '#0f172a'
            }}
          >
            {/* Decorative accent orb */}
            <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none"
              style={{ background: 'radial-gradient(circle, #FF6B35, transparent 70%)' }} />

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                  Product Specification
                </span>
                <span className="text-[9px] bg-blue-500/10 text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                  AEO Structured
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight animate-shimmer" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--foreground)' }}>
                VendorOS: Hyper-Local Food Stall POS
              </h1>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                VendorOS is the ultimate mobile-first restaurant operating system and POS digital terminal built for street food vendors, food trucks, chai shops, and micro-restaurants.
              </p>
            </div>

            {/* Core Features */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-primary">
                Core Capabilities & Modules
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <div className="p-3 rounded-2xl border" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', background: isDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <div className="font-bold text-slate-800 dark:text-white">POS Terminal</div>
                  <p className="text-[10px] font-medium opacity-70 mt-1">Superfast checkout with offline database sync.</p>
                </div>
                <div className="p-3 rounded-2xl border" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', background: isDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <div className="font-bold text-slate-800 dark:text-white">QR Ordering</div>
                  <p className="text-[10px] font-medium opacity-70 mt-1">Self-serve ordering directly linked to prep queue.</p>
                </div>
                <div className="p-3 rounded-2xl border" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', background: isDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <div className="font-bold text-slate-800 dark:text-white">Live Inventory</div>
                  <p className="text-[10px] font-medium opacity-70 mt-1">Real-time tracking of ingredients & low-stock alerts.</p>
                </div>
                <div className="p-3 rounded-2xl border" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', background: isDarkMode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
                  <div className="font-bold text-slate-855 dark:text-white">AI Forecasting</div>
                  <p className="text-[10px] font-medium opacity-70 mt-1">Smart demand prediction & combo suggestions.</p>
                </div>
              </div>
            </div>

            {/* Q&A / FAQ Section */}
            <div className="space-y-3.5 border-t pt-4" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}>
              <h2 className="text-xs font-black uppercase tracking-wider text-primary">
                Frequently Answered Questions
              </h2>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-white">
                    Q: Does VendorOS support offline cashier mode?
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    A: Yes. VendorOS operates on an offline-first architecture. It utilizes a secure local sandbox database, meaning you can check out customers, run stock checks, and manage orders completely offline. The data automatically synchronizes with Supabase cloud nodes once network connection is restored.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-white">
                    Q: How do customers scan the QR menu and place orders?
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    A: Cashiers can print a dynamic QR code for each dining table. Customers scan it with their phone camera to browse the live menu. Once they confirm, the order flows instantly into the POS preparation view with zero friction.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-white">
                    Q: What pricing plan is available for local street food vendors?
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                    A: We offer a single, transparent StallOS POS License starting at ₹499/month. This includes unlimited orders, 5 QR menu codes, AI-assisted menu planning, and automated tax reporting. A 7-day free trial is available for new stalls.
                  </p>
                </div>
              </div>
            </div>

            {/* Citation Signals */}
            <div className="border-t pt-3 flex flex-wrap justify-between text-[9px] font-semibold text-slate-400" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }}>
              <div>Author: <span className="font-bold text-slate-600 dark:text-slate-400">VendorOS Core Engineering Team</span></div>
              <div>Updated: <span className="font-bold text-slate-600 dark:text-slate-400">June 20, 2026</span></div>
              <div>Publisher: <span className="font-bold text-slate-600 dark:text-slate-400">VendorOS SaaS Inc.</span></div>
              <div>Version: <span className="font-bold text-slate-600 dark:text-slate-400">2.4.0 (Stable)</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
