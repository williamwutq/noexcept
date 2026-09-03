/**
 * `Result<T, E>` — a value or an error, as a discriminated union of two wrapper
 * objects: {@link Ok} holding a value of `T`, or {@link Err} holding an error of
 * `E`. Unlike {@link Option}, it carries an error value on the failure side.
 *
 * ```ts
 * parseConfig(text)
 *   .andThen(validate)
 *   .map((cfg) => cfg.port)
 *   .unwrapOr(8080);
 * ```
 *
 * No method throws. Each returns another `Result`, and chaining widens `E` to
 * the union of every step's error type.
 *
 * Instance methods handle the fluent chain; static combinators
 * ({@link Result.all}, {@link Result.fromThrowable}, …) and bridges to
 * {@link Option} and {@link Maybe} are on the {@link Result} namespace.
 *
 * @module result/result
 * @author William Wu
 */

import type { Option } from "../core/option";
import type { Maybe } from "../core/maybe";
import { ResultPromise } from "./result-promise";

/**
 * Coerce an unknown thrown value into an `Error`; the default error mapper for
 * the `try` combinators. Existing `Error`s pass through unchanged; other values
 * are stringified into the message.
 */
export function parseError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (typeof error === "object") {
    // `null` has typeof "object"; JSON.stringify(null) is "null".
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error("[unserializable object]");
    }
  }
  switch (typeof error) {
    case "number":
    case "bigint":
    case "boolean":
    case "symbol":
      return new Error(error.toString());
    case "function":
      return new Error(`[Function ${error.name || "anonymous"}]`);
    default:
      return new Error("undefined");
  }
}

/**
 * Base class for {@link Ok} and {@link Err}. Methods are defined once here in
 * terms of {@link ResultBase.match}, the only member the two variants implement
 * differently.
 *
 * @template T The value type carried on success.
 * @template E The error type carried on failure.
 */
export abstract class ResultBase<T, E> {
  /**
   * Apply `onOk` to the value or `onErr` to the error. Every other method is
   * defined in terms of this one; it is also the public pattern match.
   */
  abstract match<A, B>(onOk: (value: T) => A, onErr: (error: E) => B): A | B;

  /** True, and narrows to {@link Ok}, when this is a success. */
  isOk(): this is Ok<T, E> {
    return this instanceof Ok;
  }

  /** True, and narrows to {@link Err}, when this is a failure. */
  isErr(): this is Err<T, E> {
    return this instanceof Err;
  }

