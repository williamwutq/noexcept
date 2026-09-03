/**
 * `Absent<T>` is `T | null | undefined`: a value that may be missing as either
 * `null` or `undefined`.
 *
 * Where {@link Option} and {@link Maybe} fix one form of absence, `Absent`
 * covers both. Use it for inputs that use either — a parsed JSON field, an
 * optional-and-nullable API value. The guards collapse the two forms; convert to
 * {@link Option} or {@link Maybe} with {@link Absent.toOption} /
 * {@link Absent.toMaybe} to continue on one.
 *
 * @module core/absent
 */

import type { Option } from "./option.js";
import type { Maybe } from "./maybe.js";
import { ok, err, type Result } from "../result/result.js";

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

  /** True when `value` is present *and* passes `predicate`. */
  isPresentAnd: <T>(value: Absent<T>, predicate: (value: T) => boolean): boolean =>
    value !== null && value !== undefined && predicate(value),

  /** True when `value` is absent *or* passes `predicate`. */
  isAbsentOr: <T>(value: Absent<T>, predicate: (value: T) => boolean): boolean =>
    value === null || value === undefined || predicate(value),

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

  /** Map, then flatten — for functions that themselves return an {@link Absent}. */
  andThen: <T, U>(value: Absent<T>, fn: (value: T) => Absent<U>): Absent<U> =>
    value !== null && value !== undefined ? fn(value) : undefined,

  /** Map the value or return `fallback` when absent. */
  mapOr: <T, U>(value: Absent<T>, fallback: U, fn: (value: T) => U): U =>
    value !== null && value !== undefined ? fn(value) : fallback,

  /** Map the value, or compute a default when absent — the lazy {@link Absent.mapOr}. */
  mapOrElse: <T, U>(value: Absent<T>, onAbsent: () => U, onPresent: (value: T) => U): U =>
    value !== null && value !== undefined ? onPresent(value) : onAbsent(),

  /** Keep the value only if `predicate` holds, otherwise absent (as `undefined`). */
  filter: <T>(value: Absent<T>, predicate: (value: T) => boolean): Maybe<T> =>
    value !== null && value !== undefined && predicate(value) ? value : undefined,

  /** Branch on presence with separate handlers. */
  match: <T, R>(value: Absent<T>, onPresent: (value: T) => R, onAbsent: () => R): R =>
    value !== null && value !== undefined ? onPresent(value) : onAbsent(),

  /** Run `fn` on a present value for its side effect; return the value unchanged. */
  tap: <T>(value: Absent<T>, fn: (value: T) => void): Absent<T> => {
    if (value !== null && value !== undefined) fn(value);
    return value;
  },

  /** The first present value, or `undefined` if all are absent. */
  firstPresent: <T>(values: ReadonlyArray<Absent<T>>): Maybe<T> => {
    for (const value of values) {
      if (value !== null && value !== undefined) return value;
    }
    return undefined;
  },

  /** Some `value` when it passes `predicate`, otherwise absent (as `undefined`). */
  fromPredicate: <T>(value: T, predicate: (value: T) => boolean): Maybe<T> =>
    predicate(value) ? value : undefined,

  /** To a {@link Result}: the value as `Ok`, or `Err(error)` when absent. */
  okOr: <T, E>(value: Absent<T>, error: E): Result<T, E> =>
    value !== null && value !== undefined ? ok<T, E>(value) : err<E, T>(error),

  /** To a {@link Result} with a lazily-computed error — the lazy {@link Absent.okOr}. */
  okOrElse: <T, E>(value: Absent<T>, error: () => E): Result<T, E> =>
    value !== null && value !== undefined ? ok<T, E>(value) : err<E, T>(error()),

  /** Collapse both absences to `null` — commit to {@link Option}. */
  toOption: <T>(value: Absent<T>): Option<T> =>
    value !== null && value !== undefined ? value : null,

  /** Collapse both absences to `undefined` — commit to {@link Maybe}. */
  toMaybe: <T>(value: Absent<T>): Maybe<T> =>
    value !== null && value !== undefined ? value : undefined,

  /**
   * Iterator step for {@link Absent.safeTry}: `yield* Absent.safeUnwrap(v)`
   * evaluates to the value, or short-circuits the block to the absent value.
   */
  *safeUnwrap<T>(value: Absent<T>): Generator<null | undefined, T> {
    if (value === null) {
      yield null;
    } else if (value === undefined) {
      yield undefined;
    }
    return value as T;
  },

  /**
   * Run a generator of steps as one `Absent`. Each
   * `yield* Absent.safeUnwrap(v)` evaluates to the value, or short-circuits the
   * block to the absent value; the generator returns the final `Absent`.
   */
  safeTry<T>(block: () => Generator<null | undefined, Absent<T>>): Absent<T> {
    return block().next().value;
  },
});
