/**
 * `Default` — a canonical starting value for a refinement, for the refinements
 * that have one.
 *
 * A {@link Guard} is a type predicate; it does not determine a starting value.
 * `(v) => typeof v === "string"` is true for both `""` and `"x"`, and a
 * non-empty string excludes `""`, so a default cannot be derived from the guard.
 * `Default` is a separate, opt-in trait: present on refinements with a canonical
 * starting value, absent on the rest.
 *
 * Container refinements supply a default their element type may lack:
 * {@link Default.option} defaults to `null` and {@link Default.list} defaults to
 * `[]`, regardless of the element type.
 *
 * @module refinement/default
 * @author William Wu
 */

import type { Option } from "../core/option.js";
import { Refinement } from "./guard.js";

/**
 * A {@link Refinement} that also carries a canonical starting value.
 *
 * `default` is a function so mutable defaults (`[]`, `{}`) are a fresh value on
 * each call, not one shared instance.
 *
 * @template T The refined type.
 */
export type Defaulted<T> = Refinement<T> & { readonly default: () => T };

/** The {@link Default} trait namespace. */
export const Default = Object.freeze({
  /** True when `type` implements the trait (a check on a refinement, not a value). */
  is: (type: unknown): type is Defaulted<unknown> =>
    typeof type === "object" &&
    type !== null &&
    typeof (type as { is?: unknown }).is === "function" &&
    typeof (type as { parse?: unknown }).parse === "function" &&
    typeof (type as { default?: unknown }).default === "function",

  /** The starting value of `type`; a fresh value on each call. */
  of: <T>(type: Defaulted<T>): T => type.default(),

  /** The same refinement, with a default attached; the original is untouched. */
  impl: <T>(type: Refinement<T>, make: () => T): Defaulted<T> =>
    Object.freeze({ ...type, default: make }),

  /** `Option<T>`: the inner refinement or `null`, defaulting to `null`. */
  option: <T>(type: Refinement<T>): Defaulted<Option<T>> =>
    Object.freeze({ ...Refinement.nullable(type), default: (): Option<T> => null }),

  /** `Array<T>`: a list of the inner refinement, defaulting to `[]`. */
  list: <T>(type: Refinement<T>): Defaulted<Array<T>> =>
    Object.freeze({ ...Refinement.array(type), default: (): Array<T> => [] }),
});
