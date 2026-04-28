import { Incident } from "@/types/incident";
import { MOCK_INCIDENTS } from "@/data/constants";

// Start with MOCK_INCIDENTS so there's always some data to play with in mock mode
export let memoryIncidents: any[] = [...MOCK_INCIDENTS];

export function updateMemoryIncident(id: string, updates: Partial<Incident>) {
  memoryIncidents = memoryIncidents.map(inc => 
    inc.id === id ? { ...inc, ...updates, updatedAt: new Date().toISOString() } : inc
  );
}

export function addMemoryIncident(incident: any) {
  memoryIncidents = [incident, ...memoryIncidents];
}
