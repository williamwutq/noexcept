/**
 * Refined array types.
 *
 * @module refinement/array
 */

import type { Option } from "../core/option";

/**
 * An array with at least one element, expressed structurally as `[T, ...T[]]`
 * rather than with a brand. Under
 * {@link https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess noUncheckedIndexedAccess},
 * `array[0]` is `T` here, versus `T | undefined` on a plain `T[]`.
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

  /** The first element. */
  head: <T>(value: NonEmptyArray<T>): T => value[0],

  /** The elements after the first (possibly empty). */
  tail: <T>(value: NonEmptyArray<T>): Array<T> => value.slice(1),
});
