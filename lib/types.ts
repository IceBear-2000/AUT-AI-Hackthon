// SHARED CONTRACT — do not edit without telling the other two tracks.
// See PROJECT_SPEC.md Section 4.

export type CropType = "grape" | "apple";

export interface DroneEvent {
  id: string;
  timestamp: string; // ISO 8601
  lat: number;
  lng: number;
  imageUrl: string;
  cropType: CropType;
}

export interface Diagnosis {
  condition: string; // e.g. "Grape Black Rot" or "Healthy"
  confidence: number; // 0-1
  suggestedTreatment: string;
}

export type TicketStatus =
  | "new"
  | "approved"
  | "edited"
  | "rejected"
  | "completed";

export interface Ticket {
  id: string;
  droneEventId: string;
  lat: number;
  lng: number;
  imageUrl: string;
  cropType: CropType;
  diagnosis: Diagnosis;
  status: TicketStatus;
  farmerNotes?: string;
  assignedTo: "farmer" | "drone" | null;
  createdAt: string;
  updatedAt: string;
}
