/**
 * Translate specified fields of an object in-place (returns a shallow copy).
 * String fields are translated directly; string-array fields are translated element-wise.
 */
export declare function translateFields<T extends object>(obj: T, fields: string[], lang: string): Promise<T>;
/**
 * Translate fields across an array of objects.
 */
export declare function translateMany<T extends object>(items: T[], fields: string[], lang: string): Promise<T[]>;
//# sourceMappingURL=translation.d.ts.map