/**
 * Refined numeric types, in two layers.
 *
 * The **branded** types ({@link Integer}, {@link PositiveInteger}, …) refine a
 * runtime value. Each is a {@link Refinement} built on the machinery: an `is`
 * guard over `unknown`, the `parse` derived from it, and a brand. Being
 * refinements, they compose — e.g. `Refinement.shape({ age: Integer })`.
 *
 * The **literal** types ({@link IntegerBelow}, {@link IntegerRange}) are
 * conditional types over a numeric literal, evaluated at compile time. They
 * expand to a union of literals, so an out-of-range literal is a compile error
 * with no runtime cost.
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

/** A whole number at or above zero. */
export type NonNegativeInteger = Brand<number, "NonNegativeInteger">;

/** A whole number strictly less than zero. */
export type NegativeInteger = Brand<number, "NegativeInteger">;

/** A whole, finite number; the shared check for the four brands. */
const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value);

/**
 * The `Integer` refinement, with a {@link Default} of `0`. `Integer.parse`
 * returns `null` for a non-integer; `Integer.is` narrows `unknown` to `Integer`.
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
 * The union `0 | 1 | … | N-1`, built by counting a tuple to length `N`. The
 * base of the range types below. TypeScript's recursion limit caps `N` at a few
 * hundred; use these for small fixed bounds, not arbitrary arithmetic.
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
