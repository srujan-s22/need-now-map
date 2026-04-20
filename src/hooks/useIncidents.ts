import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import { Incident } from "@/types/incident";

export function useIncidents() {
  const [incidentsSource, setIncidentsSource] = useState<Incident[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    if (!hasFirebaseConfig || !db) {
      // No Firebase configured — use the API route (memory-backed, no mocks)
      const fetchFromApi = async () => {
        try {
          const res = await fetch("/api/incidents");
          if (res.ok) {
            const data = await res.json();
            setIncidentsSource(data);
          } else {
            setIncidentsSource([]);
          }
        } catch {
          setIncidentsSource([]);
        } finally {
          setLoadingDb(false);
        }
      };

      fetchFromApi();
      // Poll periodically since we don't have realtime listeners without Firebase
      const interval = setInterval(fetchFromApi, 5000);
      return () => clearInterval(interval);
    }

    // Firebase IS configured — use realtime listener, Firestore only
    const q = query(collection(db, "incidents"), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString(),
        })) as Incident[];

        // Always use Firestore data, even if empty
        setIncidentsSource(data);
        setLoadingDb(false);
      },
      (err) => {
        console.warn("Firestore snapshot failed:", err);
        setIncidentsSource([]);
        setLoadingDb(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { incidentsSource, loadingDb };
}
