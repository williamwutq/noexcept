/**
 * `Either<T, A>` — one of two values, with neither side privileged.
 *
 * It looks like {@link Result}, but it is not {@link Result}: `A` is an
 * *alternative*, not an error. Nothing about the alternative side means
 * "failure", so every operation comes as a symmetric pair — {@link Either.map}
 * works the main side, {@link Either.mapAlt} the alternative; {@link Either.andThen}
 * chains on the main, {@link Either.andThenAlt} on the alternative — and
 * {@link Either.flip} swaps the two outright, turning `Either<T, A>` into
 * `Either<A, T>`. Use it for a value that is genuinely one thing *or* another
 * (a cache hit or a fresh fetch, a parsed date or the raw string it came from),
 * where calling one branch "the error" would be a lie.
 *
 * @module either/either
 * @author William Wu
 */

import type { Option } from "../core/option";
import { ok, err, type Result } from "../result/result";

/**
 * The shared behaviour of {@link Main} and {@link Alt}. Every method is written
 * once here in terms of {@link EitherBase.match}, the single point where the two
 * sides differ — which is what keeps the two sides symmetric.
 *
 * @template T The type on the main side.
 * @template A The type on the alternative side.
 */
export abstract class EitherBase<T, A> {
  /** Run `onMain` on a main value, or `onAlt` on an alternative one. */
  abstract match<R, S>(onMain: (value: T) => R, onAlt: (alternative: A) => S): R | S;

  /** True, and narrows to {@link Main}, when this holds the main side. */
  isMain(): this is Main<T, A> {
    return this instanceof Main;
  }

  /** True, and narrows to {@link Alt}, when this holds the alternative side. */
  isAlt(): this is Alt<T, A> {
    return this instanceof Alt;
  }

  /** Swap the two sides: `Either<T, A>` becomes `Either<A, T>`. */
  flip(): Either<A, T> {
    return this.match<Either<A, T>, Either<A, T>>(
      (value) => alt(value),
      (alternative) => main(alternative),
    );
  }

  /** Map the main side, leaving an alternative untouched. */
  map<U>(fn: (value: T) => U): Either<U, A> {
    return this.match<Either<U, A>, Either<U, A>>(
      (value) => main(fn(value)),
      (alternative) => alt(alternative),
    );
  }

  /** Map the alternative side, leaving a main untouched. */
  mapAlt<B>(fn: (alternative: A) => B): Either<T, B> {
    return this.match<Either<T, B>, Either<T, B>>(
      (value) => main(value),
      (alternative) => alt(fn(alternative)),
    );
  }

  /** Map whichever side is present, with a function for each. */
  mapBoth<U, B>(onMain: (value: T) => U, onAlt: (alternative: A) => B): Either<U, B> {
    return this.match<Either<U, B>, Either<U, B>>(
      (value) => main(onMain(value)),
      (alternative) => alt(onAlt(alternative)),
    );
  }

  /** Chain on the main side; the alternative type is preserved. */
  andThen<U>(fn: (value: T) => Either<U, A>): Either<U, A> {
    return this.match<Either<U, A>, Either<U, A>>(
      (value) => fn(value),
      (alternative) => alt(alternative),
    );
  }

  /** Chain on the alternative side; the main type is preserved. */
  andThenAlt<B>(fn: (alternative: A) => Either<T, B>): Either<T, B> {
    return this.match<Either<T, B>, Either<T, B>>(
      (value) => main(value),
      (alternative) => fn(alternative),
    );
  }

  /** Peek at a main value without changing the `Either`. */
  tap(fn: (value: T) => void): Either<T, A> {
    if (this.isMain()) fn(this.value);
    return this as unknown as Either<T, A>;
  }

  /** Peek at an alternative value without changing the `Either`. */
  tapAlt(fn: (alternative: A) => void): Either<T, A> {
    if (this.isAlt()) fn(this.alternative);
    return this as unknown as Either<T, A>;
  }

  /** The main value, or throw when this is an alternative. */
  unwrapMain(message?: string): T {
    return this.match<T, never>(
      (value) => value,
      () => {
        throw new Error(message ?? "Called unwrapMain on an Alt");
      },
    );
  }

  /** The alternative value, or throw when this is a main. */
  unwrapAlt(message?: string): A {
    return this.match<never, A>(
      () => {
        throw new Error(message ?? "Called unwrapAlt on a Main");
      },
      (alternative) => alternative,
    );
  }

  /** The main value, or `fallback`. */
  mainOr(fallback: T): T {
    return this.match<T, T>(
      (value) => value,
      () => fallback,
    );
  }

  /** The alternative value, or `fallback`. */
  altOr(fallback: A): A {
    return this.match<A, A>(
      () => fallback,
      (alternative) => alternative,
    );
  }

