import { apiGet, apiPostMultipart } from './client';
import type { AudioNote, AudioNoteDetail, AudioNoteCreateResponse } from '../types/note';

export async function uploadAudioNote(file: File): Promise<AudioNoteCreateResponse> {
  const formData = new FormData();
  formData.append('audio', file);
  return apiPostMultipart<AudioNoteCreateResponse>('/api/notes', formData);
}

export async function listNotes(): Promise<AudioNote[]> {
  return apiGet<AudioNote[]>('/api/notes');
}

export async function getNoteDetail(id: string): Promise<AudioNoteDetail> {
  return apiGet<AudioNoteDetail>(`/api/notes/${id}`);
}

export async function getAudioUrl(id: string): Promise<{ url: string }> {
  return apiGet<{ url: string }>(`/api/notes/${id}/audio`);
}
