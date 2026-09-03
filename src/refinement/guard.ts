/**
 * The refinement machinery: guards, the parsers derived from them, and the
 * combinators that build both.
 *
 * ## `is` is the trait; `parse` is derived
 *
 * A refinement type is a `{ is, parse, ... }` namespace. The primitive is `is`:
 * a TypeScript type guard, `(value: unknown) => value is T`. Only `is` (and a
 * `label` for messages) must be provided.
 *
 * `parse` is derived as `is(value) ? value : null`: on success it returns the
 * input unchanged, otherwise `null`. Because it never transforms the value, it
 * is fully determined by `is`. A constructor that *does* transform the value
 * (trimming a string, say) is separate and not part of this machinery.
 *
 * Where the refined type is a {@link Brand}, `is` narrows to the branded type,
 * so the check is enforced at compile time rather than by convention.
 *
 * ## Validation with error paths
 *
 * `parse` answers `null` without saying why. {@link Refinement.decode} instead
 * returns a {@link Result} of the value or a {@link NonEmptyArray} of
 * {@link Issue}s — each an error `message` and the `path` to the value that
 * failed. Structural combinators ({@link Refinement.shape},
 * {@link Refinement.array}, {@link Refinement.record}, {@link Refinement.tuple})
 * recurse and collect *every* issue, so one `decode` reports all bad fields.
 *
 * ## Combinators
 * - {@link Refinement.of} — derive a refinement from an `is` guard (and a label)
 * - {@link Refinement.brand} — relabel a refinement's output as a {@link Brand}
 * - {@link Refinement.and} / {@link Refinement.or} — intersection / union
 * - {@link Refinement.array} / {@link Refinement.nonEmptyArray} — lists
 * - {@link Refinement.shape} — objects with known fields
 * - {@link Refinement.record} — objects of arbitrary keys with one value type
 * - {@link Refinement.tuple} — fixed-length tuples, per position
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
import { ok, err, type Result } from "../result/result";

/**
 * The trait: a type guard over `unknown`. Provide this; the parser derives.
 *
 * @template T The type asserted on success.
 */
export type Guard<T> = (value: unknown) => value is T;

/** A validation failure: the `path` to the value that failed, and why. */
export interface Issue {
  /** The keys and indices from the root to the failing value. */
  readonly path: ReadonlyArray<string | number>;
  /** A human-readable reason. */
  readonly message: string;
}

/** The path a value sits at while being checked. */
type Path = ReadonlyArray<string | number>;

/**
 * A refinement type — the `is` trait, the derived `parse`, and the validation
 * members built on them.
 *
 * @template T The refined type.
 */
export interface Refinement<T> {
  /** The type guard. */
  readonly is: Guard<T>;
  /** The parser derived from `is`: the value when `is` holds, otherwise `null`. */
  readonly parse: (value: unknown) => Option<T>;
  /** A human-readable name, used in {@link Issue} messages. */
  readonly label: string;
  /** Collect the issues in `value` at `path`; an empty array means valid. */
  readonly check: (value: unknown, path: Path) => Array<Issue>;
  /** Validate `value`, collecting every issue with its path. */
  readonly decode: (value: unknown) => Result<T, NonEmptyArray<Issue>>;
}

/** Anything that yields a guard: a bare {@link Guard}, or a {@link Refinement}. */
export type Spec<T> = Guard<T> | Refinement<T>;

/** The type a {@link Refinement} refines — `Infer<typeof User>`. */
export type Infer<R> = R extends Refinement<infer T> ? T : never;

/**
 * Build a refinement from its guard and label, with an optional structural
 * `check` (leaves fall back to a single issue).
 */