  /** The main value as an {@link Option}: `T` on the main side, `null` otherwise. */
  mainOption(): Option<T> {
    return this.match<Option<T>, Option<T>>(
      (value) => value,
      () => null,
    );
  }

  /** The alternative value as an {@link Option}: `A` on the alternative side, `null` otherwise. */
  altOption(): Option<A> {
    return this.match<Option<A>, Option<A>>(
      () => null,
      (alternative) => alternative,
    );
  }

  /**
   * Read as a {@link Result}, taking the main side as `Ok` and the alternative
   * as `Err`. This *assigns* a meaning the `Either` did not have — call
   * {@link EitherBase.flip} first for the other direction.
   */
  toResult(): Result<T, A> {
    return this.match<Result<T, A>, Result<T, A>>(
      (value) => ok(value),
      (alternative) => err(alternative),
    );
  }
}

/**
 * The main side, carrying a `value`.
 *
 * @template T The main type.
 * @template A The alternative type this could have carried (usually inferred).
 */
export class Main<T, A> extends EitherBase<T, A> {
  constructor(readonly value: T) {
    super();
  }

  override match<R, S>(onMain: (value: T) => R, _onAlt: (alternative: A) => S): R | S {
    return onMain(this.value);
  }
}

/**
 * The alternative side, carrying an `alternative`.
 *
 * @template T The main type this could have carried (usually inferred).
 * @template A The alternative type.
 */
export class Alt<T, A> extends EitherBase<T, A> {
  constructor(readonly alternative: A) {
    super();
  }

  override match<R, S>(_onMain: (value: T) => R, onAlt: (alternative: A) => S): R | S {
    return onAlt(this.alternative);
  }
}

/**
 * An `Either` is exactly one of its two sides. Written as a union so a guard
 * (`if (e.isMain())`) narrows to the side whose field — `value` or
 * `alternative` — is then safe to read directly.
 *
 * @template T The type on the main side.
 * @template A The type on the alternative side.
 */
export type Either<T, A> = Main<T, A> | Alt<T, A>;

/** Construct the main side. */
export const main = <T, A = never>(value: T): Either<T, A> => new Main(value);

/** Construct the alternative side. */
export const alt = <A, T = never>(alternative: A): Either<T, A> => new Alt(alternative);

/**
 * The `Either` static namespace: constructors' siblings that operate on
 * `Either`s from the outside — the type guard, the free-function {@link Either.flip},
 * the symmetric collection splitters, and the adapter from {@link Result}.
 */
export const Either = Object.freeze({
  main,
  alt,

  /**
   * Choose between two already-computed values by a `condition` that depends on
   * neither: `true` takes `left` as the main side, `false` takes `right` as the
   * alternative. Both `left` and `right` are ordinary arguments, so both are
   * evaluated before the call — this is a choice between two results, not a lazy
   * branch (for that, see {@link EitherBase.andThen} / {@link Either.main}).
   */
  select: <T, A>(condition: boolean, left: T, right: A): Either<T, A> =>
    condition ? main(left) : alt(right),

  /** True when `value` is an `Either` (a {@link Main} or an {@link Alt}). */
  is: (value: unknown): value is Either<unknown, unknown> => value instanceof EitherBase,

  /** Swap the two sides — the free-function form of {@link EitherBase.flip}. */
  flip: <T, A>(either: Either<T, A>): Either<A, T> => either.flip(),

  /** Every main value, alternatives dropped. */
  values: <T, A>(eithers: ReadonlyArray<Either<T, A>>): Array<T> => {
    const values: Array<T> = [];
    for (const either of eithers) if (either.isMain()) values.push(either.value);
    return values;
  },

  /** Every alternative value, mains dropped. */
  alternatives: <T, A>(eithers: ReadonlyArray<Either<T, A>>): Array<A> => {
    const alternatives: Array<A> = [];
    for (const either of eithers) if (either.isAlt()) alternatives.push(either.alternative);
    return alternatives;
  },

  /** Split a collection into its main values and its alternative values, keeping both. */
  partition: <T, A>(eithers: ReadonlyArray<Either<T, A>>): [Array<T>, Array<A>] => {
    const values: Array<T> = [];
    const alternatives: Array<A> = [];
    for (const either of eithers) {
      if (either.isMain()) values.push(either.value);
      else alternatives.push(either.alternative);
    }
    return [values, alternatives];
  },

  /** Adopt a {@link Result}: `Ok` becomes the main side, `Err` the alternative. */
  fromResult: <T, E>(result: Result<T, E>): Either<T, E> =>
    result.isOk() ? main(result.value) : alt(result.error),
});
