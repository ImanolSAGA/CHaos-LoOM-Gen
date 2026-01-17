
export interface AttractorParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface LoomState {
  bpm: number;
  speed: number;
  params: AttractorParams;
  isStarted: boolean;
  currentX: number;
  currentY: number;
}

export interface TrackData {
  id: string;
  x: number;
  y: number;
  color: string;
  intensity: number;
}

export type Scale = 'PHRYGIAN_DOMINANT' | 'DORIAN';
