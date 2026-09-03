/**
 * `ResultPromise<T, E>` wraps a `Promise<Result<T, E>>` and is itself
 * awaitable: `await`ing one yields a {@link Result}. It provides the same fluent
 * methods as {@link Result} (`.map`, `.andThen`, `.orElse`, `.match`, …) before
 * the value settles, and does not reject — a failure is carried as an `Err`.
 *
 * ```ts
 * ResultPromise.fromPromise(fetch(url), toNetworkError)
 *   .andThen(readJson)          // fn may itself return a ResultPromise
 *   .map((body) => body.items)
 *   .unwrapOr([]);              // awaited: Promise<Item[]>
 * ```
 *
 * The async counterpart to {@link Result}: every method there has one here.
 *
 * @module result/result-promise
 * @author William Wu
 */

import type { Option } from "../core/option";
import type { Maybe } from "../core/maybe";
import { ok, err, parseError, ResultBase, type Result } from "./result";

/** Anything that settles to a {@link Result} — the input a chain step may return. */
export type Awaitable<T, E> = Result<T, E> | ResultPromise<T, E> | Promise<Result<T, E>>;

/**
 * A pending {@link Result}. Implements `PromiseLike`, so it is `await`-able and
 * composes with `Promise.all` and friends.
 *
 * @template T The value type carried on success.
 * @template E The error type carried on failure.
 */
export class ResultPromise<T, E> implements PromiseLike<Result<T, E>> {
  readonly #inner: Promise<Result<T, E>>;

  private constructor(inner: Promise<Result<T, E>>) {
    this.#inner = inner;
  }

  /* ---------------------------------------------------------------------- */
  /*  Construction                                                          */
  /* ---------------------------------------------------------------------- */

  /** Wrap an existing `Promise<Result>`. */
  static fromPromiseResult<T, E>(inner: Promise<Result<T, E>>): ResultPromise<T, E> {
    return new ResultPromise(inner);
  }

  /** Lift a settled {@link Result} into the async world. */
  static fromResult<T, E>(result: Result<T, E>): ResultPromise<T, E> {
    return new ResultPromise(Promise.resolve(result));
  }

  /** A resolved success. */
  static ok<T, E = never>(value: T): ResultPromise<T, E> {
    return new ResultPromise(Promise.resolve(ok<T, E>(value)));
  }

  /** A resolved failure. */
  static err<E, T = never>(error: E): ResultPromise<T, E> {
    return new ResultPromise(Promise.resolve(err<E, T>(error)));
  }

  /**
   * Adopt a promise, mapping a rejection into an `Err`. Without `mapErr` a
   * rejection is coerced via {@link parseError}.
   */
  static fromPromise<T, E = Error>(
    promise: PromiseLike<T>,
    mapErr?: (error: unknown) => E,
  ): ResultPromise<T, E> {
    return new ResultPromise(
      Promise.resolve(promise).then(
        (value) => ok<T, E>(value),
        (caught: unknown) => err<E, T>(mapErr ? mapErr(caught) : (parseError(caught) as E)),
      ),
    );
  }

  /**
   * Run an async function now, catching a rejection into an `Err`. Without
   * `mapErr` the caught value is coerced via {@link parseError}. The returned
   * `ResultPromise` resolves; it does not reject.
   */
  static try<T, E = Error>(
    fn: () => PromiseLike<T>,
    mapErr?: (error: unknown) => E,
  ): ResultPromise<T, E> {
    const run = async (): Promise<Result<T, E>> => {
      try {
        return ok<T, E>(await fn());
      } catch (caught) {
        return err<E, T>(mapErr ? mapErr(caught) : (parseError(caught) as E));
      }
    };
    return new ResultPromise(run());
  }

  /**
   * All values if every input succeeds, or the first error (fail fast).
   * Accepts settled `Result`s, `Promise<Result>`s and `ResultPromise`s alike.
   */
  static all<T, E>(items: ReadonlyArray<Awaitable<T, E>>): ResultPromise<Array<T>, E> {
    const run = async (): Promise<Result<Array<T>, E>> => {
      const results = await Promise.all(items.map((item) => Promise.resolve(item)));
      const values: Array<T> = [];
      for (const result of results) {
        if (result.isErr()) return err<E, Array<T>>(result.error);
        values.push(result.value);
      }
      return ok<Array<T>, E>(values);
    };
    return new ResultPromise(run());
  }

