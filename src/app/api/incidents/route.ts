import { NextResponse } from "next/server";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Incident } from "@/types/incident";
import { memoryIncidents, addMemoryIncident } from "@/lib/memoryStore";

export async function GET() {
  if (hasFirebaseConfig && db) {
    try {
      const q = query(collection(db, "incidents"), orderBy("updatedAt", "desc"));
      const querySnapshot = await getDocs(q);

      const incidents = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString(),
      })) as Incident[];

      return NextResponse.json(incidents);
    } catch (error) {
      console.warn("Firestore GET failed, falling back to memory store:", error);
    }
  }

  return NextResponse.json(
    [...memoryIncidents].sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    )
  );
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const newMemoryIncident = {
      ...payload,
      id: `inc-${Date.now()}`,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (hasFirebaseConfig && db) {
      try {
        const docData = {
          ...payload,
          status: "new",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "incidents"), docData);
        // Also keep memory store in sync as local fallback
        addMemoryIncident({ ...docData, id: docRef.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        return NextResponse.json({ id: docRef.id, ...docData }, { status: 201 });
      } catch (firestoreError) {
        console.warn("Firestore write failed (falling back to memory storage):", firestoreError);
      }
    }

    addMemoryIncident(newMemoryIncident);
    return NextResponse.json(newMemoryIncident, { status: 201 });
  } catch (error) {
    console.error("POST Incident Error:", error);
    return NextResponse.json({ error: "Failed to save incident" }, { status: 500 });
  }
}
