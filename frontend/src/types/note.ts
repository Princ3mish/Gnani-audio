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

export interface SummaryDetail {
  summary: string;
  key_points: string[];
  action_items: string[];
}

export interface AudioNoteDetail {
  id: string;
  filename: string;
  duration_seconds: number | null;
  status: NoteStatus;
  transcript: string | null;
  summary: SummaryDetail | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
