/**
 * `Absent<T>` — a value that may be missing in either of JavaScript's two ways.
 *
 * Where {@link Option} and {@link Maybe} each commit to one spelling of
 * absence, `Absent` covers both `null` and `undefined` at once. It is the type
 * for the untrusted edge — a parsed JSON field, an optional-and-nullable API
 * value — where you have not yet decided, or cannot decide, which absence you
 * were handed. The `is`/`isPresent` guards collapse the two so the rest of your
 * code can go back to caring about just one.
 *
 * @module core/absent
 */

import type { Option } from "./option";
import type { Maybe } from "./maybe";

/**
 * A value of type `T`, or either flavour of absence.
 *
 * @template T The type carried when present.
 */
export type Absent<T> = T | null | undefined;

/** The {@link Absent} namespace. */
export const Absent = Object.freeze({
  /** True when `value` is present (neither `null` nor `undefined`). */
  isPresent: <T>(value: Absent<T>): value is T =>
    value !== null && value !== undefined,

  /** True when `value` is absent in either way. */
  isAbsent: <T>(value: Absent<T>): value is null | undefined =>
    value === null || value === undefined,

  /** The value, or throw. */
  unwrap: <T>(value: Absent<T>, message?: string): T => {
    if (value === null || value === undefined) {
      throw new Error(message ?? "Called unwrap on an absent value");
    }
    return value;
  },

  /** The value, or `fallback` when absent. */
  unwrapOr: <T>(value: Absent<T>, fallback: T): T =>
    value !== null && value !== undefined ? value : fallback,

  /** The value, or the result of `fn` when absent. */
  unwrapOrElse: <T>(value: Absent<T>, fn: () => T): T =>
    value !== null && value !== undefined ? value : fn(),

  /** Map the value, leaving either absence untouched (as `undefined`). */
  map: <T, U>(value: Absent<T>, fn: (value: T) => U): Maybe<U> =>
    value !== null && value !== undefined ? fn(value) : undefined,

  /** Collapse both absences to `null` — commit to {@link Option}. */
  toOption: <T>(value: Absent<T>): Option<T> =>
    value !== null && value !== undefined ? value : null,

  /** Collapse both absences to `undefined` — commit to {@link Maybe}. */
  toMaybe: <T>(value: Absent<T>): Maybe<T> =>
    value !== null && value !== undefined ? value : undefined,
});
