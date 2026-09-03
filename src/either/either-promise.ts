/**
 * `EitherPromise<T, A>` wraps a `Promise<Either<T, A>>` and is itself awaitable:
 * `await`ing one yields an {@link Either}. Like {@link Either}, neither side is
 * privileged — every operation comes as a symmetric pair, and
 * {@link EitherPromise.flip} swaps the two. The async twin of {@link Either}, as
 * {@link ResultPromise} is of `Result`.
 *
 * @module either/either-promise
 * @author William Wu
 */

import type { Option } from "../core/option.js";
import type { Result } from "../result/result.js";
import { ResultPromise } from "../result/result-promise.js";
import { main as mkMain, alt as mkAlt, type Either } from "./either.js";

/** Anything that settles to an {@link Either} — the input a chain step may return. */
type Awaitable<T, A> = Either<T, A> | EitherPromise<T, A> | Promise<Either<T, A>>;

/**
 * A pending {@link Either}. Implements `PromiseLike`, so it is `await`-able and
 * composes with `Promise.all` and friends.
 *
 * @template T The type on the main side.
 * @template A The type on the alternative side.
 */
export class EitherPromise<T, A> implements PromiseLike<Either<T, A>> {
  readonly #inner: Promise<Either<T, A>>;

  private constructor(inner: Promise<Either<T, A>>) {
    this.#inner = inner;
  }

  /* ---------------------------------------------------------------------- */
  /*  Construction                                                          */
  /* ---------------------------------------------------------------------- */

  /** Wrap an existing `Promise<Either>`. */
  static fromPromiseEither<T, A>(inner: Promise<Either<T, A>>): EitherPromise<T, A> {
    return new EitherPromise(inner);
  }

  /** Lift a settled {@link Either} into the async world. */
  static fromEither<T, A>(either: Either<T, A>): EitherPromise<T, A> {
    return new EitherPromise(Promise.resolve(either));
  }

  /** A resolved main side. */
  static main<T, A = never>(value: T): EitherPromise<T, A> {
    return new EitherPromise(Promise.resolve(mkMain<T, A>(value)));
  }

  /** A resolved alternative side. */
  static alt<A, T = never>(alternative: A): EitherPromise<T, A> {
    return new EitherPromise(Promise.resolve(mkAlt<A, T>(alternative)));
  }

  /**
   * Choose between two already-started values by a `condition` that depends on
   * neither: `true` takes `left` as the main side, `false` takes `right` as the
   * alternative. `left` and `right` may each be a value or a promise; both are
   * evaluated before the call (neither is a thunk), and only the chosen side is
   * awaited for the result.
   */
  static select<T, A>(
    condition: boolean,
    left: T | Promise<T>,
    right: A | Promise<A>,
  ): EitherPromise<T, A> {
    return new EitherPromise(
      condition
        ? Promise.resolve(left).then((value) => mkMain<T, A>(value))
        : Promise.resolve(right).then((alternative) => mkAlt<A, T>(alternative)),
    );
  }

  /** Swap the two sides — the free-function form of {@link EitherPromise.flip}. */
  static flip<T, A>(either: EitherPromise<T, A>): EitherPromise<A, T> {
    return either.flip();
  }

  /** Adopt a settled or pending {@link Result}: `Ok` becomes main, `Err` the alternative. */
  static fromResult<T, E>(result: Result<T, E> | Promise<Result<T, E>>): EitherPromise<T, E> {
    return new EitherPromise(
      Promise.resolve(result).then((settled) =>
        settled.isOk() ? mkMain<T, E>(settled.value) : mkAlt<E, T>(settled.error),
      ),
    );
  }

  /** Every main value, alternatives dropped. */
  static async values<T, A>(items: ReadonlyArray<Awaitable<T, A>>): Promise<Array<T>> {
    const eithers = await Promise.all(items.map((item) => Promise.resolve(item)));
    const values: Array<T> = [];
    for (const either of eithers) if (either.isMain()) values.push(either.value);
    return values;
  }

  /** Every alternative value, mains dropped. */
  static async alternatives<T, A>(items: ReadonlyArray<Awaitable<T, A>>): Promise<Array<A>> {
    const eithers = await Promise.all(items.map((item) => Promise.resolve(item)));
    const alternatives: Array<A> = [];
    for (const either of eithers) if (either.isAlt()) alternatives.push(either.alternative);
    return alternatives;
  }

  /** Split the settled inputs into their main values and their alternative values. */
  static async partition<T, A>(
    items: ReadonlyArray<Awaitable<T, A>>,
  ): Promise<[Array<T>, Array<A>]> {
    const eithers = await Promise.all(items.map((item) => Promise.resolve(item)));
    const values: Array<T> = [];
    const alternatives: Array<A> = [];
    for (const either of eithers) {
      if (either.isMain()) values.push(either.value);
      else alternatives.push(either.alternative);
    }
    return [values, alternatives];
  }

  /* ---------------------------------------------------------------------- */
  /*  PromiseLike                                                           */
  /* ---------------------------------------------------------------------- */

  then<R = Either<T, A>, S = never>(
    onfulfilled?: ((value: Either<T, A>) => R | PromiseLike<R>) | null,
    onrejected?: ((reason: unknown) => S | PromiseLike<S>) | null,
  ): PromiseLike<R | S> {
    return this.#inner.then(onfulfilled, onrejected);
  }

