import { describe, it, expect } from 'vitest';
import { emptyCV } from '../../client/src/types';
import { historyReducer, initialHistory } from '../../client/src/state/history';
const first = emptyCV();
const second = { ...first, personal: { ...first.personal, fullName: 'Ana' } };
const third = { ...second, personal: { ...second.personal, fullName: 'Maria' } };
describe('editor undo and redo', () => {
  it('replays reducer updates without mutating their input (React StrictMode)', () => {
    const edited = historyReducer(initialHistory(first), { type:'replace', cv:second });
    const committed = historyReducer(edited, { type:'commit' });
    expect(historyReducer(edited, { type:'commit' })).toEqual(committed);
    expect(edited.committed).toEqual(first);
    expect(historyReducer(committed, { type:'undo' }).present).toEqual(first);
    expect(historyReducer(committed, { type:'undo' }).present).toEqual(first);
  });
  it('undoes and redoes pending edits before the debounce commits', () => {
    const edited = historyReducer(initialHistory(first), { type:'replace', cv:second });
    const undone = historyReducer(edited, { type:'undo' });
    expect(undone.present).toEqual(first);
    expect(historyReducer(undone, { type:'redo' }).present).toEqual(second);
  });
  it('drops redo history immediately when the user makes another edit', () => {
    let state = historyReducer(initialHistory(first), { type:'replace', cv:second });
    state = historyReducer(state, { type:'commit' });
    state = historyReducer(state, { type:'undo' });
    state = historyReducer(state, { type:'replace', cv:third });
    expect(state.future).toEqual([]);
    expect(historyReducer(state, { type:'redo' }).present).toEqual(third);
  });
  it('undoes an upload back to the latest pending edit', () => {
    const edited = historyReducer(initialHistory(first), { type: 'replace', cv: second });
    const loaded = historyReducer(edited, { type: 'load', cv: third });
    expect(historyReducer(loaded, { type: 'undo' }).present).toEqual(second);
    expect(historyReducer(historyReducer(loaded, { type: 'undo' }), { type: 'redo' }).present).toEqual(third);
  });
  it('can undo clearing the form', () => {
    const cleared = historyReducer(initialHistory(second), { type:'clear', cv:first });
    expect(historyReducer(cleared, { type:'undo' }).present).toEqual(second);
  });
});
