/**
 * `MaybePromise<T>` — a {@link Maybe} that has not arrived yet.
 *
 * Exactly `Promise<Maybe<T>>`: no wrapper, awaitable straight to `T | undefined`.
 * The async twin of {@link Maybe}'s namespace, and the `undefined`-flavoured
 * counterpart to {@link OptionPromise}.
 *
 * @module core/maybe-promise
 */

import { Maybe } from "./maybe";
import type { Option } from "./option";
import type { OptionPromise } from "./option-promise";
import { ResultPromise } from "../result/result-promise";

/**
 * A promise of a {@link Maybe} — the async form of `T | undefined`.
 *
 * @template T The type carried when present.
 */
export type MaybePromise<T> = Promise<Maybe<T>>;

/** Anything that settles to a {@link Maybe} — the input a chain step may return. */
type Awaitable<T> = Maybe<T> | Promise<Maybe<T>>;

/** The {@link MaybePromise} namespace. */
export const MaybePromise = Object.freeze({
  /** A resolved present value. */
  some: <T>(value: T): MaybePromise<T> => Promise.resolve(value),

  /** A resolved absence. */
  none: Promise.resolve(undefined),

  /** Adopt a promise of a {@link Maybe}. */
  fromPromise: <T>(promise: PromiseLike<Maybe<T>>): MaybePromise<T> =>
    Promise.resolve(promise),

  /** From a promise of a nullable value, folding `null` onto `undefined`. */
  fromValue: <T>(promise: PromiseLike<T | null | undefined>): MaybePromise<NonNullable<T>> =>
    Promise.resolve(promise).then((value) => Maybe.fromNullable(value)),

  /** Await, resolving to whether the maybe is present. */
  isSome: <T>(maybe: MaybePromise<T>): Promise<boolean> =>
    maybe.then((value) => value !== undefined),

  /** Await, resolving to whether the maybe is absent. */
  isNone: <T>(maybe: MaybePromise<T>): Promise<boolean> =>
    maybe.then((value) => value === undefined),

  /** Await the value, or throw. */
  unwrap: <T>(maybe: MaybePromise<T>, message?: string): Promise<T> =>
    maybe.then((value) => Maybe.unwrap(value, message)),

  /** Await the value, or `fallback` when absent. */
  unwrapOr: <T>(maybe: MaybePromise<T>, fallback: T): Promise<T> =>
    maybe.then((value) => Maybe.unwrapOr(value, fallback)),

  /** Await the value, or the result of `fn` when absent. `fn` may be async. */
  unwrapOrElse: <T>(maybe: MaybePromise<T>, fn: () => T | Promise<T>): Promise<T> =>
    maybe.then((value) => (value !== undefined ? value : fn())),

  /** Map the value, leaving none untouched. `fn` may be async. */
  map: <T, U>(maybe: MaybePromise<T>, fn: (value: T) => U | Promise<U>): MaybePromise<U> =>
    maybe.then(async (value) => (value !== undefined ? await fn(value) : undefined)),

  /** Map, then flatten — `fn` returns a {@link Maybe} or a promise of one. */
  andThen: <T, U>(maybe: MaybePromise<T>, fn: (value: T) => Awaitable<U>): MaybePromise<U> =>
    maybe.then(async (value) => (value !== undefined ? fn(value) : undefined)),

  /** Map the value or return `fallback` when absent. `fn` may be async. */
  mapOr: <T, U>(maybe: MaybePromise<T>, fallback: U, fn: (value: T) => U | Promise<U>): Promise<U> =>
    maybe.then((value) => (value !== undefined ? fn(value) : fallback)),

  /** Keep the value only if `predicate` holds, otherwise none. `predicate` may be async. */
  filter: <T>(
    maybe: MaybePromise<T>,
    predicate: (value: T) => boolean | Promise<boolean>,
  ): MaybePromise<T> =>
    maybe.then(async (value) =>
      value !== undefined && (await predicate(value)) ? value : undefined,
    ),

  /** Branch on presence with separate (possibly async) handlers. */
  match: <T, R>(
    maybe: MaybePromise<T>,
    onSome: (value: T) => R | Promise<R>,
    onNone: () => R | Promise<R>,
  ): Promise<R> => maybe.then((value) => (value !== undefined ? onSome(value) : onNone())),

  /** Run `fn` on a present value for its side effect; resolve to the maybe unchanged. */
  tap: <T>(maybe: MaybePromise<T>, fn: (value: T) => void | Promise<void>): MaybePromise<T> =>
    maybe.then(async (value) => {
      if (value !== undefined) await fn(value);
      return value;
    }),

  /** This maybe if present, otherwise `other` (which may be a promise). */
  or: <T>(maybe: MaybePromise<T>, other: Awaitable<T>): MaybePromise<T> =>
    maybe.then((value) => (value !== undefined ? value : other)),

  /** This maybe if present, otherwise the result of `fn` — the lazy {@link MaybePromise.or}. */
  orElse: <T>(maybe: MaybePromise<T>, fn: () => Awaitable<T>): MaybePromise<T> =>
    maybe.then((value) => (value !== undefined ? value : fn())),

  /** All values if every maybe is present, otherwise none (fail fast). */
  all: <T>(maybes: ReadonlyArray<Awaitable<T>>): MaybePromise<Array<T>> =>
    Promise.all(maybes.map((maybe) => Promise.resolve(maybe))).then((settled) =>
      Maybe.all(settled),
    ),

  /** Drop the absent maybes, keeping the present values. */
  filterSome: <T>(maybes: ReadonlyArray<Awaitable<T>>): Promise<Array<T>> =>
    Promise.all(maybes.map((maybe) => Promise.resolve(maybe))).then((settled) =>
      Maybe.filterSome(settled),
    ),

  /** The first present maybe, or none if all are absent. */
  firstSome: <T>(maybes: ReadonlyArray<Awaitable<T>>): MaybePromise<T> =>
    Promise.all(maybes.map((maybe) => Promise.resolve(maybe))).then((settled) =>
      Maybe.firstSome(settled),
    ),

  /** To a {@link ResultPromise}: the value as `Ok`, or `Err(error)` when absent. */
  okOr: <T, E>(maybe: MaybePromise<T>, error: E): ResultPromise<T, E> =>
    ResultPromise.fromPromiseResult(maybe.then((value) => Maybe.okOr(value, error))),

  /** To a {@link ResultPromise} with a lazily-computed error — the lazy {@link MaybePromise.okOr}. */
  okOrElse: <T, E>(maybe: MaybePromise<T>, error: () => E): ResultPromise<T, E> =>
    ResultPromise.fromPromiseResult(maybe.then((value) => Maybe.okOrElse(value, error))),

  /** Reinterpret absence as `null` — cross into {@link OptionPromise}'s world. */
  toOption: <T>(maybe: MaybePromise<T>): OptionPromise<T> =>
    maybe.then((value) => Maybe.toOption(value)),

  /** Adopt an {@link OptionPromise}, mapping its `null` absence onto `undefined`. */
  fromOption: <T>(option: Promise<Option<T>>): MaybePromise<T> =>
    option.then((value) => Maybe.fromOption(value)),
});
