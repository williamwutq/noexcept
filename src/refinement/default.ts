/**
 * `Default` — the value a refinement starts from, for the ones that have one.
 *
 * A {@link Guard} says which values *belong* to a type; it says nothing about
 * which one to *begin with*. `(v) => typeof v === "string"` admits `""` and
 * `"x"` on equal terms, so a default read out of it would be invented, and
 * sometimes wrong — the natural guess for a string is `""`, which a non-empty
 * string refuses. So a default is not derived. It is a separate, opt-in trait,
 * implemented by the few types with a canonical starting value and absent on the
 * rest.
 *
 * Container refinements supply what their contents cannot: {@link Default.option}
 * starts at `null` and {@link Default.list} starts empty, whatever is inside,
 * because the *container* has the answer even when the element type never could.
 *
 * @module refinement/default
 * @author William Wu
 */

import type { Option } from "../core/option";
import { Refinement } from "./guard";

/**
 * A {@link Refinement} that also carries a canonical starting value.
 *
 * `default` is a function so that mutable defaults — `[]`, `{}` — are a fresh
 * value each call rather than one object shared by everyone who asked.
 *
 * @template T The refined type.
 */
export type Defaulted<T> = Refinement<T> & { readonly default: () => T };

/** The {@link Default} trait namespace. */
export const Default = Object.freeze({
  /** True when `type` implements the trait — asked of a *type*, not a value. */
  is: (type: unknown): type is Defaulted<unknown> =>
    typeof type === "object" &&
    type !== null &&
    typeof (type as { is?: unknown }).is === "function" &&
    typeof (type as { parse?: unknown }).parse === "function" &&
    typeof (type as { default?: unknown }).default === "function",

  /** The value `type` starts from — fresh every call. */
  of: <T>(type: Defaulted<T>): T => type.default(),

  /** The same refinement, with a default attached; the original is untouched. */
  impl: <T>(type: Refinement<T>, make: () => T): Defaulted<T> =>
    Object.freeze({ ...type, default: make }),

  /** `Option<T>` — the inner type or nothing, starting at nothing (`null`). */
  option: <T>(type: Refinement<T>): Defaulted<Option<T>> =>
    Object.freeze({ ...Refinement.nullable(type), default: (): Option<T> => null }),

  /** `Array<T>` — a list of the inner type, starting empty. */
  list: <T>(type: Refinement<T>): Defaulted<Array<T>> =>
    Object.freeze({ ...Refinement.array(type), default: (): Array<T> => [] }),
});
