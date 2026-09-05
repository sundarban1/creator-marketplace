import { en } from './en';
import { ne } from './ne';
import type { BackendDict } from './types';
import { getRequestLanguage } from '../middleware/requestContext';

const DICTS: Record<string, BackendDict> = { en, ne };

// `lang` only needs to be passed explicitly outside a request's async chain
// (a cron job, a script) — inside one, getRequestLanguage() (backed by
// requestContext.ts's AsyncLocalStorage, populated by middleware/language.ts)
// already knows it, so callers deep in services/utils can just call getDict()
// with no argument instead of threading `lang` through every function signature.
export function getDict(lang?: string): BackendDict {
  const resolved = lang ?? getRequestLanguage();
  return DICTS[resolved] || en;
}

export type { BackendDict };