  /** Map the value, leaving an error untouched. */
  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.match<Result<U, E>, Result<U, E>>(
      (value) => ok(fn(value)),
      (error) => err(error),
    );
  }

  /** Map the error, leaving a value untouched. */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return this.match<Result<T, F>, Result<T, F>>(
      (value) => ok(value),
      (error) => err(fn(error)),
    );
  }

  /** Map both sides at once — the two of {@link map} and {@link mapErr} in one pass. */
  mapBoth<U, F>(onOk: (value: T) => U, onErr: (error: E) => F): Result<U, F> {
    return this.match<Result<U, F>, Result<U, F>>(
      (value) => ok(onOk(value)),
      (error) => err(onErr(error)),
    );
  }

  /**
   * Chain a fallible step. `fn` runs only on success and returns its own
   * `Result`; the error type widens to include whatever `fn` can fail with.
   */
  andThen<U, F>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return this.match<Result<U, E | F>, Result<U, E | F>>(
      (value) => fn(value),
      (error) => err(error),
    );
  }

  /**
   * Run a fallible side effect and keep the original value if it succeeds.
   * Like {@link andThen}, but the value passes through unchanged — for a check
   * or a write whose *result* you do not need, only its success.
   */
  andThrough<F>(fn: (value: T) => Result<unknown, F>): Result<T, E | F> {
    return this.match<Result<T, E | F>, Result<T, E | F>>(
      (value) => fn(value).map(() => value),
      (error) => err(error),
    );
  }

  /** Recover from an error by producing a new `Result`. Mirror of {@link andThen}. */
  orElse<U, F>(fn: (error: E) => Result<U, F>): Result<T | U, F> {
    return this.match<Result<T | U, F>, Result<T | U, F>>(
      (value) => ok(value),
      (error) => fn(error),
    );
  }

  /** Turn a value into an error when it fails `predicate`. */
  filter<F>(
    predicate: (value: T) => boolean,
    error: F | ((value: T) => F),
  ): Result<T, E | F> {
    return this.match<Result<T, E | F>, Result<T, E | F>>(
      (value) =>
        predicate(value)
          ? ok(value)
          : err(typeof error === "function" ? (error as (value: T) => F)(value) : error),
      (e) => err(e),
    );
  }

  /** Peek at the value without changing the `Result`. Returns the same `Result`. */
  tap(fn: (value: T) => void): Result<T, E> {
    if (this.isOk()) fn(this.value);
    return this as unknown as Result<T, E>;
  }

  /** Peek at the error without changing the `Result`. Returns the same `Result`. */
  tapErr(fn: (error: E) => void): Result<T, E> {
    if (this.isErr()) fn(this.error);
    return this as unknown as Result<T, E>;
  }

  /** The value, or throw. Reserve for where a failure is a genuine bug. */
  unwrap(message?: string): T {
    return this.match<T, never>(
      (value) => value,
      (error) => {
        const wrapped = parseError(error);
        if (message !== undefined) wrapped.message = `${message}: ${wrapped.message}`;
        throw wrapped;
      },
    );
  }

  /** The error, or throw if this is a success. */
  unwrapErr(message?: string): E {
    return this.match<never, E>(
      (value) => {
        throw new Error(
          message ?? `Called unwrapErr on Ok(${String(value)})`,
        );
      },
      (error) => error,
    );
  }

  /** The value, or `fallback`. */
  unwrapOr<U>(fallback: U): T | U {
    return this.match<T, U>(
      (value) => value,
      () => fallback,
    );
  }

  /** The value, or a fallback computed from the error. */
  unwrapOrElse<U>(fn: (error: E) => U): T | U {
    return this.match<T, U>(
      (value) => value,
      (error) => fn(error),
    );
  }

  /** The value as an {@link Option}: `T` on success, `null` on failure. */
  toOption(): Option<T> {
    return this.match<Option<T>, Option<T>>(
      (value) => value,
      () => null,
    );
  }

  /** The error as an {@link Option}: `E` on failure, `null` on success. */
  errToOption(): Option<E> {
    return this.match<Option<E>, Option<E>>(
      () => null,
      (error) => error,
    );
  }

  /** The value as a {@link Maybe}: `T` on success, `undefined` on failure. */
  toMaybe(): Maybe<T> {
    return this.match<Maybe<T>, Maybe<T>>(
      (value) => value,
      () => undefined,
    );
  }

  /** Go-style destructuring: `[value, null]` on success, `[null, error]` on failure. */
  toTuple(): [T, null] | [null, E] {
    return this.match<[T, null], [null, E]>(
      (value) => [value, null],
      (error) => [null, error],
    );
  }

  /** Wrap in a {@link ResultPromise} for the async chain. */
  toPromise(): ResultPromise<T, E> {
    return ResultPromise.fromResult(this as unknown as Result<T, E>);
  }

  /**
   * Map the value with an async function, producing a {@link ResultPromise}.
   * Like {@link ResultBase.map}, this trusts `fn` not to fail; for a step that
   * can fail, use {@link ResultBase.asyncAndThen}.
   */
  asyncMap<U>(fn: (value: T) => Promise<U>): ResultPromise<U, E> {
    return this.match<ResultPromise<U, E>, ResultPromise<U, E>>(
      (value) => ResultPromise.fromPromiseResult(fn(value).then((mapped) => ok<U, E>(mapped))),
      (error) => ResultPromise.err(error),
    );
  }

  /** Chain an async fallible step, producing a {@link ResultPromise}. */
  asyncAndThen<U, F>(
    fn: (value: T) => ResultPromise<U, F> | Promise<Result<U, F>>,
  ): ResultPromise<U, E | F> {
    return this.match<ResultPromise<U, E | F>, ResultPromise<U, E | F>>(
      (value) => ResultPromise.fromPromiseResult(Promise.resolve(fn(value))),
      (error) => ResultPromise.err(error),
    );
  }
}

/**
 * The success variant, carrying a `value`.
 *
 * @template T The value type.
 * @template E The error type this success could have carried (usually inferred).
 */
