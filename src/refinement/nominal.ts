/**
 * Nominal (branded) typing for TypeScript's structural world.
 *
 * TypeScript compares types by shape, so a `number` that has been checked to be
 * a whole number is, to the compiler, indistinguishable from one that has not.
 * A brand attaches a phantom tag that exists only at compile time: the runtime
 * value is still a plain `number`, but the type now carries proof that a check
 * was run, and that proof cannot be forged by writing the number out again.
 *
 * @module refinement/nominal
 */

declare const brand: unique symbol;

/**
 * `T` tagged with the compile-time-only marker `B`.
 *
 * The intersection adds a property that never exists at runtime, so a `Brand`
 * is assignable *to* its base type for free (a `PositiveInteger` is a `number`)
 * but the base type is not assignable *back* without a check that produces the
 * brand. That asymmetry is the whole point: it is what makes the check
 * unskippable.
 *
 * @template T The underlying runtime type.
 * @template B A unique string literal naming the refinement.
 */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/**
 * The base type a brand refines — `Brand<number, "Integer">` back to `number`.
 *
 * @template T A branded type.
 */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;
