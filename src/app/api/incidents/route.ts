import { NextResponse } from "next/server";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "firebase/firestore";
import { Incident } from "@/types/incident";

import { memoryIncidents, addMemoryIncident } from "@/lib/memoryStore";

export async function GET() {
  if (!hasFirebaseConfig || !db) {
    return NextResponse.json(
      memoryIncidents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    );
  }

  try {
    const q = query(collection(db, "incidents"), orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);

    const incidents = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString() || new Date().toISOString()
    })) as Incident[];

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("GET Incidents Error:", error);
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!hasFirebaseConfig || !db) {
      const newInc = {
        ...payload,
        id: `inc-${Date.now()}`,
        status: "new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      addMemoryIncident(newInc);
      return NextResponse.json(newInc, { status: 201 });
    }

    const docData = {
      ...payload,
      status: "new",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "incidents"), docData);

    return NextResponse.json({ id: docRef.id, ...docData }, { status: 201 });
  } catch (error) {
    console.error("POST Incident Error:", error);
    return NextResponse.json({ error: "Failed to save incident" }, { status: 500 });
  }
}