  /* ---------------------------------------------------------------------- */
  /*  Symmetric chain                                                       */
  /* ---------------------------------------------------------------------- */

  /** Swap the two sides: `EitherPromise<T, A>` becomes `EitherPromise<A, T>`. */
  flip(): EitherPromise<A, T> {
    return new EitherPromise<A, T>(this.#inner.then((either) => either.flip()));
  }

  /** Map the main side, leaving an alternative untouched. `fn` may be async. */
  map<U>(fn: (value: T) => U | Promise<U>): EitherPromise<U, A> {
    return new EitherPromise<U, A>(
      this.#inner.then(async (either): Promise<Either<U, A>> =>
        either.isMain() ? mkMain<U, A>(await fn(either.value)) : mkAlt<A, U>(either.alternative),
      ),
    );
  }

  /** Map the alternative side, leaving a main untouched. `fn` may be async. */
  mapAlt<B>(fn: (alternative: A) => B | Promise<B>): EitherPromise<T, B> {
    return new EitherPromise<T, B>(
      this.#inner.then(async (either): Promise<Either<T, B>> =>
        either.isAlt() ? mkAlt<B, T>(await fn(either.alternative)) : mkMain<T, B>(either.value),
      ),
    );
  }

  /** Map whichever side is present, with a (possibly async) function for each. */
  mapBoth<U, B>(
    onMain: (value: T) => U | Promise<U>,
    onAlt: (alternative: A) => B | Promise<B>,
  ): EitherPromise<U, B> {
    return new EitherPromise<U, B>(
      this.#inner.then(async (either): Promise<Either<U, B>> =>
        either.isMain()
          ? mkMain<U, B>(await onMain(either.value))
          : mkAlt<B, U>(await onAlt(either.alternative)),
      ),
    );
  }

  /** Chain on the main side; the alternative type is preserved. */
  andThen<U>(fn: (value: T) => Awaitable<U, A>): EitherPromise<U, A> {
    return new EitherPromise<U, A>(
      this.#inner.then(async (either): Promise<Either<U, A>> => {
        if (either.isMain()) return fn(either.value);
        return mkAlt<A, U>(either.alternative);
      }),
    );
  }

  /** Chain on the alternative side; the main type is preserved. */
  andThenAlt<B>(fn: (alternative: A) => Awaitable<T, B>): EitherPromise<T, B> {
    return new EitherPromise<T, B>(
      this.#inner.then(async (either): Promise<Either<T, B>> => {
        if (either.isAlt()) return fn(either.alternative);
        return mkMain<T, B>(either.value);
      }),
    );
  }

  /** Peek at a main value without changing the `Either`. `fn` may be async. */
  tap(fn: (value: T) => void | Promise<void>): EitherPromise<T, A> {
    return new EitherPromise<T, A>(
      this.#inner.then(async (either): Promise<Either<T, A>> => {
        if (either.isMain()) await fn(either.value);
        return either;
      }),
    );
  }

  /** Peek at an alternative value without changing the `Either`. `fn` may be async. */
  tapAlt(fn: (alternative: A) => void | Promise<void>): EitherPromise<T, A> {
    return new EitherPromise<T, A>(
      this.#inner.then(async (either): Promise<Either<T, A>> => {
        if (either.isAlt()) await fn(either.alternative);
        return either;
      }),
    );
  }

  /* ---------------------------------------------------------------------- */
  /*  Settling                                                              */
  /* ---------------------------------------------------------------------- */

  /** Await and branch, with (possibly async) handlers for each side. */
  match<R, S>(
    onMain: (value: T) => R | Promise<R>,
    onAlt: (alternative: A) => S | Promise<S>,
  ): Promise<R | S> {
    return this.#inner.then((either) => either.match(onMain, onAlt));
  }

  /** Await the main value, or throw when it settles to an alternative. */
  unwrapMain(message?: string): Promise<T> {
    return this.#inner.then((either) => either.unwrapMain(message));
  }

  /** Await the alternative value, or throw when it settles to a main. */
  unwrapAlt(message?: string): Promise<A> {
    return this.#inner.then((either) => either.unwrapAlt(message));
  }

  /** Await the main value, or `fallback`. */
  mainOr(fallback: T): Promise<T> {
    return this.#inner.then((either) => either.mainOr(fallback));
  }

  /** Await the alternative value, or `fallback`. */
  altOr(fallback: A): Promise<A> {
    return this.#inner.then((either) => either.altOr(fallback));
  }

  /** Await, resolving to the main value as an {@link Option} (`null` otherwise). */
  mainOption(): Promise<Option<T>> {
    return this.#inner.then((either) => either.mainOption());
  }

  /** Await, resolving to the alternative value as an {@link Option} (`null` otherwise). */
  altOption(): Promise<Option<A>> {
    return this.#inner.then((either) => either.altOption());
  }

  /** Read as a {@link ResultPromise}: main as `Ok`, alternative as `Err`. */
  toResult(): ResultPromise<T, A> {
    return ResultPromise.fromPromiseResult(this.#inner.then((either) => either.toResult()));
  }
}
