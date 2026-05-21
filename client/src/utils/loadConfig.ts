import type { CVData } from '../types';
import type { EmbedPayload, SignatureEnvelope } from './pdfEnhance';

export interface LoadedConfig {
  cv: CVData;
  source: 'json' | 'pdf';
  signature?: SignatureEnvelope;
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
    return { cv: parsed, source: 'json' };
  }

  if (isPdf) {
    const { readEmbeddedPayload } = await import('./pdfEnhance');
    let payload: EmbedPayload | null;
    try { payload = await readEmbeddedPayload(file); }
    catch { throw new ConfigLoadError('bad-pdf', 'Não consegui ler o PDF.'); }
    if (!payload) throw new ConfigLoadError('no-payload', 'Este PDF não tem uma configuração CVeaver embutida.');
    if (!isCV(payload.cv)) throw new ConfigLoadError('wrong-version', 'Configuração embutida não suportada.');
    return { cv: payload.cv, source: 'pdf', signature: payload.signature };
  }

  throw new ConfigLoadError('unknown-type', 'Carrega um ficheiro .json ou .pdf do CVeaver.');
}