export class Ok<T, E> extends ResultBase<T, E> {
  constructor(readonly value: T) {
    super();
  }

  override match<A, B>(onOk: (value: T) => A, _onErr: (error: E) => B): A | B {
    return onOk(this.value);
  }
}

/**
 * The failure variant, carrying an `error`.
 *
 * @template T The value type this failure could have carried (usually inferred).
 * @template E The error type.
 */
export class Err<T, E> extends ResultBase<T, E> {
  constructor(readonly error: E) {
    super();
  }

  override match<A, B>(_onOk: (value: T) => A, onErr: (error: E) => B): A | B {
    return onErr(this.error);
  }
}

/**
 * A `Result` is exactly one of its two variants. Written as a union so a guard
 * (`if (r.isOk())`) narrows to the variant whose field — `value` or `error` —
 * is then safe to read directly.
 *
 * @template T The value type carried on success.
 * @template E The error type carried on failure.
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

/** Construct a success. */
export const ok = <T, E = never>(value: T): Result<T, E> => new Ok(value);

/** Construct a failure. */
export const err = <E, T = never>(error: E): Result<T, E> => new Err(error);

/** Values of a fixed-length tuple of `Result`s, preserving positions. */
type UnwrapValues<R extends ReadonlyArray<Result<unknown, unknown>>> = {
  [K in keyof R]: R[K] extends Result<infer T, unknown> ? T : never;
};

/** Errors of a tuple of `Result`s, as a union. */
type UnwrapErrors<R extends ReadonlyArray<Result<unknown, unknown>>> = {
  [K in keyof R]: R[K] extends Result<unknown, infer E> ? E : never;
}[number];

/**
 * The `Result` static namespace: constructors' siblings that operate on
 * `Result`s from the outside — type guards, adapters from throwing or nullable
 * code, and combinators over collections.
 */
