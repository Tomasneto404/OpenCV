/**
 * i18n type contract.
 *
 * The Portuguese dictionary in ./pt.ts is the source-of-truth. Its inferred
 * structure (after `as const`) is "widened" via `Shape<T>` so that other
 * locales can supply any string — not just the literal strings PT happens to
 * use. The structure (keys, nesting) is still enforced.
 *
 * Adding a new key in pt.ts will surface as a TS error in every other locale
 * file until they translate it.
 */
import type { dict as ptDict } from './pt';

export type Locale = 'pt' | 'en' | 'es' | 'fr' | 'de';

/** Recursively widen string literals to `string`; turn readonly tuples into arrays. */
export type Shape<T> = T extends string
  ? string
  : T extends ReadonlyArray<infer U>
    ? Shape<U>[]
    : { [K in keyof T]: Shape<T[K]> };

export type Dict = Shape<typeof ptDict>;

/** Allowed dot-paths into the dictionary. Used by t(path). */
export type TPath = NestedKeyOf<Dict>;

type NestedKeyOf<T> = T extends string
  ? never
  : T extends ReadonlyArray<unknown>
    ? never
    : {
        [K in keyof T & string]: T[K] extends string
          ? `${K}`
          : T[K] extends ReadonlyArray<unknown>
            ? `${K}`
            : `${K}.${NestedKeyOf<T[K]>}`;
      }[keyof T & string];
