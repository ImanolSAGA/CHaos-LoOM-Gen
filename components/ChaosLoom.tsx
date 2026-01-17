
import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import { AttractorParams } from '../types';
import { audioEngine } from '../services/audioEngine';
import { FUTHARK_RUNES } from '../constants';

interface ChaosLoomProps {
  params: AttractorParams;
  bpm: number;
  speed: number;
  trackCount: number;
  pulseIntensity: number;
  pulseLayer: string;
}

interface NodeState {
  x: number;
  y: number;
  z: number; 
  color: string;
  intensity: number;
  trail: {x: number, y: number, z: number}[];
}

const ChaosLoom: React.FC<ChaosLoomProps> = ({ params, bpm, speed, trackCount, pulseIntensity, pulseLayer }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const nodeStates = useRef<Map<string, NodeState>>(new Map());

  useEffect(() => {
    audioEngine.setNoteHitCallback((intensity, id, x, y, z) => {
      const state = nodeStates.current.get(id);
      if (state) {
        state.intensity = intensity;
      } else {
        const colors = ['#50ffb0', '#00f5ff', '#ff00ff', '#a0a0ff', '#ffaa00', '#ff4040'];
        const idx = parseInt(id.split('-')[1]) || 0;
        nodeStates.current.set(id, { 
          x, y, z,
          color: colors[idx % colors.length], 
          intensity, 
          trail: [] 
        });
      }
    });
  }, []);

  const stateRef = useRef({ params, pulseIntensity, pulseLayer, speed, trackCount });
  useEffect(() => {
    stateRef.current = { params, pulseIntensity, pulseLayer, speed, trackCount };
    audioEngine.updateParams(params);
  }, [params, pulseIntensity, pulseLayer, speed, trackCount]);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      let rotation = 0;

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.background(2, 2, 5);
      };

      p.draw = () => {
        const { trackCount } = stateRef.current;
        
        p.blendMode(p.BLEND);
        p.fill(2, 2, 5, 15); // Menos opacidad para estelas más persistentes y suaves
        p.noStroke();
        p.rect(0, 0, p.width, p.height);

        p.push();
        p.translate(p.width / 2, p.height / 2);
        
        const baseScale = p.min(p.width, p.height) * 0.3;
        p.blendMode(p.SCREEN);

        for (const [id] of nodeStates.current) {
          const idx = parseInt(id.split('-')[1]);
          if (idx >= trackCount) nodeStates.current.delete(id);
        }

        for (let i = 0; i < trackCount; i++) {
          const trackData = audioEngine.activeTracks[i];
          if (!trackData) continue;

          const id = `layer-${i}`;
          let state = nodeStates.current.get(id);
          
          if (!state) {
            const colors = ['#50ffb0', '#00f5ff', '#ff00ff', '#a0a0ff', '#ffaa00', '#ff4040'];
            state = { x: trackData.x, y: trackData.y, z: trackData.z, color: colors[i % colors.length], intensity: 0, trail: [] };
            nodeStates.current.set(id, state);
          }

          // Interpolación más perezosa (0.05 vs 0.2)
          state.x = p.lerp(state.x, trackData.x, 0.05);
          state.y = p.lerp(state.y, trackData.y, 0.05);
          state.z = p.lerp(state.z, trackData.z, 0.03);
          
          state.trail.push({ x: state.x, y: state.y, z: state.z });
          
          const maxTrail = p.floor(p.map(state.z, 0, 1, 40, 15));
          if (state.trail.length > maxTrail) state.trail.shift();

          const c = p.color(state.color);
          const perspectiveScale = p.map(state.z, 0, 1, 1.1, 0.5);
          const currentScale = baseScale * perspectiveScale;

          p.noFill();
          p.strokeWeight(p.map(state.z, 0, 1, 1.2, 0.4));
          
          for (let j = 0; j < state.trail.length - 1; j++) {
            const t = state.trail[j];
            const alpha = p.map(j, 0, state.trail.length, 0, p.map(t.z, 0, 1, 120, 30));
            c.setAlpha(alpha);
            p.stroke(c);
            
            const s = baseScale * p.map(t.z, 0, 1, 1.1, 0.5);
            const x1 = t.x * s;
            const y1 = t.y * s;
            const nextT = state.trail[j+1];
            const nextS = baseScale * p.map(nextT.z, 0, 1, 1.1, 0.5);
            const x2 = nextT.x * nextS;
            const y2 = nextT.y * nextS;

            p.line(x1, y1, x2, y2);
            p.line(-x1, y1, -x2, y2); // Simetría especular para mayor hipnosis
          }

          c.setAlpha(p.map(state.z, 0, 1, 150, 40) + state.intensity * 50);
          p.fill(c);
          p.noStroke();
          const headSize = (3 + state.intensity * 8) * perspectiveScale;
          p.circle(state.x * currentScale, state.y * currentScale, headSize);
          
          state.intensity *= 0.92; // Desvanecimiento visual más lento
        }

        p.pop();
        drawRitualUI(p);
      };

      const drawRitualUI = (p: p5) => {
        p.push();
        p.translate(p.width / 2, p.height / 2);
        rotation += 0.0001; // Rotación casi imperceptible
        p.rotate(rotation);
        
        const radius = p.min(p.width, p.height) * 0.45;
        p.textAlign(p.CENTER, p.CENTER);
        for (let i = 0; i < FUTHARK_RUNES.length; i++) {
          const angle = p.map(i, 0, FUTHARK_RUNES.length, 0, p.TWO_PI);
          p.push();
          p.translate(radius * p.cos(angle), radius * p.sin(angle));
          p.rotate(angle + p.HALF_PI);
          p.fill(80, 255, 176, 8);
          p.textSize(7);
          p.text(FUTHARK_RUNES[i], 0, 0);
          p.pop();
        }
        p.pop();

        p.fill(80, 255, 176, 30);
        p.textSize(8);
        p.text(`[ DEEP_CHILL_LEVEL: ${stateRef.current.trackCount} ] [ PULSE: ${bpm} BPM ]`, 40, p.height - 40);
      };

      p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

    p5InstanceRef.current = new p5(sketch, containerRef.current);
    return () => p5InstanceRef.current?.remove();
  }, [bpm]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default ChaosLoom;
