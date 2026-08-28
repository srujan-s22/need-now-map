import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import { Incident } from "@/types/incident";

export function useIncidents() {
  const [incidentsSource, setIncidentsSource] = useState<Incident[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchFromApi = async () => {
      try {
        const res = await fetch("/api/incidents");
        if (res.ok && isMounted) {
          const data = await res.json();
          setIncidentsSource(data);
        }
      } catch (err) {
        console.warn("API fetch fallback error:", err);
      } finally {
        if (isMounted) setLoadingDb(false);
      }
    };

    if (!hasFirebaseConfig || !db) {
      fetchFromApi();
      const interval = setInterval(fetchFromApi, 4000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    // Try Firestore realtime listener with automatic fallback to API polling if rules/permissions block it
    let pollingInterval: NodeJS.Timeout | null = null;
    let unsubscribe: (() => void) | null = null;

    try {
      const q = query(collection(db, "incidents"), orderBy("updatedAt", "desc"));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMounted) return;
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          })) as Incident[];

          setIncidentsSource(data);
          setLoadingDb(false);
        },
        (err) => {
          console.warn("Firestore snapshot access limited, falling back to API polling:", err.message);
          fetchFromApi();
          if (!pollingInterval) {
            pollingInterval = setInterval(fetchFromApi, 4000);
          }
        }
      );
    } catch (e) {
      console.warn("Firestore subscription failed, falling back to API:", e);
      fetchFromApi();
      pollingInterval = setInterval(fetchFromApi, 4000);
    }

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  return { incidentsSource, loadingDb };
}