const build = <T>(
  is: Guard<T>,
  label: string,
  check?: (value: unknown, path: Path) => Array<Issue>,
): Refinement<T> => {
  const doCheck =
    check ??
    ((value: unknown, path: Path): Array<Issue> =>
      is(value) ? [] : [{ path, message: `expected ${label}` }]);
  return {
    is,
    label,
    parse: (value: unknown): Option<T> => (is(value) ? value : null),
    check: doCheck,
    decode: (value: unknown): Result<T, NonEmptyArray<Issue>> => {
      const issues = doCheck(value, []);
      return issues.length > 0 ? err(issues as NonEmptyArray<Issue>) : ok(value as T);
    },
  };
};

/** A spec as a refinement — a bare guard becomes a leaf refinement labelled "value". */
const refine = <T>(spec: Spec<T>): Refinement<T> =>
  typeof spec === "function" ? build(spec, "value") : spec;

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
  /** Derive a refinement from its `is` guard and an optional `label`. */
  of: <T>(is: Guard<T>, label = "value"): Refinement<T> => build(is, label),

  /**
   * Relabel a refinement's output as a {@link Brand}. The runtime check is
   * unchanged; the output type gains the brand. Both the brand name and the base
   * type are required — a base of `unknown` would erase the checked type. Pass a
   * `label` to name it in {@link Issue} messages; otherwise the inner label is
   * kept.
   *
   * @example
   * const Email = Refinement.brand<"Email", string>(Refinement.matches(/^[^@]+@[^@]+$/), "email");
   */
  brand: <B extends string, T>(spec: Spec<T>, label?: string): Refinement<Brand<T, B>> => {
    const inner = refine(spec);
    return build(inner.is as Guard<Brand<T, B>>, label ?? inner.label, inner.check);
  },

  /** Accepts a value only when *every* spec accepts it (intersection). */
  and: <S extends ReadonlyArray<Spec<unknown>>>(
    ...specs: S
  ): Refinement<UnionToIntersection<SpecValue<S[number]>>> => {
    const refs = specs.map(refine);
    return build(
      (value): value is UnionToIntersection<SpecValue<S[number]>> => refs.every((r) => r.is(value)),
      refs.map((r) => r.label).join(" & "),
      (value, path) => refs.flatMap((r) => r.check(value, path)),
    );
  },

  /** Accepts a value when *any* spec accepts it (union); the first to accept wins. */
  or: <S extends ReadonlyArray<Spec<unknown>>>(
    ...specs: S
  ): Refinement<SpecValue<S[number]>> => {
    const refs = specs.map(refine);
    return build(
      (value): value is SpecValue<S[number]> => refs.some((r) => r.is(value)),
      refs.map((r) => r.label).join(" | "),
    );
  },

  /**
   * A list whose every element accepts `element`; an empty list accepts. Without
   * `element`, any array (`Array<unknown>`).
   */
  array: <T = unknown>(element?: Spec<T>): Refinement<Array<T>> => {
    const el = element === undefined ? undefined : refine(element);
    const label = el === undefined ? "array" : `array<${el.label}>`;
    return build(
      (value): value is Array<T> =>
        Array.isArray(value) && (el === undefined || value.every((item: unknown) => el.is(item))),
      label,
      (value, path) => {
        if (!Array.isArray(value)) return [{ path, message: `expected ${label}` }];
        if (el === undefined) return [];
        return value.flatMap((item: unknown, index) => el.check(item, [...path, index]));
      },
    );
  },

  /**
   * A list of at least one element, every one accepting `element`. Without
   * `element`, any non-empty array (`NonEmptyArray<unknown>`).
   */
  nonEmptyArray: <T = unknown>(element?: Spec<T>): Refinement<NonEmptyArray<T>> => {
    const el = element === undefined ? undefined : refine(element);
    const label = el === undefined ? "non-empty array" : `non-empty array<${el.label}>`;
    return build(
      (value): value is NonEmptyArray<T> =>
        Array.isArray(value) &&
        value.length > 0 &&
        (el === undefined || value.every((item: unknown) => el.is(item))),
      label,
      (value, path) => {
        if (!Array.isArray(value) || value.length === 0) {
          return [{ path, message: `expected ${label}` }];
        }
        if (el === undefined) return [];
        return value.flatMap((item: unknown, index) => el.check(item, [...path, index]));
      },
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
      ([key, spec]) => [key, refine(spec as Spec<unknown>)] as const,
    );
    const isObject = (value: unknown): value is Record<string, unknown> =>
      value !== null && typeof value === "object" && !Array.isArray(value);
    return build(
      (value): value is F => isObject(value) && entries.every(([key, r]) => r.is(value[key])),
      "object",
      (value, path) => {
        if (!isObject(value)) return [{ path, message: "expected object" }];
        return entries.flatMap(([key, r]) => r.check(value[key], [...path, key]));
      },
    );
  },

  /**
   * A plain object of arbitrary string keys whose every value accepts `value`.
   * For maps and dictionaries; use {@link Refinement.shape} for known keys.
   *
   * @example
   * const Scores = Refinement.record(Integer); // Record<string, Integer>
   */
  record: <V>(value: Spec<V>): Refinement<Record<string, V>> => {
    const r = refine(value);
    const isObject = (candidate: unknown): candidate is Record<string, unknown> =>
      candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
    return build(
      (candidate): candidate is Record<string, V> =>
        isObject(candidate) && Object.keys(candidate).every((key) => r.is(candidate[key])),
      `record<${r.label}>`,
      (candidate, path) => {
        if (!isObject(candidate)) return [{ path, message: "expected object" }];
        return Object.keys(candidate).flatMap((key) => r.check(candidate[key], [...path, key]));
      },
    );
  },

  /**
   * A fixed-length tuple, each position accepting the spec at that position.
   *
   * @example
   * const Pair = Refinement.tuple([Primitives.String, Integer]); // [string, Integer]
   */
  tuple: <S extends ReadonlyArray<Spec<unknown>>>(
    specs: readonly [...S],
  ): Refinement<{ [K in keyof S]: SpecValue<S[K]> }> => {
    const refs = specs.map(refine);
    const label = `[${refs.map((r) => r.label).join(", ")}]`;
    return build(
      (value): value is { [K in keyof S]: SpecValue<S[K]> } =>
        Array.isArray(value) && value.length === refs.length && refs.every((r, i) => r.is(value[i])),
      label,
      (value, path) => {
        if (!Array.isArray(value) || value.length !== refs.length) {
          return [{ path, message: `expected tuple ${label}` }];
        }
        return refs.flatMap((r, index) => r.check(value[index], [...path, index]));
      },
    );
  },

  /** A field that may be `null`: accepts `null` or `spec`. */
  nullable: <T>(spec: Spec<T>): Refinement<T | null> => {
    const r = refine(spec);
    return build(
      (value): value is T | null => value === null || r.is(value),
      `${r.label} | null`,
      (value, path) => (value === null ? [] : r.check(value, path)),
    );
  },

  /** A field that may be absent: accepts `undefined` or `spec`. */
  optional: <T>(spec: Spec<T>): Refinement<T | undefined> => {
    const r = refine(spec);
    return build(
      (value): value is T | undefined => value === undefined || r.is(value),
      `${r.label} | undefined`,
      (value, path) => (value === undefined ? [] : r.check(value, path)),
    );
  },

  /** A union of literal values. */
  literal: <const V extends ReadonlyArray<string | number | boolean | null | undefined>>(
    ...values: V
  ): Refinement<V[number]> => {
    const allowed = new Set<unknown>(values);
    return build(
      (value): value is V[number] => allowed.has(value),
      values.map((value) => String(value)).join(" | "),
    );
  },

  /** A string matching `pattern`. */
  matches: (pattern: RegExp): Refinement<string> =>
    build(
      (value): value is string => typeof value === "string" && pattern.test(value),
      `string matching ${pattern.source}`,
    ),

  /** An instance of `ctor`. */
  instanceOf: <T>(ctor: abstract new (...args: never) => T): Refinement<T> =>
    build((value): value is T => value instanceof ctor, ctor.name || "instance"),
});
