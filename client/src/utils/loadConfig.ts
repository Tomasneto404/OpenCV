import type { CVData } from '../types';

import { API_URL } from '../api';
import { normalizeCV } from '../../../shared/normalizeCV';

export interface LoadedConfig {
  cv: CVData;
  source: 'json' | 'pdf';
}

export type ConfigLoadErrorCode = 'bad-json' | 'bad-pdf' | 'no-payload' | 'wrong-version' | 'unknown-type';

export class ConfigLoadError extends Error {
  code: ConfigLoadErrorCode;
  constructor(code: ConfigLoadErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export async function loadConfigFromFile(file: File): Promise<LoadedConfig> {
  if (file.size > 80 * 1024 * 1024) throw new ConfigLoadError('bad-pdf', 'O ficheiro excede 80 MB.');
  const name = file.name.toLowerCase();
  const isPdf  = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isJson = file.type === 'application/json' || name.endsWith('.json');

  if (isJson) {
    const text = await file.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { throw new ConfigLoadError('bad-json', 'JSON inválido.'); }
    const cv = normalizeCV(parsed);
    if (!cv) throw new ConfigLoadError('wrong-version', 'Versão de configuração não suportada.');
    return { cv, source: 'json' };
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
    if (res.status === 422) {
      const error = await res.json().catch(() => ({}));
      throw new ConfigLoadError('no-payload', typeof error.error === 'string' ? error.error : 'Este PDF não contém dados editáveis OpenCV.');
    }
    if (!res.ok) throw new ConfigLoadError('bad-pdf', `Servidor devolveu ${res.status}.`);
    const body = await res.json() as { cv: unknown };
    const cv = normalizeCV(body.cv);
    if (!cv) throw new ConfigLoadError('wrong-version', 'Configuração não suportada.');
    return {
      cv,
      source: 'pdf',
    };
  }

  throw new ConfigLoadError('unknown-type', 'Carrega um ficheiro .json ou .pdf.');
}
