import type { CVData } from '../types';
import { API_URL } from '../api';
import { downloadBlob } from './download';
export async function downloadPdf(cv: CVData, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cv }) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  downloadBlob(await res.blob(), filename);
}
