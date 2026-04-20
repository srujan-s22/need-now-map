import { db, hasFirebaseConfig } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState } from "@/components/shared/EmptyState";

interface IncidentPageProps {
  params: {
    id: string;
  };
}

// NextJS 15 async params
export default async function IncidentPage({ params }: IncidentPageProps) {
  const { id } = await params;

  let incident: any = null;

  if (hasFirebaseConfig && db) {
    try {
      const docSnap = await getDoc(doc(db, "incidents", id));
      if (docSnap.exists()) {
        incident = { id: docSnap.id, ...docSnap.data() };
      }
    } catch (err) {
      console.error("Failed to fetch incident:", err);
    }
  }

  if (!incident) {
    return <EmptyState title="Incident Not Found" description="The requested incident could not be located in the database." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <SeverityBadge zone={incident.zone} />
        <h1 className="text-3xl font-bold tracking-tight">{incident.title}</h1>
        <p className="text-muted-foreground">{incident.description}</p>
      </div>
      
      <div className="p-6 rounded-xl border border-border bg-card">
        <h2 className="font-semibold text-lg mb-4">Location Details</h2>
        <div className="text-sm space-y-2">
          <p><span className="text-muted-foreground">Location:</span> {incident.location || "Not specified"}</p>
          <p><span className="text-muted-foreground">Coordinates:</span> {incident.lat && incident.lng ? `${incident.lat}, ${incident.lng}` : "Not available"}</p>
        </div>
      </div>
    </div>
  );
}
