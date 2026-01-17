
import * as Tone from 'tone';
import { SCALES } from '../constants';
import { AttractorParams } from '../types';

interface AudioTrack {
  id: string;
  instrument: Tone.FMSynth;
  channel: Tone.Channel;
  panner: Tone.Panner;
  filter: Tone.Filter; 
  color: string;
  x: number;
  y: number;
  z: number; 
  zOffset: number; 
}

class AudioEngine {
  public activeTracks: AudioTrack[] = [];
  private masterBus: Tone.Compressor | null = null;
  private finalGain: Tone.Gain | null = null;
  private limiter: Tone.Limiter | null = null;
  
  private masterPositionLoop: Tone.Loop | null = null;
  private masterNoteLoop: Tone.Loop | null = null;
  
  private spatialBuses: Tone.Channel[] = [];
  private reverb: Tone.Freeverb | null = null;
  private chorus: Tone.Chorus | null = null;
  
  private initialized: boolean = false;
  private onNoteHitCallback: ((intensity: number, id: string, x: number, y: number, z: number) => void) | null = null;
  private globalParams: AttractorParams = { a: 1.5, b: -1.8, c: 1.6, d: 2.0 };
  
  private currentChordIndex: number = 0;
  private tickCount: number = 0;

  async init() {
    if (this.initialized) return;
    
    // Ajuste de latencia para prevenir chasquidos
    Tone.context.lookAhead = 0.5; 
    await Tone.start();
    
    this.limiter = new Tone.Limiter(-1.0).toDestination();
    this.finalGain = new Tone.Gain(2.5).connect(this.limiter);
    
    this.masterBus = new Tone.Compressor({
      threshold: -30,
      ratio: 3,
      attack: 0.1,
      release: 0.5 // Valor más corto y seguro
    }).connect(this.finalGain);

    // Constructor de objeto para evitar errores de rango en argumentos posicionales
    this.chorus = new Tone.Chorus({
      frequency: 0.1,
      delayTime: 2.5,
      depth: 0.5 // Aseguramos que esté en [0, 1]
    }).connect(this.masterBus).start();

    this.reverb = new Tone.Freeverb({ 
      roomSize: 0.8, // Valor más conservador
      dampening: 3000, 
      wet: 0.4 
    }).connect(this.chorus);

    // Configuración de delays espaciales
    const delayTimes = ["2n", "1n", "2n."];
    for (let i = 0; i < 3; i++) {
      const bus = new Tone.Channel({ volume: -8 }).connect(this.reverb);
      const delay = new Tone.FeedbackDelay({
        delayTime: delayTimes[i],
        feedback: 0.4,
        wet: 0.25
      }).connect(bus);
      this.spatialBuses.push(bus);
    }

    // Bucle de física del atractor (suave)
    this.masterPositionLoop = new Tone.Loop((time) => {
      const seconds = Tone.now();
      for (let i = 0; i < this.activeTracks.length; i++) {
        const track = this.activeTracks[i];
        
        const a = this.globalParams.a + (i * 0.00001);
        const b = this.globalParams.b + (i * 0.00001);
        const { c, d } = this.globalParams;

        const oldX = track.x;
        const oldY = track.y;
        track.x = Math.sin(a * oldY) + c * Math.cos(a * oldX);
        track.y = Math.sin(b * oldX) + d * Math.cos(b * oldY);

        const breathe = Math.sin(seconds * 0.1); 
        track.z = (Math.sin(seconds * 0.15 + track.zOffset + breathe) + 1) / 2;

        const volDist = p5Map(track.z, 0, 1, 0, -32); 
        const freqDist = p5Map(track.z, 0, 1, 3500, 400); 
        
        track.channel.volume.rampTo(volDist, 0.5);
        track.filter.frequency.rampTo(freqDist, 0.5);
        track.panner.pan.rampTo(Math.max(-0.9, Math.min(0.9, track.x)), 0.8);

        // Escalado suave de armónicos
        track.instrument.harmonicity.rampTo(1 + Math.abs(track.x) * 0.2, 0.8);
        track.instrument.modulationIndex.rampTo(1 + Math.abs(track.y) * 2, 0.8);
      }
    }, "8n").start(0);

    // Secuenciador Melódico Chill
    this.masterNoteLoop = new Tone.Loop((time) => {
      this.tickCount++;
      
      if (this.tickCount % 16 === 0) {
        this.currentChordIndex = (this.currentChordIndex + 1) % 4;
      }

      this.activeTracks.forEach((track, index) => {
        const seed = this.getDeterministicSeed(index, track.x, track.y);
        const isMainPulse = this.tickCount % 4 === 0;
        const rhythmThreshold = isMainPulse ? 0.6 : 0.95;
        
        if (seed > rhythmThreshold) {
          const scaleKeys = Object.keys(SCALES) as (keyof typeof SCALES)[];
          const currentScale = SCALES[scaleKeys[(index + this.currentChordIndex) % scaleKeys.length]];
          
          const noteBase = currentScale[Math.floor(seed * currentScale.length)];
          const octave = index < 10 ? 2 : 3; 
          const note = noteBase.replace(/[0-9]/, octave.toString());
          
          const velocity = (0.2 + seed * 0.2) * (1 - track.z * 0.5);
          track.instrument.triggerAttackRelease(note, "1n", time, velocity);
          
          Tone.Draw.schedule(() => {
            this.onNoteHitCallback?.(1.0, track.id, track.x, track.y, track.z);
          }, time);
        }
      });
    }, "4n").start(0);
    
    this.initialized = true;
  }