  /**
   * Run a series of async steps in order (each awaited before the next),
   * collecting their values or stopping at the first error. A step returns a
   * `Result`, a `ResultPromise`, or a plain value; a plain value is a success.
   * The async counterpart of {@link Result.sequence}.
   */
  static sequence<T, E>(
    steps: ReadonlyArray<() => Awaitable<T, E> | T | Promise<T>>,
  ): ResultPromise<Array<T>, E> {
    return new ResultPromise(
      (async (): Promise<Result<Array<T>, E>> => {
        const values: Array<T> = [];
        for (const step of steps) {
          const produced = await step();
          if (produced instanceof ResultBase) {
            if (produced.isErr()) return err<E, Array<T>>(produced.error);
            values.push(produced.value);
          } else {
            values.push(produced);
          }
        }
        return ok<Array<T>, E>(values);
      })(),
    );
  }

  /**
   * Apply `fn` to each element in parallel, then collect the results, stopping
   * at the first error. The async counterpart of {@link Result.applyAll}.
   */
  static applyAll<A, U, E>(
    args: ReadonlyArray<A>,
    fn: (arg: A) => Awaitable<U, E>,
  ): ResultPromise<Array<U>, E> {
    return new ResultPromise(
      (async (): Promise<Result<Array<U>, E>> => {
        const results = await Promise.all(args.map((arg) => Promise.resolve(fn(arg))));
        const values: Array<U> = [];
        for (const result of results) {
          if (result.isErr()) return err<E, Array<U>>(result.error);
          values.push(result.value);
        }
        return ok<Array<U>, E>(values);
      })(),
    );
  }

  /**
   * Flip a `Result` holding a `Promise` into a `ResultPromise`: a rejection of
   * the inner promise becomes an `Err` (coerced via {@link parseError}), which
   * is why the error widens to `E | Error`.
   */
  static fromResultOfPromise<T, E>(
    result: Result<Promise<T>, E>,
  ): ResultPromise<T, E | Error> {
    return result.isOk()
      ? ResultPromise.fromPromise(result.value)
      : ResultPromise.err(result.error);
  }

  /** Variadic {@link ResultPromise.all} — the inputs are the arguments. */
  static allResults<T, E>(...items: ReadonlyArray<Awaitable<T, E>>): ResultPromise<Array<T>, E> {
    return ResultPromise.all(items);
  }

  /**
   * All values, or *every* error collected — the non-fail-fast counterpart of
   * {@link ResultPromise.all}. The async {@link Result.allOrErrors}.
   */
  static allOrErrors<T, E>(
    items: ReadonlyArray<Awaitable<T, E>>,
  ): ResultPromise<Array<T>, Array<E>> {
    return new ResultPromise(
      (async (): Promise<Result<Array<T>, Array<E>>> => {
        const results = await Promise.all(items.map((item) => Promise.resolve(item)));
        const values: Array<T> = [];
        const errors: Array<E> = [];
        for (const result of results) {
          if (result.isOk()) values.push(result.value);
          else errors.push(result.error);
        }
        return errors.length > 0 ? err<Array<E>, Array<T>>(errors) : ok<Array<T>, Array<E>>(values);
      })(),
    );
  }

  /**
   * Split the settled inputs into their values and their errors. Resolves to a
   * plain tuple — it cannot fail, so it is not a `ResultPromise`.
   */
  static async partition<T, E>(
    items: ReadonlyArray<Awaitable<T, E>>,
  ): Promise<[Array<T>, Array<E>]> {
    const results = await Promise.all(items.map((item) => Promise.resolve(item)));
    const values: Array<T> = [];
    const errors: Array<E> = [];
    for (const result of results) {
      if (result.isOk()) values.push(result.value);
      else errors.push(result.error);
    }
    return [values, errors];
  }

  /** Just the success values from the settled inputs, errors dropped. */
  static async values<T, E>(items: ReadonlyArray<Awaitable<T, E>>): Promise<Array<T>> {
    const results = await Promise.all(items.map((item) => Promise.resolve(item)));
    const values: Array<T> = [];
    for (const result of results) if (result.isOk()) values.push(result.value);
    return values;
  }

