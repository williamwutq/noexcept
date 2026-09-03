/**
 * Refinements for the built-in JavaScript types.
 *
 * Leaf {@link Refinement}s for `string`, `number`, `boolean`, plain objects,
 * arrays, and functions — each an `is` guard over `unknown` with a derived
 * `parse`, so they compose as {@link Spec}s. Grouped under a namespace to avoid
 * shadowing the global constructors. The ones with a canonical starting value
 * also carry a {@link Default}.
 *
 * @module refinement/primitives
 * @author William Wu
 */

import { Refinement } from "./guard";
import { Default } from "./default";

/** Refinements for the built-in types. */
export const Primitives = Object.freeze({
  /** Any string. Default `""`. */
  String: Default.impl(
    Refinement.of((value: unknown): value is string => typeof value === "string"),
    (): string => "",
  ),

  /** A finite number — excludes `NaN` and the infinities. Default `0`. */
  Number: Default.impl(
    Refinement.of(
      (value: unknown): value is number => typeof value === "number" && Number.isFinite(value),
    ),
    (): number => 0,
  ),

  /** A boolean. Default `false`. */
  Boolean: Default.impl(
    Refinement.of((value: unknown): value is boolean => typeof value === "boolean"),
    (): boolean => false,
  ),

  /** A plain object: not `null`, not an array. Default `{}`. */
  Object: Default.impl(
    Refinement.of(
      (value: unknown): value is Record<string, unknown> =>
        value !== null && typeof value === "object" && !Array.isArray(value),
    ),
    (): Record<string, unknown> => ({}),
  ),

  /** An array of anything. Default `[]`. Pass an element to {@link Refinement.array} to check elements. */
  Array: Default.impl(
    Refinement.of((value: unknown): value is Array<unknown> => Array.isArray(value)),
    (): Array<unknown> => [],
  ),

  /** A function. No default. */
  Function: Refinement.of(
    (value: unknown): value is (...args: never) => unknown => typeof value === "function",
  ),
});
