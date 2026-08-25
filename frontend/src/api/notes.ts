import { apiGet, apiPostMultipart, ApiError } from './client';
import type { AudioNote, AudioNoteCreateResponse } from '../types/note';

export async function uploadAudioNote(file: File): Promise<AudioNoteCreateResponse> {
  const formData = new FormData();
  formData.append('audio', file);
  return apiPostMultipart<AudioNoteCreateResponse>('/api/notes', formData);
}

export async function listNotes(): Promise<AudioNote[]> {
  return apiGet<AudioNote[]>('/api/notes');
}

export async function getNote(id: string): Promise<AudioNote> {
  try {
    return await apiGet<AudioNote>(`/api/notes/${id}`);
  } catch (err) {
    if (err instanceof ApiError && (err.message.includes('404') || err.error_code === 'HTTP_ERROR')) {
      // Fallback: search from listNotes if detail endpoint doesn't exist yet on backend
      const allNotes = await listNotes();
      const match = allNotes.find((n) => n.id === id);
      if (match) return match;
    }
    throw err;
  }
}
