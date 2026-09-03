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
export { Option } from "./core/option";
export { Maybe } from "./core/maybe";
export { Absent } from "./core/absent";

// Their async twins — a promise of the same bare union, with the same combinators.
export { OptionPromise } from "./core/option-promise";
export { MaybePromise } from "./core/maybe-promise";
export { AbsentPromise } from "./core/absent-promise";

// Result — a value or an error, as a fluent wrapper.
export { Result, Ok, Err, ok, err } from "./result/result";
export { ResultPromise } from "./result/result-promise";

// Either — one of two values, with neither side privileged.
export { Either, Main, Alt, main, alt } from "./either/either";
export { EitherPromise } from "./either/either-promise";

// Tagged error objects, for discriminated error unions.
export { errorObject } from "./error/error";
export type { ErrorObject } from "./error/error";

// Nominal branding.
export type { Brand, Unbrand } from "./refinement/nominal";

// Refinement machinery — the `is` trait, its derived parser, and combinators.
export { Refinement } from "./refinement/guard";
export type { Guard, Spec, Issue, Infer } from "./refinement/guard";
export { Default } from "./refinement/default";
export type { Defaulted } from "./refinement/default";
export { Primitives } from "./refinement/primitives";

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
} from "./refinement/numeric";
export type {
  IntegerBelow,
  IntegerRange,
  PositiveIntegerUpTo,
} from "./refinement/numeric";

// Refined string & array types.
export { NonEmptyString, ErrorString } from "./refinement/string";
export { NonEmptyArray } from "./refinement/array";