  /** Just the errors from the settled inputs, values dropped. */
  static async errors<T, E>(items: ReadonlyArray<Awaitable<T, E>>): Promise<Array<E>> {
    const results = await Promise.all(items.map((item) => Promise.resolve(item)));
    const errors: Array<E> = [];
    for (const result of results) if (result.isErr()) errors.push(result.error);
    return errors;
  }

  /** Variadic {@link ResultPromise.sequence} — the steps are the arguments. */
  static sequenceResults<T, E>(
    ...steps: ReadonlyArray<() => Awaitable<T, E> | T | Promise<T>>
  ): ResultPromise<Array<T>, E> {
    return ResultPromise.sequence(steps);
  }

  /**
   * Wrap a rejecting async function into one that returns a `ResultPromise`
   * instead — the reusable form of {@link ResultPromise.try}. `parser` turns a
   * caught value into `E`; a `guard` returning `false` re-throws instead of
   * capturing (so that call's `ResultPromise` rejects).
   */
  static tryWithParser<A extends ReadonlyArray<unknown>, T, E>(
    fn: (...args: A) => PromiseLike<T>,
    parser: (error: unknown) => E,
    guard?: (error: unknown) => boolean,
  ): (...args: A) => ResultPromise<T, E> {
    return (...args: A) =>
      new ResultPromise(
        (async (): Promise<Result<T, E>> => {
          try {
            return ok<T, E>(await fn(...args));
          } catch (caught) {
            if (guard && !guard(caught)) throw caught;
            return err<E, T>(parser(caught));
          }
        })(),
      );
  }

  /* ---------------------------------------------------------------------- */
  /*  PromiseLike                                                           */
  /* ---------------------------------------------------------------------- */

  then<A = Result<T, E>, B = never>(
    onfulfilled?: ((value: Result<T, E>) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.#inner.then(onfulfilled, onrejected);
  }

  /* ---------------------------------------------------------------------- */
  /*  Fluent chain                                                          */
  /* ---------------------------------------------------------------------- */

  /** Map the value, leaving an error untouched. `fn` may be async. */
  map<U>(fn: (value: T) => U | Promise<U>): ResultPromise<U, E> {
    return new ResultPromise<U, E>(
      this.#inner.then(async (result): Promise<Result<U, E>> =>
        result.isOk() ? ok<U, E>(await fn(result.value)) : err<E, U>(result.error),
      ),
    );
  }

