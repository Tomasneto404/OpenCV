import type { CVData } from '../types';
const MAX_HISTORY = 50;
export interface History {
  past: CVData[];
  present: CVData;
  future: CVData[];
  committed: CVData;
}
export type HistoryAction =
  | { type: 'replace' | 'clear' | 'load' | 'reset'; cv: CVData }
  | { type: 'commit' | 'undo' | 'redo' };
export function initialHistory(cv: CVData): History {
  return { past: [], present: cv, future: [], committed: cv };
}
export function hasPendingEdit(state: History): boolean {
  return JSON.stringify(state.present) !== JSON.stringify(state.committed);
}
/** Pure reducer: React may replay updates in StrictMode. Never mutate refs here. */
export function historyReducer(state: History, action: HistoryAction): History {
  switch (action.type) {
    case 'replace':
      return { ...state, present: action.cv, future: [] };
    case 'commit':
      return hasPendingEdit(state)
        ? { past: [...state.past, state.committed].slice(-MAX_HISTORY), present: state.present, committed: state.present, future: [] }
        : state;
    case 'undo': {
      if (hasPendingEdit(state)) {
        return { ...state, present: state.committed, future: [state.present, ...state.future].slice(0, MAX_HISTORY) };
      }
      const previous = state.past.at(-1);
      return previous
        ? { past: state.past.slice(0, -1), present: previous, committed: previous, future: [state.present, ...state.future].slice(0, MAX_HISTORY) }
        : state;
    }
    case 'redo': {
      const [next, ...rest] = state.future;
      return next
        ? { past: [...state.past, state.present].slice(-MAX_HISTORY), present: next, committed: next, future: rest }
        : state;
    }
    case 'load':
    case 'clear': {
      const past = hasPendingEdit(state) ? [...state.past, state.committed, state.present] : [...state.past, state.present];
      return { past: past.slice(-MAX_HISTORY), present: action.cv, committed: action.cv, future: [] };
    }
    case 'reset':
      return initialHistory(action.cv);
  }
}
