/**
 * Nominal (branded) types over TypeScript's structural type system.
 *
 * A brand attaches a compile-time-only phantom tag. The runtime value is
 * unchanged (a branded `number` is still a `number`), but the branded type is
 * distinct from its base type and is only produced through a guard that asserts
 * it.
 *
 * @module refinement/nominal
 */

declare const brand: unique symbol;

/**
 * `T` tagged with the compile-time-only marker `B`.
 *
 * The intersection adds a phantom property. A `Brand` is assignable to its base
 * type (a `PositiveInteger` is a `number`), but the base type is not assignable
 * to the `Brand` without a guard that asserts it.
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