export const Result = Object.freeze({
  ok,
  err,

  /** True when `value` is a `Result` (an {@link Ok} or an {@link Err}). */
  is: (value: unknown): value is Result<unknown, unknown> =>
    value instanceof ResultBase,

  /** {@link parseError} — coerce an unknown thrown value into an `Error`. */
  parseError,

  /**
   * Run `fn` now, catching anything it throws into an {@link Err}. Without
   * `mapErr` the caught value is coerced via {@link parseError}. Always returns;
   * it never throws.
   */
  try<T, E = Error>(fn: () => T, mapErr?: (error: unknown) => E): Result<T, E> {
    try {
      return ok(fn());
    } catch (caught) {
      return err(mapErr ? mapErr(caught) : (parseError(caught) as E));
    }
  },

  /**
   * Wrap a throwing function into one that returns a `Result` instead — the
   * reusable form of {@link Result.try} for a function you call more than once.
   * `parser` turns a caught value into the error type `E`.
   *
   * A `guard` narrows *which* throws are caught: when it returns `false` for a
   * caught value, that value is re-thrown rather than captured, so an
   * unexpected failure still surfaces as an exception. (Unlike {@link Result.try},
   * which always catches, this reusable wrapper opts into that behaviour.)
   */
  tryWithParser<A extends ReadonlyArray<unknown>, T, E>(
    fn: (...args: A) => T,
    parser: (error: unknown) => E,
    guard?: (error: unknown) => boolean,
  ): (...args: A) => Result<T, E> {
    return (...args: A) => {
      try {
        return ok(fn(...args));
      } catch (caught) {
        if (guard && !guard(caught)) throw caught;
        return err(parser(caught));
      }
    };
  },

  /** `Ok(value)` when present, otherwise `Err(error)`. Absence is `null`/`undefined`. */
  fromNullable<T, E>(
    value: T,
    error: E | (() => E),
  ): Result<NonNullable<T>, E> {
    return value !== null && value !== undefined
      ? ok(value as NonNullable<T>)
      : err(typeof error === "function" ? (error as () => E)() : error);
  },

  /** Adopt an {@link Option}: its value, or `Err(error)` for `null`. */
  fromOption<T, E>(option: Option<T>, error: E | (() => E)): Result<T, E> {
    return option !== null
      ? ok(option)
      : err(typeof error === "function" ? (error as () => E)() : error);
  },

  /** Adopt a {@link Maybe}: its value, or `Err(error)` for `undefined`. */
  fromMaybe<T, E>(maybe: Maybe<T>, error: E | (() => E)): Result<T, E> {
    return maybe !== undefined
      ? ok(maybe)
      : err(typeof error === "function" ? (error as () => E)() : error);
  },

  /**
   * All values if every `Result` is a success, or the first error (fail fast).
   * Preserves tuple positions, so `[Result<A,_>, Result<B,_>]` yields
   * `Result<[A, B], _>`.
   */
  all<R extends ReadonlyArray<Result<unknown, unknown>>>(
    results: readonly [...R],
  ): Result<UnwrapValues<R>, UnwrapErrors<R>> {
    const values: Array<unknown> = [];
    for (const result of results) {
      if (result.isErr()) return err(result.error) as Result<UnwrapValues<R>, UnwrapErrors<R>>;
      values.push(result.value);
    }
    return ok(values as UnwrapValues<R>);
  },

  /** Variadic {@link Result.all} — the same, but the `Result`s are the arguments. */
  allResults<R extends ReadonlyArray<Result<unknown, unknown>>>(
    ...results: [...R]
  ): Result<UnwrapValues<R>, UnwrapErrors<R>> {
    return Result.all(results);
  },

  /** All values, or *every* error collected — the non-fail-fast counterpart of {@link Result.all}. */
  allOrErrors<T, E>(results: ReadonlyArray<Result<T, E>>): Result<Array<T>, Array<E>> {
    const values: Array<T> = [];
    const errors: Array<E> = [];
    for (const result of results) {
      if (result.isOk()) values.push(result.value);
      else errors.push(result.error);
    }
    return errors.length > 0 ? err(errors) : ok(values);
  },

  /** Split a collection into its values and its errors, keeping both. */
  partition<T, E>(results: ReadonlyArray<Result<T, E>>): [Array<T>, Array<E>] {
    const values: Array<T> = [];
    const errors: Array<E> = [];
    for (const result of results) {
      if (result.isOk()) values.push(result.value);
      else errors.push(result.error);
    }
    return [values, errors];
  },

  /** Just the success values from a collection, errors dropped. */
  values<T, E>(results: ReadonlyArray<Result<T, E>>): Array<T> {
    const values: Array<T> = [];
    for (const result of results) if (result.isOk()) values.push(result.value);
    return values;
  },

  /** Just the errors from a collection, values dropped. */
  errors<T, E>(results: ReadonlyArray<Result<T, E>>): Array<E> {
    const errors: Array<E> = [];
    for (const result of results) if (result.isErr()) errors.push(result.error);
    return errors;
  },

  /** Flatten one layer: a `Result` whose value is itself a `Result`. */
  flatten<T, E, F>(result: Result<Result<T, F>, E>): Result<T, E | F> {
    return result.isOk() ? result.value : err(result.error);
  },

  /**
   * Run a series of steps in order, collecting their values or stopping at the
   * first error. A step returns a `Result` or a plain value; a plain value is
   * taken as a success.
   */
  sequence<T, E>(steps: ReadonlyArray<() => Result<T, E> | T>): Result<Array<T>, E> {
    const values: Array<T> = [];
    for (const step of steps) {
      const produced = step();
      if (produced instanceof ResultBase) {
        const result = produced;
        if (result.isErr()) return err(result.error);
        values.push(result.value);
      } else {
        values.push(produced);
      }
    }
    return ok(values);
  },

  /** Variadic {@link Result.sequence} — the steps are the arguments. */
  sequenceResults<T, E>(...steps: ReadonlyArray<() => Result<T, E> | T>): Result<Array<T>, E> {
    return Result.sequence(steps);
  },

  /**
   * Apply `fn` to each element, collecting its values or stopping at the first
   * error — `map` followed by {@link Result.all}, but it stops early.
   *
   * For an async `fn`, see {@link ResultPromise.applyAll}.
   */
  applyAll<A, U, E>(args: ReadonlyArray<A>, fn: (arg: A) => Result<U, E>): Result<Array<U>, E> {
    const values: Array<U> = [];
    for (const arg of args) {
      const result = fn(arg);
      if (result.isErr()) return err(result.error);
      values.push(result.value);
    }
    return ok(values);
  },
});
