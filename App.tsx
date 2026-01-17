
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChaosLoom from './components/ChaosLoom';
import { LoomState } from './types';
import { INITIAL_PARAMS } from './constants';
import { audioEngine } from './services/audioEngine';

const COSMIC_LOG = [
  "DEEP_CHILL_INITIATED",
  "AETHER_DENSITY_STABILIZED",
  "LOW_FREQUENCY_OSCILLATION",
  "LAZY_ATTRACTOR_FLOW",
  "SOFT_VOID_RESONANCE",
  "NEBULA_TEXTURE_ACTIVE",
  "TIME_DILATION_LOCKED",
  "ETHEREAL_DISSOLVE_COMPLETE",
  "QUIET_CHAOS_ESTABLISHED"
];

const App: React.FC = () => {
  const [state, setState] = useState<LoomState>({
    bpm: 48, // Tempo más lento por defecto
    speed: 0.2, // Movimiento inicial reducido
    params: INITIAL_PARAMS,
    isStarted: false,
    currentX: 0,
    currentY: 0
  });

  const [pulse, setPulse] = useState({ intensity: 0, layer: 'none' });
  const [trackCount, setTrackCount] = useState(0);
  const [log, setLog] = useState<string[]>(["[VOID_STATUS: NULL]", "[AWAITING_CHILL_SYMPHONY]"]);

  useEffect(() => {
    if (state.isStarted) {
      audioEngine.setNoteHitCallback((intensity, layer) => {
        setPulse({ intensity, layer });
      });
    }
  }, [state.isStarted]);

  const handleStart = async () => {
    try {
      await audioEngine.init();
      audioEngine.setBPM(state.bpm);
      audioEngine.addBranch();
      setTrackCount(1);
      setState(prev => ({ ...prev, isStarted: true }));
      setLog(prev => [...prev, "[CHILL_LOOM_ACTIVE]", "[DEEP_SYNC: ON]"]);
    } catch (e) {
      console.error("Failed to start audio engine", e);
    }
  };

  const adjustSpeed = (delta: number) => {
    setState(prev => {
      const newSpeed = Math.max(0.05, Math.min(1.0, prev.speed + delta));
      const newBPM = Math.floor(30 + (newSpeed * 60)); // Rango más bajo de BPM (30 a 90)
      audioEngine.setBPM(newBPM);
      return { ...prev, speed: newSpeed, bpm: newBPM };
    });
  };

  const handleLayerChange = (type: 'up' | 'down') => {
    if (type === 'up' && trackCount < 33) {
      audioEngine.addBranch();
      setTrackCount(prev => prev + 1);
      const msg = COSMIC_LOG[trackCount % COSMIC_LOG.length];
      setLog(prev => [...prev.slice(-12), `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`]);
    } else if (type === 'down' && trackCount > 1) {
      audioEngine.removeBranch();
      setTrackCount(prev => prev - 1);
      setLog(prev => [...prev.slice(-12), `[${new Date().toLocaleTimeString().split(' ')[0]}] NODE_SOFT_DISSOLVE`]);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#020205] text-[#50ffb0] overflow-hidden font-['JetBrains_Mono'] custom-cursor select-none">
      {!state.isStarted ? (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/98">
          <div className="rune-border p-20 bg-[#05050b]/90 border-[#50ffb0]/20 shadow-[0_0_120px_rgba(80,255,176,0.05)] flex flex-col items-center">
            <div className="text-[10px] tracking-[1.5em] mb-8 text-[#50ffb0]/40 font-bold uppercase">Deep Chill Technomancy</div>
            <h1 className="text-8xl font-bold mb-12 tracking-tighter terminal-glow opacity-90">CHAOS LOOM</h1>
            <button 
              onClick={handleStart}
              className="px-24 py-10 border border-[#50ffb0]/30 hover:border-[#50ffb0] hover:bg-[#50ffb0]/5 transition-all group relative overflow-hidden"
            >
              <span className="relative z-10 font-bold tracking-[1em] text-xs">SUMMON_QUIET</span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#50ffb0] scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
            </button>
          </div>
        </div>
      ) : (
        <>
          <ChaosLoom 
            params={state.params} 
            bpm={state.bpm} 
            speed={state.speed}
            trackCount={trackCount}
            pulseIntensity={pulse.intensity}
            pulseLayer={pulse.layer}
          />

          {/* Vertical Node Control */}
          <div className="absolute left-12 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-12">
            <button 
              onClick={() => handleLayerChange('up')}
              className="w-16 h-16 rune-border flex items-center justify-center hover:bg-[#50ffb0]/5 transition-all group"
              title="Add Voice"
            >
              <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">ᛒ</span>
            </button>

            <div className="flex flex-col items-center py-4">
              <div className="w-[1px] h-72 bg-gradient-to-b from-transparent via-[#50ffb0]/10 to-transparent relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] opacity-20">33</div>
                 <div 
                  className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-[#50ffb0]/80 rotate-45 transition-all duration-500 shadow-[0_0_20px_#50ffb0]" 
                  style={{ top: `${(trackCount / 33) * 100}%` }}
                 ></div>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] opacity-20">01</div>
              </div>
            </div>

            <button 
              onClick={() => handleLayerChange('down')}
              className="w-16 h-16 rune-border flex items-center justify-center hover:bg-[#ff4040]/5 border-[#ff4040]/20 transition-all group text-[#ff4040]"
              title="Remove Voice"
            >
              <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">ᛚ</span>
            </button>
          </div>

          {/* Scriptorium Panel */}
          <div className="absolute right-12 top-28 bottom-40 w-80 z-50">
            <div className="h-full rune-border bg-black/60 backdrop-blur-xl p-8 flex flex-col gap-6 overflow-hidden">
              <div className="text-[10px] font-bold border-b border-[#50ffb0]/10 pb-4 flex justify-between uppercase tracking-[0.4em] text-[#50ffb0]/50">
                <span>CHILL_LOG</span>
                <span className="animate-pulse">DEEP_FLOW</span>
              </div>
              <div className="flex-1 flex flex-col gap-5 cyber-scroll overflow-y-auto pr-3">
                {log.map((entry, i) => (
                  <div key={i} className="text-[10px] leading-relaxed opacity-50 font-mono flex gap-3">
                    <span className="text-[#50ffb0]/30 select-none">⟫</span> {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flux Nexus Interface */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-20 p-10 rune-border bg-black/85 backdrop-blur-3xl z-50 shadow-[0_0_80px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-8">
               <button 
                onClick={() => adjustSpeed(-0.05)}
                className="w-14 h-14 rune-border flex items-center justify-center hover:bg-[#50ffb0]/10 transition-all active:scale-90"
               >-</button>
               <div className="text-center min-w-[140px]">
                  <div className="text-[10px] opacity-30 uppercase tracking-[0.5em] mb-2 font-bold">CHILL_FACTOR</div>
                  <div className="text-3xl terminal-glow font-bold tabular-nums">{(state.speed * 10).toFixed(1)}</div>
               </div>
               <button 
                onClick={() => adjustSpeed(0.05)}
                className="w-14 h-14 rune-border flex items-center justify-center hover:bg-[#50ffb0]/10 transition-all active:scale-90"
               >+</button>
            </div>
            
            <div className="w-[1px] h-20 bg-[#50ffb0]/5"></div>

            <div className="flex flex-col items-center">
              <div className="text-[10px] opacity-30 uppercase tracking-[0.5em] mb-2 font-bold">STATE</div>
              <div className="w-12 h-12 rune-border border-[#50ffb0]/20 flex items-center justify-center terminal-glow text-xl">ᛇ</div>
            </div>

            <div className="flex flex-col items-center min-w-[120px]">
              <div className="text-[10px] opacity-30 uppercase tracking-[0.5em] mb-2 font-bold">PULSE</div>
              <div className="text-2xl font-bold terminal-glow tabular-nums">{state.bpm} <span className="text-[10px] opacity-30 font-normal ml-1">BPM</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
