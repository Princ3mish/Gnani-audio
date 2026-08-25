export type NoteStatus =
  | "UPLOADING"
  | "QUEUED"
  | "TRANSCRIBING"
  | "SUMMARIZING"
  | "COMPLETED"
  | "FAILED";

export interface AudioNote {
  id: string;
  filename: string;
  duration_seconds: number | null;
  status: NoteStatus;
  created_at: string;
}

export interface AudioNoteCreateResponse {
  id: string;
  status: string;
}
