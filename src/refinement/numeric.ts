/**
 * Refined numeric types.
 *
 * Two layers live here, and they answer different questions.
 *
 * The **branded** types ({@link Integer}, {@link PositiveInteger}, …) refine an
 * arbitrary runtime value — one you did not write yourself, that arrived from
 * JSON or a form. Each is a {@link Refinement} built on the machinery: an `is`
 * guard over `unknown`, the `parse` derived from it, and a brand so the check
 * cannot be skipped. Being refinements, they compose — `Refinement.shape({ age:
 * Integer })` just works.
 *
 * The **literal** types ({@link IntegerBelow}, {@link IntegerRange}) refine a
 * number the compiler already knows exactly — a literal like `3`. They are
 * pure conditional types that expand to a union of literals, so an out-of-range
 * literal is a compile error with no runtime cost at all. This is the thing
 * plain JavaScript cannot express, and the reason the library is written in
 * TypeScript.
 *
 * @module refinement/numeric
 */

import type { Brand } from "./nominal";
import { Refinement } from "./guard";
import { Default } from "./default";

/* -------------------------------------------------------------------------- */
/*  Branded runtime refinements                                               */
/* -------------------------------------------------------------------------- */

/** A whole, finite number. */
export type Integer = Brand<number, "Integer">;

/** A whole number strictly greater than zero. */
export type PositiveInteger = Brand<number, "PositiveInteger">;

/** A whole number at or above zero — what every count and length is. */
export type NonNegativeInteger = Brand<number, "NonNegativeInteger">;

/** A whole number strictly less than zero. */
export type NegativeInteger = Brand<number, "NegativeInteger">;

/** A whole, finite number — the shared check the four brands narrow from. */
const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);

/**
 * The `Integer` refinement, with a {@link Default} of `0`. A whole number is a
 * count you branch on, not an exception: `Integer.parse` answers `null` for a
 * non-integer, and `Integer.is` narrows an `unknown` to the branded type.
 */
export const Integer = Default.impl(
  Refinement.of((value: unknown): value is Integer => isInteger(value)),
  (): Integer => 0 as Integer,
);

/** The {@link PositiveInteger} refinement — no canonical default. */
export const PositiveInteger = Refinement.of(
  (value: unknown): value is PositiveInteger => isInteger(value) && value > 0,
);

/** The {@link NonNegativeInteger} refinement, with a {@link Default} of `0`. */
export const NonNegativeInteger = Default.impl(
  Refinement.of((value: unknown): value is NonNegativeInteger => isInteger(value) && value >= 0),
  (): NonNegativeInteger => 0 as NonNegativeInteger,
);

/** The {@link NegativeInteger} refinement — no canonical default. */
export const NegativeInteger = Refinement.of(
  (value: unknown): value is NegativeInteger => isInteger(value) && value < 0,
);

/* -------------------------------------------------------------------------- */
/*  Literal (compile-time) refinements                                        */
/* -------------------------------------------------------------------------- */

/**
 * The union `0 | 1 | … | N-1`, built by counting a tuple up to length `N`.
 *
 * This is the primitive the range types are made from. TypeScript caps
 * recursive instantiation, so `N` beyond a few hundred will not expand — these
 * are for the small, known bounds where a literal range is worth stating in the
 * type (an enum's arity, a fixed board size), not for arbitrary arithmetic.
 *
 * @template N The exclusive upper bound, a literal number type.
 */
export type IntegerBelow<
  N extends number,
  Acc extends Array<number> = [],
> = Acc["length"] extends N
  ? Acc[number]
  : IntegerBelow<N, [...Acc, Acc["length"]]>;

/**
 * The union `Lo | Lo+1 | … | Hi-1` — inclusive of `Lo`, exclusive of `Hi`.
 *
 * @template Lo The inclusive lower bound.
 * @template Hi The exclusive upper bound.
 */
export type IntegerRange<Lo extends number, Hi extends number> = Exclude<
  IntegerBelow<Hi>,
  IntegerBelow<Lo>
>;

/**
 * The union `1 | 2 | … | N` — positive literals up to and including `N`.
 *
 * @template N The inclusive upper bound.
 */
export type PositiveIntegerUpTo<N extends number> = Exclude<
  IntegerBelow<N> | N,
  0
>;
