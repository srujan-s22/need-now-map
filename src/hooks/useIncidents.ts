import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Unsubscribe } from "firebase/firestore";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import { Incident } from "@/types/incident";

// Module-level shared cache & singleton subscription manager
let cachedIncidents: Incident[] = [];
let hasLoadedOnce = false;
let activeListenersCount = 0;
let unsubscribeFirestore: Unsubscribe | null = null;
let teardownTimeout: NodeJS.Timeout | null = null;
let activePollingInterval: NodeJS.Timeout | null = null;
const subscribers = new Set<(incidents: Incident[], loading: boolean) => void>();

function notifySubscribers() {
  subscribers.forEach((callback) => callback(cachedIncidents, !hasLoadedOnce));
}

async function fetchFromApi() {
  try {
    const res = await fetch("/api/incidents");
    if (res.ok) {
      const data = await res.json();
      cachedIncidents = data;
      hasLoadedOnce = true;
      notifySubscribers();
    }
  } catch (err) {
    console.warn("API fetch fallback error:", err);
  }
}

function startSubscription() {
  if (teardownTimeout) {
    clearTimeout(teardownTimeout);
    teardownTimeout = null;
  }

  // Already listening or polling
  if (unsubscribeFirestore || activePollingInterval) {
    return;
  }

  if (!hasFirebaseConfig || !db) {
    fetchFromApi();
    activePollingInterval = setInterval(fetchFromApi, 4000);
    return;
  }

  try {
    const q = query(collection(db, "incidents"), orderBy("updatedAt", "desc"));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        })) as Incident[];

        cachedIncidents = data;
        hasLoadedOnce = true;
        notifySubscribers();
      },
      (err) => {
        console.warn("Firestore snapshot access limited or permissions unavailable; engaging REST sync fallback:", err.message);
        if (unsubscribeFirestore) {
          try {
            unsubscribeFirestore();
          } catch (_) {}
          unsubscribeFirestore = null;
        }
        fetchFromApi();
        if (!activePollingInterval) {
          activePollingInterval = setInterval(fetchFromApi, 4000);
        }
      }
    );
  } catch (e) {
    console.warn("Firestore subscription initiation failed, using REST fallback:", e);
    fetchFromApi();
    if (!activePollingInterval) {
      activePollingInterval = setInterval(fetchFromApi, 4000);
    }
  }
}

function stopSubscription() {
  // Grace period before tearing down the Firestore stream to prevent thrashing during fast navigation/remounts
  teardownTimeout = setTimeout(() => {
    if (activeListenersCount <= 0) {
      if (unsubscribeFirestore) {
        try {
          unsubscribeFirestore();
        } catch (_) {}
        unsubscribeFirestore = null;
      }
      if (activePollingInterval) {
        clearInterval(activePollingInterval);
        activePollingInterval = null;
      }
    }
    teardownTimeout = null;
  }, 1000);
}

/**
 * High-performance React hook for real-time crisis incident telemetry.
 * Leverages a singleton listener with reference counting and debounce teardown
 * to avoid duplicate subscriptions and WebChannel stream race conditions.
 */
export function useIncidents() {
  const [incidentsSource, setIncidentsSource] = useState<Incident[]>(cachedIncidents);
  const [loadingDb, setLoadingDb] = useState(!hasLoadedOnce);

  useEffect(() => {
    activeListenersCount++;

    const updateCallback = (incidents: Incident[], loading: boolean) => {
      setIncidentsSource(incidents);
      setLoadingDb(loading);
    };

    subscribers.add(updateCallback);

    // Initial sync with cached state
    if (cachedIncidents.length > 0) {
      setIncidentsSource(cachedIncidents);
      setLoadingDb(false);
    }

    startSubscription();

    return () => {
      activeListenersCount--;
      subscribers.delete(updateCallback);
      if (activeListenersCount <= 0) {
        stopSubscription();
      }
    };
  }, []);

  return { incidentsSource, loadingDb };
}
