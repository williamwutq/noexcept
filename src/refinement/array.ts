/**
 * Refined array types.
 *
 * @module refinement/array
 */

import type { Option } from "../core/option";

/**
 * An array guaranteed to hold at least one element.
 *
 * Expressed structurally as `[T, ...T[]]` rather than with a brand, because the
 * shape carries real power the compiler acts on: with
 * {@link https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess noUncheckedIndexedAccess}
 * on, `array[0]` on a plain `T[]` is `T | undefined`, but on a `NonEmptyArray`
 * it is `T`. The type does not merely assert non-emptiness, it hands you the
 * first element without a check.
 *
 * @template T The element type.
 */
export type NonEmptyArray<T> = [T, ...Array<T>];

/** The {@link NonEmptyArray} namespace. */
export const NonEmptyArray = Object.freeze({
  /** True when `value` has at least one element. Narrows to {@link NonEmptyArray}. */
  is: <T>(value: ReadonlyArray<T>): value is [T, ...Array<T>] => value.length > 0,

  /** Keep `value` only if it is non-empty, otherwise `null`. */
  parse: <T>(value: Array<T>): Option<NonEmptyArray<T>> =>
    value.length > 0 ? (value as NonEmptyArray<T>) : null,

  /** The guaranteed-present first element of a non-empty array. */
  head: <T>(value: NonEmptyArray<T>): T => value[0],

  /** Every element after the first — possibly empty. */
  tail: <T>(value: NonEmptyArray<T>): Array<T> => value.slice(1),
});
