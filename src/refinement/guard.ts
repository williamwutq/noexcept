/**
 * The refinement machinery: guards, the parsers derived from them, and the
 * combinators that build both.
 *
 * ## `is` is the trait; `parse` is derived
 *
 * A refinement type is a `{ is, parse }` namespace. The primitive is `is`: a
 * TypeScript type guard, `(value: unknown) => value is T`. Only `is` must be
 * provided.
 *
 * `parse` is derived as `is(value) ? value : null`: on success it returns the
 * input unchanged, otherwise `null`. Because it never transforms the value, it
 * is fully determined by `is` and is not written by hand. A constructor that
 * *does* transform the value (trimming a string, say) is separate, written on
 * its own, and is not part of this machinery.
 *
 * Where the refined type is a {@link Brand}, `is` narrows to the branded type,
 * so the check is enforced at compile time rather than by convention.
 *
 * ## Combinators
 * - {@link Refinement.of} — derive a refinement from an `is` guard
 * - {@link Refinement.brand} — relabel a refinement's output as a {@link Brand}
 * - {@link Refinement.and} / {@link Refinement.or} — intersection / union
 * - {@link Refinement.array} / {@link Refinement.nonEmptyArray} — lists
 * - {@link Refinement.shape} — objects, field by field
 * - {@link Refinement.nullable} / {@link Refinement.optional} — a field's `null` / `undefined`
 * - {@link Refinement.literal} — a union of literal values
 * - {@link Refinement.matches} — a string matching a pattern
 * - {@link Refinement.instanceOf} — an instance of a class
 *
 * @module refinement/guard
 * @author William Wu
 */

import type { Option } from "../core/option";
import type { Brand } from "./nominal";
import type { NonEmptyArray } from "./array";

/**
 * The trait: a type guard over `unknown`. Provide this; the parser derives.
 *
 * @template T The type asserted on success.
 */
export type Guard<T> = (value: unknown) => value is T;

/**
 * A refinement type — the `is` trait paired with the `parse` derived from it.
 *
 * @template T The refined type.
 */
export interface Refinement<T> {
  /** The type guard. */
  readonly is: Guard<T>;
  /** The parser derived from `is`: the value when `is` holds, otherwise `null`. */
  readonly parse: (value: unknown) => Option<T>;
}

/** Anything that yields a guard: a bare {@link Guard}, or a {@link Refinement}. */
export type Spec<T> = Guard<T> | Refinement<T>;

/** The guard behind a spec — the spec itself if it is one, else its `is`. */
const guardOf = <T>(spec: Spec<T>): Guard<T> =>
  typeof spec === "function" ? spec : spec.is;

/** Derive the refinement from its guard. */
const derive = <T>(is: Guard<T>): Refinement<T> => ({
  is,
  parse: (value: unknown): Option<T> => (is(value) ? value : null),
});

/** The type each spec in a tuple guards. */
type SpecValue<S> = S extends Spec<infer T> ? T : never;

/** Fold a union into an intersection — for {@link Refinement.and}'s result type. */
type UnionToIntersection<U> = (U extends unknown ? (arg: U) => void : never) extends (
  arg: infer I,
) => void
  ? I
  : never;

/** The {@link Refinement} combinator namespace. */
export const Refinement = Object.freeze({
  /** Derive a refinement from its `is` guard. */
  of: derive,

  /**
   * Relabel a refinement's output as a {@link Brand}. The runtime check is
   * unchanged; the output type gains the brand. Both the brand name and the base
   * type are required — a base of `unknown` would erase the checked type.
   *
   * @example
   * const Email = Refinement.brand<"Email", string>(Refinement.matches(/^[^@]+@[^@]+$/));
   */
  brand: <B extends string, T>(spec: Spec<T>): Refinement<Brand<T, B>> =>
    derive(guardOf(spec) as Guard<Brand<T, B>>),

  /** Accepts a value only when *every* spec accepts it (intersection). */
  and: <S extends ReadonlyArray<Spec<unknown>>>(
    ...specs: S
  ): Refinement<UnionToIntersection<SpecValue<S[number]>>> => {
    const guards = specs.map(guardOf);
    return derive(
      (value): value is UnionToIntersection<SpecValue<S[number]>> =>
        guards.every((guard) => guard(value)),
    );
  },

  /** Accepts a value when *any* spec accepts it (union); the first to accept wins. */
  or: <S extends ReadonlyArray<Spec<unknown>>>(
    ...specs: S
  ): Refinement<SpecValue<S[number]>> => {
    const guards = specs.map(guardOf);
    return derive(
      (value): value is SpecValue<S[number]> => guards.some((guard) => guard(value)),
    );
  },

  /**
   * A list whose every element accepts `element`; an empty list accepts. Without
   * `element`, any array (`Array<unknown>`).
   */
  array: <T = unknown>(element?: Spec<T>): Refinement<Array<T>> => {
    const guard = element === undefined ? undefined : guardOf(element);
    return derive(
      (value): value is Array<T> =>
        Array.isArray(value) &&
        (guard === undefined || value.every((item: unknown) => guard(item))),
    );
  },

  /**
   * A list of at least one element, every one accepting `element`. Without
   * `element`, any non-empty array (`NonEmptyArray<unknown>`).
   */
  nonEmptyArray: <T = unknown>(element?: Spec<T>): Refinement<NonEmptyArray<T>> => {
    const guard = element === undefined ? undefined : guardOf(element);
    return derive(
      (value): value is NonEmptyArray<T> =>
        Array.isArray(value) &&
        value.length > 0 &&
        (guard === undefined || value.every((item: unknown) => guard(item))),
    );
  },

  /**
   * A plain object accepting each field's spec. Extra fields are ignored; the
   * value comes back unchanged.
   *
   * @example
   * const Point = Refinement.shape({ x: Integer, y: Integer });
   */
  shape: <F extends Record<string, unknown>>(fields: {
    [K in keyof F]: Spec<F[K]>;
  }): Refinement<F> => {
    const entries = Object.entries(fields).map(
      ([key, spec]) => [key, guardOf(spec as Spec<unknown>)] as const,
    );
    return derive((value): value is F => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
      const record = value as Record<string, unknown>;
      for (const [key, guard] of entries) if (!guard(record[key])) return false;
      return true;
    });
  },

  /** A field that may be `null`: accepts `null` or `spec`. */
  nullable: <T>(spec: Spec<T>): Refinement<T | null> => {
    const guard = guardOf(spec);
    return derive((value): value is T | null => value === null || guard(value));
  },

  /** A field that may be absent: accepts `undefined` or `spec`. */
  optional: <T>(spec: Spec<T>): Refinement<T | undefined> => {
    const guard = guardOf(spec);
    return derive((value): value is T | undefined => value === undefined || guard(value));
  },

  /** A union of literal values. */
  literal: <const V extends ReadonlyArray<string | number | boolean | null | undefined>>(
    ...values: V
  ): Refinement<V[number]> => {
    const allowed = new Set<unknown>(values);
    return derive((value): value is V[number] => allowed.has(value));
  },

  /** A string matching `pattern`. */
  matches: (pattern: RegExp): Refinement<string> =>
    derive((value): value is string => typeof value === "string" && pattern.test(value)),

  /** An instance of `ctor`. */
  instanceOf: <T>(ctor: abstract new (...args: never) => T): Refinement<T> =>
    derive((value): value is T => value instanceof ctor),
});
