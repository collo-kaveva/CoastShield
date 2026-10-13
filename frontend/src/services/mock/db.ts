import { demoState, type DemoState } from "./seed";

const KEY = "coastshield.demo.v1";
let cache: DemoState | null = null;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage unavailable: keep in memory */ }
}

export function getState(): DemoState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { cache = JSON.parse(raw) as DemoState; return cache; }
  } catch { /* corrupt or unavailable: fall through to seed */ }
  cache = clone(demoState());
  persist();
  return cache;
}

export function mutate<T>(fn: (s: DemoState) => T): T {
  const result = fn(getState());
  persist();
  return result;
}

export function resetState() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  getState();
}
