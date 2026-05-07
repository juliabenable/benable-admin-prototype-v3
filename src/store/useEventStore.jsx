import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildSeed } from '../domain/seed/index.js';
import { NUDGE_TEMPLATES } from '../domain/seed/templates.js';
import { makeEvent } from '../domain/events.js';

const STORAGE_KEY = 'benable-admin-v3-events-v1';
const EventStoreContext = createContext(null);

// nudgeTemplates contain function bodies and must not round-trip through JSON.
// We persist only the serializable parts of state.
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(state) {
  try {
    const { nudgeTemplates: _omit, ...persistable } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  } catch {
    /* noop */
  }
}

export function EventStoreProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = loadFromStorage();
    if (stored) return { ...stored, nudgeTemplates: NUDGE_TEMPLATES };
    return buildSeed();
  });

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const appendEvent = useCallback((eventInput) => {
    const event = makeEvent(eventInput);
    setState((prev) => ({ ...prev, events: [...prev.events, event] }));
    return event;
  }, []);

  const updateCreator = useCallback((creatorId, patch) => {
    setState((prev) => ({
      ...prev,
      creators: prev.creators.map((c) =>
        c.id === creatorId ? { ...c, ...patch, preferences: { ...c.preferences, ...(patch.preferences ?? {}) } } : c,
      ),
    }));
  }, []);

  const addCreator = useCallback((creator) => {
    setState((prev) => ({
      ...prev,
      creators: [...prev.creators, creator],
    }));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = buildSeed();
    setState(fresh);
    saveToStorage(fresh);
  }, []);

  const value = useMemo(
    () => ({
      events: state.events,
      creators: state.creators,
      campaigns: state.campaigns,
      brands: state.brands ?? [],
      campaignTemplates: state.campaignTemplates ?? [],
      nudgeTemplates: state.nudgeTemplates,
      appendEvent,
      updateCreator,
      addCreator,
      resetDemo,
    }),
    [state, appendEvent, updateCreator, addCreator, resetDemo],
  );

  return <EventStoreContext.Provider value={value}>{children}</EventStoreContext.Provider>;
}

export function useEventStore() {
  const ctx = useContext(EventStoreContext);
  if (!ctx) throw new Error('useEventStore must be used within EventStoreProvider');
  return ctx;
}
