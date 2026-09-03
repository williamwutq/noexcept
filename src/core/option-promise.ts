/**
 * `OptionPromise<T>` is `Promise<Option<T>>`: the async form of {@link Option}.
 *
 * No wrapper — awaitable to `T | null`, and interchangeable with any promise of
 * a nullable. The namespace is the async twin of {@link Option}'s: each
 * combinator takes the promise as its first argument and returns another
 * promise.
 *
 * ```ts
 * await OptionPromise.unwrapOr(
 *   OptionPromise.map(loadUser(id), (u) => u.name),
 *   "anonymous",
 * );
 * ```
 *
 * The bare-promise counterpart to {@link ResultPromise}, matching {@link Option}
 * being a bare union.
 *
 * @module core/option-promise
 */

import { Option } from "./option";
import type { Maybe } from "./maybe";
import type { MaybePromise } from "./maybe-promise";
import { ResultPromise } from "../result/result-promise";

/**
 * A promise of an {@link Option} — the async form of `T | null`.
 *
 * @template T The type carried when present.
 */
export type OptionPromise<T> = Promise<Option<T>>;

/** Anything that settles to an {@link Option} — the input a chain step may return. */
type Awaitable<T> = Option<T> | Promise<Option<T>>;

/** The {@link OptionPromise} namespace. */
export const OptionPromise = Object.freeze({
  /** A resolved present value. */
  some: <T>(value: T): OptionPromise<T> => Promise.resolve(value),

  /** A resolved absence. */
  none: Promise.resolve(null),

  /** Adopt a promise of an {@link Option}. */
  fromPromise: <T>(promise: PromiseLike<Option<T>>): OptionPromise<T> =>
    Promise.resolve(promise),

  /** From a promise of a nullable value, folding `undefined` onto `null`. */
  fromValue: <T>(promise: PromiseLike<T | null | undefined>): OptionPromise<NonNullable<T>> =>
    Promise.resolve(promise).then((value) => Option.fromNullable(value)),

  /** Await, resolving to whether the option is present. */
  isSome: <T>(option: OptionPromise<T>): Promise<boolean> =>
    option.then((value) => value !== null),

  /** Await, resolving to whether the option is absent. */
  isNone: <T>(option: OptionPromise<T>): Promise<boolean> =>
    option.then((value) => value === null),

  /** Await the value, or throw. */
  unwrap: <T>(option: OptionPromise<T>, message?: string): Promise<T> =>
    option.then((value) => Option.unwrap(value, message)),

  /** Await the value, or `fallback` when absent. */
  unwrapOr: <T>(option: OptionPromise<T>, fallback: T): Promise<T> =>
    option.then((value) => Option.unwrapOr(value, fallback)),

  /** Await the value, or the result of `fn` when absent. `fn` may be async. */
  unwrapOrElse: <T>(option: OptionPromise<T>, fn: () => T | Promise<T>): Promise<T> =>
    option.then((value) => (value !== null ? value : fn())),

  /** Map the value, leaving none untouched. `fn` may be async. */
  map: <T, U>(option: OptionPromise<T>, fn: (value: T) => U | Promise<U>): OptionPromise<U> =>
    option.then(async (value) => (value !== null ? await fn(value) : null)),

  /** Map, then flatten — `fn` returns an {@link Option} or a promise of one. */
  andThen: <T, U>(option: OptionPromise<T>, fn: (value: T) => Awaitable<U>): OptionPromise<U> =>
    option.then(async (value) => (value !== null ? fn(value) : null)),

  /** Map the value or return `fallback` when absent. `fn` may be async. */
  mapOr: <T, U>(option: OptionPromise<T>, fallback: U, fn: (value: T) => U | Promise<U>): Promise<U> =>
    option.then((value) => (value !== null ? fn(value) : fallback)),

  /** Keep the value only if `predicate` holds, otherwise none. `predicate` may be async. */
  filter: <T>(
    option: OptionPromise<T>,
    predicate: (value: T) => boolean | Promise<boolean>,
  ): OptionPromise<T> =>
    option.then(async (value) => (value !== null && (await predicate(value)) ? value : null)),

  /** Branch on presence with separate (possibly async) handlers. */
  match: <T, R>(
    option: OptionPromise<T>,
    onSome: (value: T) => R | Promise<R>,
    onNone: () => R | Promise<R>,
  ): Promise<R> => option.then((value) => (value !== null ? onSome(value) : onNone())),

  /** Run `fn` on a present value for its side effect; resolve to the option unchanged. */
  tap: <T>(option: OptionPromise<T>, fn: (value: T) => void | Promise<void>): OptionPromise<T> =>
    option.then(async (value) => {
      if (value !== null) await fn(value);
      return value;
    }),

  /** This option if present, otherwise `other` (which may be a promise). */
  or: <T>(option: OptionPromise<T>, other: Awaitable<T>): OptionPromise<T> =>
    option.then((value) => (value !== null ? value : other)),

  /** This option if present, otherwise the result of `fn` — the lazy {@link OptionPromise.or}. */
  orElse: <T>(option: OptionPromise<T>, fn: () => Awaitable<T>): OptionPromise<T> =>
    option.then((value) => (value !== null ? value : fn())),

  /** All values if every option is present, otherwise none (fail fast). */
  all: <T>(options: ReadonlyArray<Awaitable<T>>): OptionPromise<Array<T>> =>
    Promise.all(options.map((option) => Promise.resolve(option))).then((settled) =>
      Option.all(settled),
    ),

  /** Drop the absent options, keeping the present values. */
  filterSome: <T>(options: ReadonlyArray<Awaitable<T>>): Promise<Array<T>> =>
    Promise.all(options.map((option) => Promise.resolve(option))).then((settled) =>
      Option.filterSome(settled),
    ),

  /** The first present option, or none if all are absent. */
  firstSome: <T>(options: ReadonlyArray<Awaitable<T>>): OptionPromise<T> =>
    Promise.all(options.map((option) => Promise.resolve(option))).then((settled) =>
      Option.firstSome(settled),
    ),

  /** To a {@link ResultPromise}: the value as `Ok`, or `Err(error)` when absent. */
  okOr: <T, E>(option: OptionPromise<T>, error: E): ResultPromise<T, E> =>
    ResultPromise.fromPromiseResult(option.then((value) => Option.okOr(value, error))),

  /** To a {@link ResultPromise} with a lazily-computed error — the lazy {@link OptionPromise.okOr}. */
  okOrElse: <T, E>(option: OptionPromise<T>, error: () => E): ResultPromise<T, E> =>
    ResultPromise.fromPromiseResult(option.then((value) => Option.okOrElse(value, error))),

  /** Reinterpret absence as `undefined` — cross into {@link MaybePromise}'s world. */
  toMaybe: <T>(option: OptionPromise<T>): MaybePromise<T> =>
    option.then((value) => Option.toMaybe(value)),

  /** Adopt a {@link MaybePromise}, mapping its `undefined` absence onto `null`. */
  fromMaybe: <T>(maybe: Promise<Maybe<T>>): OptionPromise<T> =>
    maybe.then((value) => Option.fromMaybe(value)),

  /**
   * Async iterator step for {@link OptionPromise.safeTry}: in an `async function*`
   * block, `yield* OptionPromise.safeUnwrap(op)` awaits and evaluates to the
   * value, or short-circuits the block to `null`.
   */
  async *safeUnwrap<T>(option: OptionPromise<T>): AsyncGenerator<null, T> {
    const settled = await option;
    if (settled === null) {
      yield null;
    }
    return settled as T;
  },

  /**
   * Async do-notation. Each `yield* OptionPromise.safeUnwrap(op)` (or a sync
   * `yield* Option.safeUnwrap(opt)`) evaluates to the value, or short-circuits
   * the block to `null`; the block returns the final `Option` or `OptionPromise`.
   */
  safeTry<T>(
    block: () => AsyncGenerator<null, Option<T> | OptionPromise<T>>,
  ): OptionPromise<T> {
    return (async (): Promise<Option<T>> => (await block().next()).value)();
  },
});
