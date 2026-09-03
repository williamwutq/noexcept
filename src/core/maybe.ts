/**
 * `Maybe<T>` — a value or its absence spelled `undefined`.
 *
 * The counterpart to {@link Option}: same idea, different absence. `undefined`
 * is the shape JavaScript reaches for when something was never set — a missing
 * property, an out-of-range index, a parameter left off — so `Maybe` is the
 * type that meets those at the boundary without a wrapper.
 *
 * @module core/maybe
 * @see Option for `T | null`
 * @see Absent for `T | null | undefined`
 */

import type { Option } from "./option";

/**
 * Either a value of type `T`, or `undefined` for its absence.
 *
 * @template T The type carried when present.
 */
export type Maybe<T> = T | undefined;

/** The {@link Maybe} namespace. */
export const Maybe = Object.freeze({
  /** Wrap a present value. Identity — a some maybe is just the value. */
  some: <T>(value: T): Maybe<T> => value,

  /** The absent maybe. */
  none: undefined,

  /** True when `maybe` holds a value. Narrows away `undefined`. */
  isSome: <T>(maybe: Maybe<T>): maybe is T => maybe !== undefined,

  /** True when `maybe` is absent. */
  isNone: <T>(maybe: Maybe<T>): maybe is undefined => maybe === undefined,

  /** The value, or throw. */
  unwrap: <T>(maybe: Maybe<T>, message?: string): T => {
    if (maybe === undefined) throw new Error(message ?? "Called unwrap on Maybe.none");
    return maybe;
  },

  /** The value, or `fallback` when absent. */
  unwrapOr: <T>(maybe: Maybe<T>, fallback: T): T =>
    maybe !== undefined ? maybe : fallback,

  /** The value, or the result of `fn` when absent. */
  unwrapOrElse: <T>(maybe: Maybe<T>, fn: () => T): T =>
    maybe !== undefined ? maybe : fn(),

  /** Map the value, leaving none untouched. */
  map: <T, U>(maybe: Maybe<T>, fn: (value: T) => U): Maybe<U> =>
    maybe !== undefined ? fn(maybe) : undefined,

  /** Map, then flatten — for functions that themselves return a {@link Maybe}. */
  flatMap: <T, U>(maybe: Maybe<T>, fn: (value: T) => Maybe<U>): Maybe<U> =>
    maybe !== undefined ? fn(maybe) : undefined,

  /** Branch on presence with separate handlers. */
  match: <T, R>(maybe: Maybe<T>, onSome: (value: T) => R, onNone: () => R): R =>
    maybe !== undefined ? onSome(maybe) : onNone(),

  /** Reinterpret absence as `null` — cross into {@link Option}'s world. */
  toOption: <T>(maybe: Maybe<T>): Option<T> =>
    maybe !== undefined ? maybe : null,

  /** Adopt an {@link Option}, mapping its `null` absence onto `undefined`. */
  fromOption: <T>(option: Option<T>): Maybe<T> =>
    option !== null ? option : undefined,
});