  setNoteHitCallback(callback: (intensity: number, id: string, x: number, y: number, z: number) => void) {
    this.onNoteHitCallback = callback;
  }

  private getDeterministicSeed(index: number, x: number, y: number): number {
    const val = Math.sin(index * 123.45 + x * 5.67 + y * 8.91);
    return (val + 1) / 2;
  }

  addBranch() {
    if (!this.initialized || this.activeTracks.length >= 33) return;
    
    const index = this.activeTracks.length;
    const channel = new Tone.Channel({ volume: -10 }).connect(this.masterBus!);
    const busIdx = index % this.spatialBuses.length;
    channel.connect(this.spatialBuses[busIdx]);

    const filter = new Tone.Filter(3000, "lowpass").connect(channel);
    const panner = new Tone.Panner(0).connect(filter);

    const instrument = new Tone.FMSynth({
      harmonicity: 1,
      modulationIndex: 1,
      portamento: 0.1, // Valor de tiempo estándar (0.1s), mucho más seguro que 1.2
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { 
        attack: 2.0, 
        decay: 1.5, 
        sustain: 0.8, 
        release: 4.0,
        attackCurve: "sine",
        releaseCurve: "sine"
      },
      modulationEnvelope: { 
        attack: 2.5, 
        decay: 1.5, 
        sustain: 0.8, 
        release: 3.5,
        attackCurve: "sine"
      }
    }).connect(panner);

    const colors = ['#50ffb0', '#00f5ff', '#ff00ff', '#a0a0ff', '#ffaa00', '#ff4040'];
    this.activeTracks.push({ 
      id: `layer-${index}`, 
      instrument, panner, filter, channel, 
      color: colors[index % colors.length],
      x: Math.random() * 1.4 - 0.7, 
      y: Math.random() * 1.4 - 0.7,
      z: 0.5,
      zOffset: Math.random() * Math.PI * 2 
    });
    
    if (this.finalGain) {
      const targetGain = Math.max(1.2, 2.5 - (this.activeTracks.length * 0.03));
      this.finalGain.gain.rampTo(targetGain, 1.0);
    }
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  removeBranch() {
    const t = this.activeTracks.pop();
    if (t) {
      t.instrument.triggerRelease();
      setTimeout(() => {
        t.instrument.dispose();
        t.panner.dispose();
        t.filter.dispose();
        t.channel.dispose();
      }, 5000);
    }
    if (this.activeTracks.length === 0) Tone.Transport.stop();
  }

  updateParams(params: AttractorParams) { this.globalParams = params; }
  setBPM(bpm: number) { Tone.Transport.bpm.rampTo(bpm, 2.0); }
}

function p5Map(n: number, start1: number, stop1: number, start2: number, stop2: number): number {
  return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
}

export const audioEngine = new AudioEngine();
