/**
 * noexcept — clear error handling and no exceptions, without any exceptions.
 *
 * Two representations of an absent-or-failed value:
 *
 *  - **Bare unions.** `Option<T>` is `T | null`, `Maybe<T>` is `T | undefined`,
 *    `Absent<T>` is either. No wrapper; combinators live in a same-named
 *    namespace, each with an async twin (`OptionPromise`, `MaybePromise`,
 *    `AbsentPromise`).
 *  - **Wrapper classes.** `Result<T, E>` (a value or an error) and `Either<T, A>`
 *    (one of two values, neither an error), each a fluent method chain with an
 *    async twin (`ResultPromise`, `EitherPromise`).
 *
 * Plus refinement types (`Refinement`, `Primitives`, branded leaves) that
 * validate `unknown`, and tagged errors (`ErrorObject`, `ErrorString`).
 *
 * @module noexcept
 * @author William Wu
 */

// Core absence types — a value, or its absence, without exceptions.
// Each name is re-exported in both its meanings: the `type` and the namespace.
export { Option } from "./core/option.js";
export { Maybe } from "./core/maybe.js";
export { Absent } from "./core/absent.js";

// Their async twins — a promise of the same bare union, with the same combinators.
export { OptionPromise } from "./core/option-promise.js";
export { MaybePromise } from "./core/maybe-promise.js";
export { AbsentPromise } from "./core/absent-promise.js";

// Result — a value or an error, as a fluent wrapper.
export { Result, Ok, Err, ok, err } from "./result/result.js";
export { ResultPromise } from "./result/result-promise.js";

// Either — one of two values, with neither side privileged.
export { Either, Main, Alt, main, alt } from "./either/either.js";
export { EitherPromise } from "./either/either-promise.js";

// Tagged error objects, for discriminated error unions.
export { errorObject } from "./error/error.js";
export type { ErrorObject } from "./error/error.js";

// Nominal branding.
export type { Brand, Unbrand } from "./refinement/nominal.js";

// Refinement machinery — the `is` trait, its derived parser, and combinators.
export { Refinement } from "./refinement/guard.js";
export type { Guard, Spec, Issue, Infer } from "./refinement/guard.js";
export { Default } from "./refinement/default.js";
export type { Defaulted } from "./refinement/default.js";
export { Primitives } from "./refinement/primitives.js";

// Refined numeric types — branded runtime refinements + literal ranges.
export {
  Integer,
  PositiveInteger,
  NonNegativeInteger,
  NegativeInteger,
  SafeInteger,
  integerAtLeast,
  integerAbove,
  integerAtMost,
  integerInRange,
} from "./refinement/numeric.js";
export type {
  IntegerBelow,
  IntegerRange,
  PositiveIntegerUpTo,
} from "./refinement/numeric.js";

// Refined string & array types.
export { NonEmptyString, ErrorString } from "./refinement/string.js";
export { NonEmptyArray } from "./refinement/array.js";
