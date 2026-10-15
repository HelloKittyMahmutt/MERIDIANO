import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Factory, 
  Truck, 
  Ship, 
  Plane, 
  ArrowRight,
  Terminal,
  Box,
  Layers,
  Compass,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Language } from '../types';
import { LogisticsCanvas3D } from './logistics3d/LogisticsCanvas3D';
import { ModelInspector3D } from './logistics3d/ModelInspector3D';
import { audioEngine } from './logistics3d/audioEngine';

interface InteractiveLogisticsJourneyProps {
  currentLang: Language;
  onOpenQuote: () => void;
}

export const InteractiveLogisticsJourney: React.FC<InteractiveLogisticsJourneyProps> = ({
  currentLang,
  onOpenQuote,
}) => {
  // Mode: '3d-sim' (Real 3D Simulation), '3d-inspector' (360° Model Inspector), '2d-schematic' (Vector diagram)
  const [viewMode, setViewMode] = useState<'3d-sim' | '3d-inspector' | '2d-schematic'>('3d-sim');
  
  // Phase 0: Factory Loading, Phase 1: Truck Highway, Phase 2: Port Crane & Ship, Phase 3: Airplane Finale
  const [phase, setPhase] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [typedTelemetry, setTypedTelemetry] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(true); // Muted by default to respect browser autoplay

  const phaseDuration = 5500; // 5.5 seconds per phase
  const totalPhases = 4;

  const phaseData = [
    {
      id: 0,
      title: currentLang === 'bg' ? '01 · Завод: Мотокарът качва контейнера' : '01 · Factory: Forklift loads container',
      subtitle: currentLang === 'bg' ? 'Мотокарът повдига контейнера MERIDIANO и го поставя върху камиона' : 'Forklift hoists MERIDIANO container and seats it onto the truck',
      logs: 'FACTORY DOCK #04 • FORKLIFT LOWERING CONTAINER MERIDIANO • TWISTLOCKS SECURED • BOLT SEAL #MD-994012 VERIFIED',
      icon: Factory
    },
    {
      id: 1,
      title: currentLang === 'bg' ? '02 · Магистрала: Камионът пътува към порта' : '02 · Highway: Truck in transit to port',
      subtitle: currentLang === 'bg' ? 'Камионът превозва контейнера MERIDIANO по крайбрежната магистрала' : 'Truck powers the MERIDIANO container along the coastal expressway',
      logs: 'HIGHWAY G15 TRANSIT • SPEED: 85.6 KM/H • GPS: 29°55\'N 121°44\'E • CARGO: CONTAINER MERIDIANO IN MOTION',
      icon: Truck
    },
    {
      id: 2,
      title: currentLang === 'bg' ? '03 · Пристанище: Кранът премества на кораба' : '03 · Port: Crane transfers onto ship',
      subtitle: currentLang === 'bg' ? 'Пристанищният кран вдига контейнера MERIDIANO и го спуска в трюма' : 'Quayside crane hoists MERIDIANO container into vessel cargo hold',
      logs: 'PORT BEILUN TERMINAL • STS CRANE SPREADER LOCKED • CONTAINER MERIDIANO HOISTED INTO SHIP CELL • READY TO SAIL',
      icon: Ship
    },
    {
      id: 3,
      title: currentLang === 'bg' ? '04 · Небе: Самолетът затваря цикъла' : '04 · Sky: Cargo plane completes cycle',
      subtitle: currentLang === 'bg' ? 'Товарният самолет прелита в небето и затваря целия международен цикъл' : 'The cargo airliner sweeps across the sky, completing the global delivery chain',
      logs: 'AIRSPACE TRANSIT • CARGO JET AT 34,000 FT • ВАШАТА СТОКА, НАШАТА ОТГОВОРНОСТ • ОТ СВЕТА ДО ВАС • COMPLETE',
      icon: Plane
    }
  ];

  const currentInfo = phaseData[phase];

  // Global playback timer (active in 3d-sim and 2d-schematic)
  useEffect(() => {
    if (!isPlaying || viewMode === '3d-inspector') return;

    const interval = 50;
    const increment = (interval / phaseDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setPhase((p) => {
            const nextP = (p + 1) % totalPhases;
            audioEngine.playPhaseTransition();
            audioEngine.startPhaseAmbience(nextP);
            return nextP;
          });
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, viewMode]);

  // Terminal typewriter effect
  useEffect(() => {
    setTypedTelemetry('');
    let idx = 0;
    const text = currentInfo.logs;

    const typeTimer = setInterval(() => {
      if (idx < text.length) {
        setTypedTelemetry(text.slice(0, idx + 1));
        idx++;
      } else {
        clearInterval(typeTimer);
      }
    }, 18);

    return () => clearInterval(typeTimer);
  }, [phase]);

  const jumpToPhase = (pIndex: number) => {
    audioEngine.playClick();
    setPhase(pIndex);
    setProgress(0);
    audioEngine.playPhaseTransition();
    audioEngine.startPhaseAmbience(pIndex);
  };

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    if (!nextMuted) {
      audioEngine.playClick();
      audioEngine.startPhaseAmbience(phase);
    } else {
      audioEngine.stopAmbience();
    }
  };

  return (
    <section id="journey" className="py-16 sm:py-20 bg-[#040711] text-white relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono tracking-wider uppercase text-blue-300 font-bold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>{currentLang === 'bg' ? 'СЕКЦИЯ 03 · ПЪТ НА СТОКАТА (3D ИНТЕРАКТИВНО)' : 'SECTION 03 · 3D CARGO JOURNEY'}</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-montserrat">
              {currentLang === 'bg' ? 'Пътят на вашия контейнер MERIDIANO' : 'The Journey of Your MERIDIANO Cargo'}
            </h2>
            <p className="font-montserrat font-bold text-xs sm:text-sm text-slate-300 mt-1">
              {currentLang === 'bg'
                ? 'Пълна интерактивна 3D визуализация с реални модели: мотокар, контейнер, камион MAN TGX, шаси, кораб и карго самолет.'
                : 'Fully interactive 3D logistics simulation featuring authentic models: forklift, container, MAN truck, chassis, vessel and cargo airliner.'}
            </p>
          </div>

          {/* Controls: Mode Switcher & Playback */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Mode Selector Tabs */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setViewMode('3d-sim');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === '3d-sim'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">3D SIM</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setViewMode('3d-inspector');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === '3d-inspector'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-900/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{currentLang === 'bg' ? '3D МОДЕЛИ' : '3D ASSETS'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setViewMode('2d-schematic');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === '2d-schematic'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">2D SCHEMATIC</span>
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl border text-xs font-mono transition-colors ${
                !isMuted
                  ? 'bg-blue-950/80 border-blue-500/70 text-blue-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={isMuted ? 'Включи 3D звук' : 'Заглуши звук'}
            >
              {!isMuted ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Playback Restart */}
            {viewMode !== '3d-inspector' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    setPhase(0);
                    setProgress(0);
                    setIsPlaying(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white transition-colors"
                  title="Рестарт от началото"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">RESTART</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    setIsPlaying(!isPlaying);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 text-blue-400" /> : <Play className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Interactive Phase Tabs (Shown in Simulation or 2D mode) */}
        {viewMode !== '3d-inspector' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
            {phaseData.map((item, idx) => {
              const Icon = item.icon;
              const isActive = phase === idx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => jumpToPhase(idx)}
                  className={`relative p-3.5 rounded-xl border text-left transition-all duration-200 overflow-hidden ${
                    isActive
                      ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-950/60 ring-1 ring-blue-500/50'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isActive && (
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-blue-600/15 pointer-events-none transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-1.5 relative z-10">
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                      PHASE 0{idx + 1}
                    </span>
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>

                  <div className="text-xs font-montserrat font-bold text-white truncate relative z-10">
                    {item.title}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN STAGE (3D SIMULATION / 3D INSPECTOR / 2D SCHEMATIC)        */}
        {/* ============================================================== */}
        <div className="relative rounded-2xl border border-slate-800/90 bg-[#060A14] shadow-2xl overflow-hidden">
          
          {/* Top Stage Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md font-mono text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-montserrat font-bold text-white text-xs sm:text-sm">
                {viewMode === '3d-inspector' 
                  ? (currentLang === 'bg' ? '3D Инспектор на активи: Завъртане на 360°, мащаб и технически спецификации' : '3D Fleet & Cargo Inspector: 360° interactive orbit, zoom & specs')
                  : currentInfo.subtitle
                }
              </span>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-blue-300">
              <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-600/40 font-bold">
                {viewMode === '3d-inspector' ? '6 GLB 3D ASSETS' : `PHASE ${phase + 1} / 4`}
              </span>
            </div>
          </div>

          {/* DYNAMIC SCENE CONTAINER */}
          {viewMode === '3d-sim' ? (
            /* 1. REAL 3D SIMULATION CANVAS */
            <LogisticsCanvas3D 
              currentLang={currentLang} 
              phase={phase} 
              progress={progress} 
              isPlaying={isPlaying} 
            />
          ) : viewMode === '3d-inspector' ? (
            /* 2. 3D MODEL INSPECTOR (All 6 uploaded GLBs) */
            <div className="p-4 sm:p-6 bg-[#040711]">
              <ModelInspector3D currentLang={currentLang} />
            </div>
          ) : (
            /* 3. 2D VECTOR SCHEMATIC STAGE */
            <div className="relative w-full h-[320px] sm:h-[400px] md:h-[450px] overflow-hidden bg-gradient-to-b from-[#050C1B] via-[#040814] to-[#020409] flex items-center justify-center select-none">
              
              <svg className="w-full h-full" viewBox="0 0 1000 450" preserveAspectRatio="xMidYMid meet">
                
                <defs>
                  <linearGradient id="containerGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0B1C38" />
                    <stop offset="50%" stopColor="#122F5A" />
                    <stop offset="100%" stopColor="#0B1C38" />
                  </linearGradient>

                  <linearGradient id="truckGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E3A8A" />
                    <stop offset="100%" stopColor="#0F172A" />
                  </linearGradient>

                  <linearGradient id="twilightSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#020716" />
                    <stop offset="50%" stopColor="#06163A" />
                    <stop offset="100%" stopColor="#0B2556" />
                  </linearGradient>

                  <linearGradient id="oceanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" />
                    <stop offset="30%" stopColor="#0369A1" />
                    <stop offset="100%" stopColor="#082F49" />
                  </linearGradient>
                </defs>

                {/* SCENE 0 */}
                {phase === 0 && (
                  <g className="animate-fadeIn">
                    <rect x="0" y="0" width="1000" height="380" fill="#060C1A" />
                    <rect x="80" y="40" width="80" height="90" fill="#1E293B" opacity="0.4" rx="4" />
                    <rect x="180" y="40" width="80" height="90" fill="#1E293B" opacity="0.4" rx="4" />
                    <rect x="280" y="40" width="80" height="90" fill="#1E293B" opacity="0.4" rx="4" />
                    <line x1="0" y1="30" x2="1000" y2="30" stroke="#F59E0B" strokeWidth="4" />
                    <line x1="0" y1="50" x2="1000" y2="50" stroke="#475569" strokeWidth="2" strokeDasharray="10 5" />
                    <rect x="0" y="380" width="1000" height="70" fill="#0F172A" />
                    <line x1="0" y1="380" x2="1000" y2="380" stroke="#FACC15" strokeWidth="6" strokeDasharray="30 20" />
                    <text x="800" y="80" fill="#334155" fontSize="32" fontWeight="900" fontFamily="Montserrat" letterSpacing="4">FACTORY DOCK #04</text>

                    {/* Waiting Truck */}
                    <g transform="translate(560, 240)">
                      <path d="M 280 20 L 360 20 L 370 70 L 370 140 L 280 140 Z" fill="url(#truckGrad)" stroke="#38BDF8" strokeWidth="2" />
                      <polygon points="300,30 350,30 355,65 300,65" fill="#0284C7" opacity="0.7" />
                      <circle cx="365" cy="115" r="8" fill="#FDE047" />
                      <rect x="0" y="115" width="280" height="25" fill="#334155" rx="3" />
                      <rect x="10" y="105" width="12" height="10" fill="#F59E0B" />
                      <rect x="260" y="105" width="12" height="10" fill="#F59E0B" />
                      <circle cx="60" cy="145" r="22" fill="#0F172A" stroke="#475569" strokeWidth="5" />
                      <circle cx="110" cy="145" r="22" fill="#0F172A" stroke="#475569" strokeWidth="5" />
                      <circle cx="310" cy="145" r="22" fill="#0F172A" stroke="#475569" strokeWidth="5" />
                      <circle cx="355" cy="145" r="22" fill="#0F172A" stroke="#475569" strokeWidth="5" />
                    </g>

                    {/* Yellow Forklift */}
                    <g transform="translate(140, 255)">
                      <path d="M 0 50 L 50 20 L 110 20 L 110 120 L 0 120 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
                      <rect x="40" y="30" width="50" height="50" fill="#0F172A" stroke="#F59E0B" strokeWidth="2" rx="4" />
                      <circle cx="65" cy="15" r="6" fill="#FBBF24" />
                      <circle cx="30" cy="130" r="18" fill="#0F172A" stroke="#475569" strokeWidth="4" />
                      <circle cx="95" cy="130" r="18" fill="#0F172A" stroke="#475569" strokeWidth="4" />
                      <rect x="120" y="-30" width="8" height="150" fill="#94A3B8" />
                      <rect x="135" y="-30" width="8" height="150" fill="#94A3B8" />
                    </g>

                    {/* Container */}
                    <g transform="translate(380, 220)">
                      <rect x="0" y="0" width="360" height="110" rx="4" fill="url(#containerGrad)" stroke="#38BDF8" strokeWidth="2.5" />
                      {[...Array(14)].map((_, i) => (
                        <line key={i} x1={25 + i * 23} y1="4" x2={25 + i * 23} y2="106" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.08" />
                      ))}
                      <circle cx="55" cy="55" r="22" fill="#FFFFFF" opacity="0.1" />
                      <text x="55" y="63" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="Montserrat" textAnchor="middle">M</text>
                      <text x="95" y="65" fill="#FFFFFF" fontSize="30" fontWeight="900" fontFamily="Montserrat" letterSpacing="4">MERIDIANO</text>
                      <text x="240" y="30" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="monospace">MRDU 884029-4</text>
                      <text x="240" y="90" fill="#4ADE80" fontSize="10" fontWeight="bold" fontFamily="monospace">SEAL: #MD-994012</text>
                    </g>
                    <rect x="290" y="325" width="220" height="10" fill="#F59E0B" rx="2" />
                  </g>
                )}

                {/* SCENE 1 */}
                {phase === 1 && (
                  <g className="animate-fadeIn">
                    <rect x="0" y="0" width="1000" height="350" fill="#040817" />
                    <polygon points="0,280 200,160 400,240 600,130 850,220 1000,170 1000,350 0,350" fill="#0F1D38" opacity="0.5" />
                    <rect x="680" y="40" width="220" height="60" fill="#065F46" stroke="#10B981" strokeWidth="2" rx="4" />
                    <text x="700" y="65" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="Montserrat">PORT OF NINGBO / BEILUN</text>
                    <text x="700" y="85" fill="#FDE047" fontSize="12" fontWeight="bold" fontFamily="monospace">DIRECT CORRIDOR ➔ 12 KM</text>
                    <rect x="0" y="320" width="1000" height="130" fill="#0B132B" />
                    <line x1="0" y1="385" x2="1000" y2="385" stroke="#FDE047" strokeWidth="5" strokeDasharray="40 30" />

                    <g transform="translate(240, 165)">
                      <rect x="0" y="30" width="380" height="120" rx="4" fill="url(#containerGrad)" stroke="#38BDF8" strokeWidth="2.5" />
                      <circle cx="65" cy="90" r="24" fill="#FFFFFF" opacity="0.1" />
                      <text x="65" y="98" fill="#FFFFFF" fontSize="24" fontWeight="900" fontFamily="Montserrat" textAnchor="middle">M</text>
                      <text x="110" y="100" fill="#FFFFFF" fontSize="32" fontWeight="900" fontFamily="Montserrat" letterSpacing="4">MERIDIANO</text>
                      <rect x="-10" y="150" width="400" height="15" fill="#334155" rx="3" />
                      <path d="M 380 40 L 460 40 L 475 90 L 475 165 L 380 165 Z" fill="url(#truckGrad)" stroke="#38BDF8" strokeWidth="2" />
                      <polygon points="475,135 680,110 680,210 475,155" fill="#FDE047" opacity="0.25" />
                      <circle cx="470" cy="140" r="8" fill="#FDE047" />
                    </g>
                  </g>
                )}

                {/* SCENE 2 */}
                {phase === 2 && (
                  <g className="animate-fadeIn">
                    <rect x="0" y="0" width="1000" height="280" fill="#050C1B" />
                    <rect x="420" y="280" width="580" height="170" fill="url(#oceanGrad)" />
                    <rect x="0" y="280" width="420" height="170" fill="#1E293B" />
                    
                    {/* Container Ship */}
                    <g transform="translate(440, 245)">
                      <rect x="60" y="0" width="460" height="50" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
                      <path d="M 0 50 L 520 50 L 540 130 L 20 130 Z" fill="#991B1B" stroke="#DC2626" strokeWidth="3" />
                      <text x="80" y="95" fill="#FFFFFF" fontSize="18" fontWeight="bold" fontFamily="Montserrat" letterSpacing="3">MERIDIANO EXPRESS</text>
                    </g>

                    {/* Crane */}
                    <g transform="translate(200, 10)">
                      <line x1="0" y1="40" x2="60" y2="270" stroke="#F59E0B" strokeWidth="8" />
                      <line x1="180" y1="40" x2="120" y2="270" stroke="#F59E0B" strokeWidth="8" />
                      <rect x="-80" y="30" width="600" height="18" fill="#F59E0B" rx="3" />
                    </g>
                  </g>
                )}

                {/* SCENE 3 */}
                {phase === 3 && (
                  <g className="animate-fadeIn">
                    <rect x="0" y="0" width="1000" height="450" fill="url(#twilightSky)" />
                    <rect x="0" y="360" width="1000" height="90" fill="#020C1F" />
                    
                    {/* Airplane */}
                    <g transform="translate(380, 110)">
                      <path d="M 320 80 Q 360 80 340 70 Q 280 50 160 50 L 40 55 Q 0 55 0 25 L 10 90 Q 50 95 100 95 L 300 95 Q 340 95 320 80 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                      <polygon points="160,65 240,10 260,10 200,75" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
                      <polygon points="50,55 10,5 40,5 90,55" fill="#0B1C38" />
                      <text x="35" y="32" fill="#FFFFFF" fontSize="16" fontWeight="bold" fontFamily="Montserrat">M</text>
                      <text x="120" y="82" fill="#0B1C38" fontSize="16" fontWeight="900" fontFamily="Montserrat" letterSpacing="3">MERIDIANO</text>
                    </g>

                    <g transform="translate(250, 240)">
                      <rect x="0" y="0" width="500" height="90" rx="12" fill="#060E22" stroke="#38BDF8" strokeWidth="1.5" opacity="0.95" />
                      <text x="250" y="35" fill="#93C5FD" fontSize="12" fontWeight="bold" fontFamily="monospace" textAnchor="middle" letterSpacing="3">GLOBAL TRADE NETWORK COMPLETE</text>
                      <text x="250" y="62" fill="#FFFFFF" fontSize="20" fontWeight="900" fontFamily="Montserrat" textAnchor="middle">ВАШАТА СТОКА, НАШАТА ОТГОВОРНОСТ.</text>
                      <text x="250" y="80" fill="#38BDF8" fontSize="13" fontWeight="bold" fontFamily="Montserrat" textAnchor="middle">ОТ СВЕТА ДО ВАС</text>
                    </g>
                  </g>
                )}

              </svg>

            </div>
          )}

          {/* REAL-TIME LOGISTICS TELEMETRY TERMINAL */}
          <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
            
            <div className="flex-1 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 shrink-0 mt-0.5">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="space-y-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 font-bold uppercase">
                    LIVE LOGISTICS FEED
                  </span>
                  <span className="text-xs font-montserrat font-bold text-white">
                    {currentInfo.title}
                  </span>
                </div>

                <div className="font-mono text-xs text-blue-300 min-h-[22px] flex items-center">
                  <span>{typedTelemetry}</span>
                  <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-1 animate-pulse" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenQuote}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-slate-100 text-[#040711] font-montserrat font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 whitespace-nowrap self-start sm:self-auto"
            >
              <span>{currentLang === 'bg' ? 'Запитване за доставка' : 'Request Delivery'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#040711]" />
            </button>

          </div>

        </div>

      </div>
    </section>
  );
};
