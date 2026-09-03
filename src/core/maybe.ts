/**
 * `Maybe<T>` is `T | undefined`: a value, or `undefined` for its absence.
 *
 * The counterpart to {@link Option}, with `undefined` as the absent case rather
 * than `null`. Use it for missing properties, out-of-range indices, and omitted
 * parameters.
 *
 * @module core/maybe
 * @see Option for `T | null`
 * @see Absent for `T | null | undefined`
 */

import type { Option } from "./option.js";
import { ok, err, type Result } from "../result/result.js";

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

  /** True when `maybe` is present *and* its value passes `predicate`. */
  isSomeAnd: <T>(maybe: Maybe<T>, predicate: (value: T) => boolean): boolean =>
    maybe !== undefined && predicate(maybe),

  /** True when `maybe` is absent *or* its value passes `predicate`. */
  isNoneOr: <T>(maybe: Maybe<T>, predicate: (value: T) => boolean): boolean =>
    maybe === undefined || predicate(maybe),

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
  andThen: <T, U>(maybe: Maybe<T>, fn: (value: T) => Maybe<U>): Maybe<U> =>
    maybe !== undefined ? fn(maybe) : undefined,

  /** Map the value or return `fallback` when absent. */
  mapOr: <T, U>(maybe: Maybe<T>, fallback: U, fn: (value: T) => U): U =>
    maybe !== undefined ? fn(maybe) : fallback,

  /** Map the value, or compute a default when absent — the lazy {@link Maybe.mapOr}. */
  mapOrElse: <T, U>(maybe: Maybe<T>, onNone: () => U, onSome: (value: T) => U): U =>
    maybe !== undefined ? onSome(maybe) : onNone(),

  /** Keep a present value, or fill an absent one with `fn()`. */
  mapNone: <T>(maybe: Maybe<T>, fn: () => T): Maybe<T> =>
    maybe !== undefined ? maybe : fn(),

  /** Keep the value only if `predicate` holds, otherwise none. */
  filter: <T>(maybe: Maybe<T>, predicate: (value: T) => boolean): Maybe<T> =>
    maybe !== undefined && predicate(maybe) ? maybe : undefined,

  /** Branch on presence with separate handlers. */
  match: <T, R>(maybe: Maybe<T>, onSome: (value: T) => R, onNone: () => R): R =>
    maybe !== undefined ? onSome(maybe) : onNone(),

  /** Run `fn` on a present value for its side effect; return the maybe unchanged. */
  tap: <T>(maybe: Maybe<T>, fn: (value: T) => void): Maybe<T> => {
    if (maybe !== undefined) fn(maybe);
    return maybe;
  },

  /** This maybe if present, otherwise `other`. */
  or: <T>(maybe: Maybe<T>, other: Maybe<T>): Maybe<T> =>
    maybe !== undefined ? maybe : other,

  /** This maybe if present, otherwise the result of `fn` — the lazy {@link Maybe.or}. */
  orElse: <T>(maybe: Maybe<T>, fn: () => Maybe<T>): Maybe<T> =>
    maybe !== undefined ? maybe : fn(),

  /** `other` if this maybe is present, otherwise none. */
  and: <T, U>(maybe: Maybe<T>, other: Maybe<U>): Maybe<U> =>
    maybe !== undefined ? other : undefined,

  /** Present only when *exactly one* of the two is present. */
  xor: <T>(a: Maybe<T>, b: Maybe<T>): Maybe<T> => {
    if (a !== undefined && b === undefined) return a;
    if (a === undefined && b !== undefined) return b;
    return undefined;
  },

  /** A pair when both are present, otherwise none. */
  zip: <T, U>(a: Maybe<T>, b: Maybe<U>): Maybe<[T, U]> =>
    a !== undefined && b !== undefined ? [a, b] : undefined,

  /** Combine two present values through `fn`, otherwise none. */
  zipWith: <T, U, R>(a: Maybe<T>, b: Maybe<U>, fn: (a: T, b: U) => R): Maybe<R> =>
    a !== undefined && b !== undefined ? fn(a, b) : undefined,

  /** Split a maybe of a pair into a pair of maybes. */
  unzip: <T, U>(maybe: Maybe<[T, U]>): [Maybe<T>, Maybe<U>] =>
    maybe !== undefined ? [maybe[0], maybe[1]] : [undefined, undefined],

  /** Drop the absent maybes, keeping the present values. */
  filterSome: <T>(maybes: ReadonlyArray<Maybe<T>>): Array<T> => {
    const values: Array<T> = [];
    for (const maybe of maybes) if (maybe !== undefined) values.push(maybe);
    return values;
  },

  /** All values if every maybe is present, otherwise none (fail fast). */
  all: <T>(maybes: ReadonlyArray<Maybe<T>>): Maybe<Array<T>> => {
    const values: Array<T> = [];
    for (const maybe of maybes) {
      if (maybe === undefined) return undefined;
      values.push(maybe);
    }
    return values;
  },

  /** The first present maybe, or none if all are absent. */
  firstSome: <T>(maybes: ReadonlyArray<Maybe<T>>): Maybe<T> => {
    for (const maybe of maybes) if (maybe !== undefined) return maybe;
    return undefined;
  },

  /** Normalise a nullable value into a {@link Maybe}, folding `null` onto `undefined`. */
  fromNullable: <T>(value: T | null | undefined): Maybe<NonNullable<T>> =>
    value ?? undefined,

  /** Some `value` when it passes `predicate`, otherwise none. */
  fromPredicate: <T>(value: T, predicate: (value: T) => boolean): Maybe<T> =>
    predicate(value) ? value : undefined,

  /** To a {@link Result}: the value as `Ok`, or `Err(error)` when absent. */
  okOr: <T, E>(maybe: Maybe<T>, error: E): Result<T, E> =>
    maybe !== undefined ? ok<T, E>(maybe) : err<E, T>(error),

  /** To a {@link Result} with a lazily-computed error — the lazy {@link Maybe.okOr}. */
  okOrElse: <T, E>(maybe: Maybe<T>, error: () => E): Result<T, E> =>
    maybe !== undefined ? ok<T, E>(maybe) : err<E, T>(error()),

  /** Reinterpret absence as `null` — cross into {@link Option}'s world. */
  toOption: <T>(maybe: Maybe<T>): Option<T> =>
    maybe !== undefined ? maybe : null,

  /** Adopt an {@link Option}, mapping its `null` absence onto `undefined`. */
  fromOption: <T>(option: Option<T>): Maybe<T> =>
    option !== null ? option : undefined,

  /**
   * Iterator step for {@link Maybe.safeTry}: `yield* Maybe.safeUnwrap(m)`
   * evaluates to the value, or short-circuits the block to `undefined`.
   */
  *safeUnwrap<T>(maybe: Maybe<T>): Generator<undefined, T> {
    if (maybe === undefined) {
      yield undefined;
    }
    return maybe as T;
  },

  /**
   * Run a generator of steps as one `Maybe`. Each
   * `yield* Maybe.safeUnwrap(m)` evaluates to the value, or short-circuits the
   * block to `undefined`; the generator returns the final `Maybe`.
   */
  safeTry<T>(block: () => Generator<undefined, Maybe<T>>): Maybe<T> {
    const step = block().next();
    return step.done ? step.value : undefined;
  },
});
