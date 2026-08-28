import { NextResponse, NextRequest } from "next/server";
import { db, hasFirebaseConfig } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateMemoryIncident } from "@/lib/memoryStore";
import { isAuthorized } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const authorized = await isAuthorized();
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized access. Admin privileges required." },
        { status: 403 }
      );
    }

    if (!hasFirebaseConfig || !db) {
      updateMemoryIncident(id, body);
      return NextResponse.json({ success: true, mocked: true, ...body });
    }

    const docRef = doc(db, "incidents", id);

    await updateDoc(docRef, {
      ...body,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH Incident Error:", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
