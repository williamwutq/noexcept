/**
 * `Option<T>` — a value or its explicit absence, spelled `null`.
 *
 * There is no wrapper object. `Option<T>` *is* `T | null`, so a some value is
 * just the value and none is just `null`. That keeps it free to construct, free
 * to pattern match with a plain `x === null`, and interchangeable with the
 * `T | null` that DOM and JSON APIs already hand you — while the namespace here
 * gives you the combinators that make working with it read like a pipeline
 * instead of a stack of `if`s.
 *
 * `undefined` is deliberately *not* absence here — that is {@link Maybe}'s job.
 * Keeping the two apart lets a value be present-and-null distinctly from
 * uninitialised, which is exactly the distinction a form field cleared to empty
 * needs to survive.
 *
 * @module core/option
 * @see Maybe for `T | undefined`
 * @see Absent for `T | null | undefined`
 */

import type { Maybe } from "./maybe";
import { ok, err, type Result } from "../result/result";

/**
 * Either a value of type `T`, or `null` for its absence.
 *
 * @template T The type carried when present.
 */
export type Option<T> = T | null;

/** The {@link Option} namespace. */
export const Option = Object.freeze({
  /** Wrap a present value. Identity — a some option is just the value. */
  some: <T>(value: T): Option<T> => value,

  /** The absent option. */
  none: null,

  /** True when `option` holds a value. Narrows away `null`. */
  isSome: <T>(option: Option<T>): option is T => option !== null,

  /** True when `option` is absent. */
  isNone: <T>(option: Option<T>): option is null => option === null,

  /** True when `option` is present *and* its value passes `predicate`. */
  isSomeAnd: <T>(option: Option<T>, predicate: (value: T) => boolean): boolean =>
    option !== null && predicate(option),

  /** True when `option` is absent *or* its value passes `predicate`. */
  isNoneOr: <T>(option: Option<T>, predicate: (value: T) => boolean): boolean =>
    option === null || predicate(option),

  /**
   * The value, or throw. Reserve this for the places a none is a genuine bug;
   * everywhere else, {@link Option.unwrapOr} or {@link Option.match} branch
   * without an exception.
   */
  unwrap: <T>(option: Option<T>, message?: string): T => {
    if (option === null) throw new Error(message ?? "Called unwrap on Option.none");
    return option;
  },

  /** The value, or `fallback` when absent. */
  unwrapOr: <T>(option: Option<T>, fallback: T): T =>
    option !== null ? option : fallback,

  /** The value, or the result of `fn` when absent. */
  unwrapOrElse: <T>(option: Option<T>, fn: () => T): T =>
    option !== null ? option : fn(),

  /** Map the value, leaving none untouched. */
  map: <T, U>(option: Option<T>, fn: (value: T) => U): Option<U> =>
    option !== null ? fn(option) : null,

  /** Map, then flatten — for functions that themselves return an {@link Option}. */
  andThen: <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
    option !== null ? fn(option) : null,

  /** Map the value or return `fallback` when absent. */
  mapOr: <T, U>(option: Option<T>, fallback: U, fn: (value: T) => U): U =>
    option !== null ? fn(option) : fallback,

  /** Map the value, or compute a default when absent — the lazy {@link Option.mapOr}. */
  mapOrElse: <T, U>(option: Option<T>, onNone: () => U, onSome: (value: T) => U): U =>
    option !== null ? onSome(option) : onNone(),

  /** Keep a present value, or fill an absent one with `fn()`. */
  mapNone: <T>(option: Option<T>, fn: () => T): Option<T> =>
    option !== null ? option : fn(),

  /** Keep the value only if `predicate` holds, otherwise none. */
  filter: <T>(option: Option<T>, predicate: (value: T) => boolean): Option<T> =>
    option !== null && predicate(option) ? option : null,

  /** Branch on presence with separate handlers. */
  match: <T, R>(option: Option<T>, onSome: (value: T) => R, onNone: () => R): R =>
    option !== null ? onSome(option) : onNone(),

  /** Run `fn` on a present value for its side effect; return the option unchanged. */
  tap: <T>(option: Option<T>, fn: (value: T) => void): Option<T> => {
    if (option !== null) fn(option);
    return option;
  },

  /** This option if present, otherwise `other`. */
  or: <T>(option: Option<T>, other: Option<T>): Option<T> =>
    option !== null ? option : other,

  /** This option if present, otherwise the result of `fn` — the lazy {@link Option.or}. */
  orElse: <T>(option: Option<T>, fn: () => Option<T>): Option<T> =>
    option !== null ? option : fn(),

  /** `other` if this option is present, otherwise none. */
  and: <T, U>(option: Option<T>, other: Option<U>): Option<U> =>
    option !== null ? other : null,

  /** Present only when *exactly one* of the two is present. */
  xor: <T>(a: Option<T>, b: Option<T>): Option<T> => {
    if (a !== null && b === null) return a;
    if (a === null && b !== null) return b;
    return null;
  },

  /** A pair when both are present, otherwise none. */
  zip: <T, U>(a: Option<T>, b: Option<U>): Option<[T, U]> =>
    a !== null && b !== null ? [a, b] : null,

  /** Combine two present values through `fn`, otherwise none. */
  zipWith: <T, U, R>(a: Option<T>, b: Option<U>, fn: (a: T, b: U) => R): Option<R> =>
    a !== null && b !== null ? fn(a, b) : null,

  /** Split an option of a pair into a pair of options. */
  unzip: <T, U>(option: Option<[T, U]>): [Option<T>, Option<U>] =>
    option !== null ? [option[0], option[1]] : [null, null],

  /** Drop the absent options, keeping the present values. */
  filterSome: <T>(options: ReadonlyArray<Option<T>>): Array<T> => {
    const values: Array<T> = [];
    for (const option of options) if (option !== null) values.push(option);
    return values;
  },

  /** All values if every option is present, otherwise none (fail fast). */
  all: <T>(options: ReadonlyArray<Option<T>>): Option<Array<T>> => {
    const values: Array<T> = [];
    for (const option of options) {
      if (option === null) return null;
      values.push(option);
    }
    return values;
  },

  /** The first present option, or none if all are absent. */
  firstSome: <T>(options: ReadonlyArray<Option<T>>): Option<T> => {
    for (const option of options) if (option !== null) return option;
    return null;
  },

  /** Normalise a nullable value into an {@link Option}, folding `undefined` onto `null`. */
  fromNullable: <T>(value: T | null | undefined): Option<NonNullable<T>> =>
    value ?? null,

  /** Some `value` when it passes `predicate`, otherwise none. */
  fromPredicate: <T>(value: T, predicate: (value: T) => boolean): Option<T> =>
    predicate(value) ? value : null,

  /** To a {@link Result}: the value as `Ok`, or `Err(error)` when absent. */
  okOr: <T, E>(option: Option<T>, error: E): Result<T, E> =>
    option !== null ? ok<T, E>(option) : err<E, T>(error),

  /** To a {@link Result} with a lazily-computed error — the lazy {@link Option.okOr}. */
  okOrElse: <T, E>(option: Option<T>, error: () => E): Result<T, E> =>
    option !== null ? ok<T, E>(option) : err<E, T>(error()),

  /** Reinterpret absence as `undefined` — cross into {@link Maybe}'s world. */
  toMaybe: <T>(option: Option<T>): Maybe<T> =>
    option !== null ? option : undefined,

  /** Adopt a {@link Maybe}, mapping its `undefined` absence onto `null`. */
  fromMaybe: <T>(maybe: Maybe<T>): Option<T> =>
    maybe !== undefined ? maybe : null,
});
