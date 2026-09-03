/**
 * `AbsentPromise<T>` is `Promise<Absent<T>>`: the async form of {@link Absent}.
 *
 * No wrapper — awaitable to `T | null | undefined`. The async twin of
 * {@link Absent}'s namespace.
 *
 * @module core/absent-promise
 */

import { Absent } from "./absent";
import type { OptionPromise } from "./option-promise";
import type { MaybePromise } from "./maybe-promise";
import { ResultPromise } from "../result/result-promise";

/**
 * A promise of an {@link Absent} — the async form of `T | null | undefined`.
 *
 * @template T The type carried when present.
 */
export type AbsentPromise<T> = Promise<Absent<T>>;

/** Anything that settles to an {@link Absent} — the input a chain step may return. */
type Awaitable<T> = Absent<T> | Promise<Absent<T>>;

/** The {@link AbsentPromise} namespace. */
export const AbsentPromise = Object.freeze({
  /** Adopt a promise of an {@link Absent}. */
  fromPromise: <T>(promise: PromiseLike<Absent<T>>): AbsentPromise<T> =>
    Promise.resolve(promise),

  /** Await, resolving to whether the value is present. */
  isPresent: <T>(value: AbsentPromise<T>): Promise<boolean> =>
    value.then((settled) => settled !== null && settled !== undefined),

  /** Await, resolving to whether the value is absent. */
  isAbsent: <T>(value: AbsentPromise<T>): Promise<boolean> =>
    value.then((settled) => settled === null || settled === undefined),

  /** Await the value, or throw. */
  unwrap: <T>(value: AbsentPromise<T>, message?: string): Promise<T> =>
    value.then((settled) => Absent.unwrap(settled, message)),

  /** Await the value, or `fallback` when absent. */
  unwrapOr: <T>(value: AbsentPromise<T>, fallback: T): Promise<T> =>
    value.then((settled) => Absent.unwrapOr(settled, fallback)),

  /** Await the value, or the result of `fn` when absent. `fn` may be async. */
  unwrapOrElse: <T>(value: AbsentPromise<T>, fn: () => T | Promise<T>): Promise<T> =>
    value.then((settled) => (settled !== null && settled !== undefined ? settled : fn())),

  /** Map the value, leaving either absence untouched (as `undefined`). `fn` may be async. */
  map: <T, U>(value: AbsentPromise<T>, fn: (value: T) => U | Promise<U>): MaybePromise<U> =>
    value.then(async (settled) =>
      settled !== null && settled !== undefined ? await fn(settled) : undefined,
    ),

  /** Map, then flatten — `fn` returns an {@link Absent} or a promise of one. */
  andThen: <T, U>(value: AbsentPromise<T>, fn: (value: T) => Awaitable<U>): AbsentPromise<U> =>
    value.then(async (settled) =>
      settled !== null && settled !== undefined ? fn(settled) : undefined,
    ),

  /** Map the value or return `fallback` when absent. `fn` may be async. */
  mapOr: <T, U>(
    value: AbsentPromise<T>,
    fallback: U,
    fn: (value: T) => U | Promise<U>,
  ): Promise<U> =>
    value.then((settled) => (settled !== null && settled !== undefined ? fn(settled) : fallback)),

  /** Keep the value only if `predicate` holds, otherwise absent (as `undefined`). `predicate` may be async. */
  filter: <T>(
    value: AbsentPromise<T>,
    predicate: (value: T) => boolean | Promise<boolean>,
  ): MaybePromise<T> =>
    value.then(async (settled) =>
      settled !== null && settled !== undefined && (await predicate(settled)) ? settled : undefined,
    ),

  /** Branch on presence with separate (possibly async) handlers. */
  match: <T, R>(
    value: AbsentPromise<T>,
    onPresent: (value: T) => R | Promise<R>,
    onAbsent: () => R | Promise<R>,
  ): Promise<R> =>
    value.then((settled) =>
      settled !== null && settled !== undefined ? onPresent(settled) : onAbsent(),
    ),

  /** Run `fn` on a present value for its side effect; resolve to the value unchanged. */
  tap: <T>(value: AbsentPromise<T>, fn: (value: T) => void | Promise<void>): AbsentPromise<T> =>
    value.then(async (settled) => {
      if (settled !== null && settled !== undefined) await fn(settled);
      return settled;
    }),

  /** The first present value, or `undefined` if all are absent. */
  firstPresent: <T>(values: ReadonlyArray<Awaitable<T>>): MaybePromise<T> =>
    Promise.all(values.map((value) => Promise.resolve(value))).then((settled) =>
      Absent.firstPresent(settled),
    ),

  /** To a {@link ResultPromise}: the value as `Ok`, or `Err(error)` when absent. */
  okOr: <T, E>(value: AbsentPromise<T>, error: E): ResultPromise<T, E> =>
    ResultPromise.fromPromiseResult(value.then((settled) => Absent.okOr(settled, error))),

  /** To a {@link ResultPromise} with a lazily-computed error — the lazy {@link AbsentPromise.okOr}. */
  okOrElse: <T, E>(value: AbsentPromise<T>, error: () => E): ResultPromise<T, E> =>
    ResultPromise.fromPromiseResult(value.then((settled) => Absent.okOrElse(settled, error))),

  /** Collapse both absences to `null` — commit to {@link OptionPromise}. */
  toOption: <T>(value: AbsentPromise<T>): OptionPromise<T> =>
    value.then((settled) => Absent.toOption(settled)),

  /** Collapse both absences to `undefined` — commit to {@link MaybePromise}. */
  toMaybe: <T>(value: AbsentPromise<T>): MaybePromise<T> =>
    value.then((settled) => Absent.toMaybe(settled)),

  /**
   * Async iterator step for {@link AbsentPromise.safeTry}: in an `async function*`
   * block, `yield* AbsentPromise.safeUnwrap(v)` awaits and evaluates to the
   * value, or short-circuits the block to the absent value.
   */
  async *safeUnwrap<T>(value: AbsentPromise<T>): AsyncGenerator<null | undefined, T> {
    const settled = await value;
    if (settled === null) {
      yield null;
    } else if (settled === undefined) {
      yield undefined;
    }
    return settled as T;
  },

  /**
   * Async do-notation. Each `yield* AbsentPromise.safeUnwrap(v)` (or a sync
   * `yield* Absent.safeUnwrap(v)`) evaluates to the value, or short-circuits the
   * block to the absent value; the block returns the final `Absent` or
   * `AbsentPromise`.
   */
  safeTry<T>(
    block: () => AsyncGenerator<null | undefined, Absent<T> | AbsentPromise<T>>,
  ): AbsentPromise<T> {
    return (async (): Promise<Absent<T>> => (await block().next()).value)();
  },
});