  /** Map the error, leaving a value untouched. `fn` may be async. */
  mapErr<F>(fn: (error: E) => F | Promise<F>): ResultPromise<T, F> {
    return new ResultPromise<T, F>(
      this.#inner.then(async (result): Promise<Result<T, F>> =>
        result.isErr() ? err<F, T>(await fn(result.error)) : ok<T, F>(result.value),
      ),
    );
  }

  /** Chain a fallible step. `fn` may return a `Result`, a `ResultPromise`, or a promise of one. */
  andThen<U, F>(fn: (value: T) => Awaitable<U, F>): ResultPromise<U, E | F> {
    return new ResultPromise<U, E | F>(
      this.#inner.then(async (result): Promise<Result<U, E | F>> => {
        if (result.isErr()) return err<E | F, U>(result.error);
        return fn(result.value);
      }),
    );
  }

  /** Recover from an error by producing a new (possibly async) `Result`. */
  orElse<U, F>(fn: (error: E) => Awaitable<U, F>): ResultPromise<T | U, F> {
    return new ResultPromise<T | U, F>(
      this.#inner.then(async (result): Promise<Result<T | U, F>> => {
        if (result.isOk()) return ok<T | U, F>(result.value);
        return fn(result.error);
      }),
    );
  }

  /** Map both sides at once. Either handler may be async. */
  mapBoth<U, F>(
    onOk: (value: T) => U | Promise<U>,
    onErr: (error: E) => F | Promise<F>,
  ): ResultPromise<U, F> {
    return new ResultPromise<U, F>(
      this.#inner.then(async (result): Promise<Result<U, F>> =>
        result.isOk() ? ok<U, F>(await onOk(result.value)) : err<F, U>(await onErr(result.error)),
      ),
    );
  }

  /**
   * Run a fallible side effect and keep the original value if it succeeds. Like
   * {@link andThen}, but the value passes through unchanged.
   */
  andThrough<F>(fn: (value: T) => Awaitable<unknown, F>): ResultPromise<T, E | F> {
    return new ResultPromise<T, E | F>(
      this.#inner.then(async (result): Promise<Result<T, E | F>> => {
        if (result.isErr()) return err<E | F, T>(result.error);
        const check = await fn(result.value);
        return check.isErr() ? err<E | F, T>(check.error) : ok<T, E | F>(result.value);
      }),
    );
  }

  /** Turn a value into an error when it fails `predicate`. `predicate` may be async. */
  filter<F>(
    predicate: (value: T) => boolean | Promise<boolean>,
    error: F | ((value: T) => F),
  ): ResultPromise<T, E | F> {
    return new ResultPromise<T, E | F>(
      this.#inner.then(async (result): Promise<Result<T, E | F>> => {
        if (result.isErr()) return err<E | F, T>(result.error);
        if (await predicate(result.value)) return ok<T, E | F>(result.value);
        return err<E | F, T>(
          typeof error === "function" ? (error as (value: T) => F)(result.value) : error,
        );
      }),
    );
  }

  /** Peek at the value without changing the result. `fn` may be async. */
  tap(fn: (value: T) => void | Promise<void>): ResultPromise<T, E> {
    return new ResultPromise<T, E>(
      this.#inner.then(async (result): Promise<Result<T, E>> => {
        if (result.isOk()) await fn(result.value);
        return result;
      }),
    );
  }

  /** Peek at the error without changing the result. `fn` may be async. */
  tapErr(fn: (error: E) => void | Promise<void>): ResultPromise<T, E> {
    return new ResultPromise<T, E>(
      this.#inner.then(async (result): Promise<Result<T, E>> => {
        if (result.isErr()) await fn(result.error);
        return result;
      }),
    );
  }

  /* ---------------------------------------------------------------------- */
  /*  Settling                                                              */
  /* ---------------------------------------------------------------------- */

  /** Await and branch, with handlers that may themselves be async. */
  match<A, B>(
    onOk: (value: T) => A | Promise<A>,
    onErr: (error: E) => B | Promise<B>,
  ): Promise<A | B> {
    return this.#inner.then((result) =>
      result.isOk() ? onOk(result.value) : onErr(result.error),
    );
  }

  /** Await the value, or throw. Reserve for where a failure is a genuine bug. */
  unwrap(message?: string): Promise<T> {
    return this.#inner.then((result) => result.unwrap(message));
  }

  /** Await the error, or throw if this is a success. */
  unwrapErr(message?: string): Promise<E> {
    return this.#inner.then((result) => result.unwrapErr(message));
  }

  /** Await the value, or `fallback`. */
  unwrapOr<U>(fallback: U): Promise<T | U> {
    return this.#inner.then((result) => result.unwrapOr(fallback));
  }

  /** Await the value, or a fallback computed from the error. `fn` may be async. */
  unwrapOrElse<U>(fn: (error: E) => U | Promise<U>): Promise<T | U> {
    return this.#inner.then((result) =>
      result.isOk() ? result.value : fn(result.error),
    );
  }

  /** Await, resolving to the value as an {@link Option} (`null` on failure). */
  toOption(): Promise<Option<T>> {
    return this.#inner.then((result) => result.toOption());
  }

  /** Await, resolving to the error as an {@link Option} (`null` on success). */
  errToOption(): Promise<Option<E>> {
    return this.#inner.then((result) => result.errToOption());
  }

  /** Await, resolving to the value as a {@link Maybe} (`undefined` on failure). */
  toMaybe(): Promise<Maybe<T>> {
    return this.#inner.then((result) => result.toMaybe());
  }

  /** Await, resolving to `[value, null]` on success or `[null, error]` on failure. */
  toTuple(): Promise<[T, null] | [null, E]> {
    return this.#inner.then((result) => result.toTuple());
  }
}
