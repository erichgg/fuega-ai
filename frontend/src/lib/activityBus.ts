/**
 * Global activity bus — any component or the API layer can push events here.
 * The ConsolePanel subscribes and renders them in real time.
 */

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  type: 'api' | 'agent' | 'workflow' | 'action' | 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

type Listener = (entry: ActivityEntry) => void;

let entries: ActivityEntry[] = [];
const listeners = new Set<Listener>();
let idCounter = 0;

function makeId(): string {
  return `act-${++idCounter}-${Date.now()}`;
}

export const activityBus = {
  /** Push a new entry and notify all listeners. */
  push(type: ActivityEntry['type'], title: string, detail?: string) {
    const entry: ActivityEntry = {
      id: makeId(),
      timestamp: new Date(),
      type,
      title,
      detail,
    };
    entries = [entry, ...entries].slice(0, 300);
    listeners.forEach(fn => fn(entry));
    return entry;
  },

  /** Subscribe to new entries. Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Get all entries (newest first). */
  getAll(): ActivityEntry[] {
    return entries;
  },

  /** Clear all entries. */
  clear() {
    entries = [];
  },
};
