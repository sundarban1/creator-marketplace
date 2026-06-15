import en from './en';
import ne from './ne';

export type Lang = 'en' | 'ne';
export type Translations = typeof en;
export const translations: Record<Lang, Translations> = { en, ne };

export function getString(obj: any, path: string): string {
  const keys = path.split('.');
  let current: any = obj;
  for (const key of keys) {
    if (current == null) return path;
    current = current[key];
  }
  return typeof current === 'string' ? current : path;
}
