/**
 * Load a CV from an uploaded file (JSON or PDF) so the user can edit it.
 *
 * Sessão 22 moved the heavy lifting server-side: a PDF's payload is
 * encrypted, so the client can't extract it on its own. Instead we POST
 * the PDF bytes to /decode-pdf and trust the server's answer.
 */
import type { CVData, CVMeta } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export interface LoadedConfig {
  cv: CVData;
  source: 'json' | 'pdf';
  /** Server-tagged true only when an uploaded PDF passed integrity check. */
  verified?: boolean;
  meta?: CVMeta;
  /** Opaque ciphertext to pass back to /cv when saving the update draft —
   *  preserves editCount/createdAt across the round trip. */
  prevPayloadB64?: string;
}

export type ConfigLoadErrorCode = 'bad-json' | 'bad-pdf' | 'no-payload' | 'wrong-version' | 'unknown-type';

export class ConfigLoadError extends Error {
  code: ConfigLoadErrorCode;
  constructor(code: ConfigLoadErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function isCV(v: unknown): v is CVData {
  return !!v && typeof v === 'object' && (v as { version?: unknown }).version === 1;
}

export async function loadConfigFromFile(file: File): Promise<LoadedConfig> {
  const name = file.name.toLowerCase();
  const isPdf  = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isJson = file.type === 'application/json' || name.endsWith('.json');

  if (isJson) {
    const text = await file.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { throw new ConfigLoadError('bad-json', 'JSON inválido.'); }
    if (!isCV(parsed)) throw new ConfigLoadError('wrong-version', 'Versão de configuração não suportada.');
    return { cv: parsed, source: 'json', verified: true };
  }

  if (isPdf) {
    const buf = await file.arrayBuffer();
    let res: Response;
    try {
      res = await fetch(`${API_URL}/decode-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: buf,
      });
    } catch {
      throw new ConfigLoadError('bad-pdf', 'Não consegui ler o PDF.');
    }
    if (res.status === 422) throw new ConfigLoadError('no-payload', 'Este PDF não é reconhecido.');
    if (!res.ok) throw new ConfigLoadError('bad-pdf', `Servidor devolveu ${res.status}.`);
    const body = await res.json() as { cv: unknown; meta?: CVMeta; verified?: boolean; prevPayloadB64?: string };
    if (!isCV(body.cv)) throw new ConfigLoadError('wrong-version', 'Configuração não suportada.');
    return {
      cv: body.cv,
      source: 'pdf',
      verified: Boolean(body.verified),
      meta: body.meta,
      prevPayloadB64: body.prevPayloadB64,
    };
  }

  throw new ConfigLoadError('unknown-type', 'Carrega um ficheiro .json ou .pdf.');
}
