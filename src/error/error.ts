/**
 * Tagged error objects, for building discriminated error unions.
 *
 * An {@link ErrorObject} has a `kind` discriminant and an {@link ErrorString}
 * message, plus any extra `Data`. A union of them is a discriminated union you
 * narrow with `error.kind === "..."`, and every message is an `ErrorString`
 * rather than a bare `string`.
 *
 * @module error/error
 * @author William Wu
 */

import type { ErrorString } from "../refinement/string.js";

/**
 * A tagged error: the `kind` discriminant, an {@link ErrorString} `message`, and
 * any extra `Data`. List one per variant to form a discriminated error union:
 *
 * ```ts
 * type ParseFailure =
 *   | ErrorObject<"invalid-json">
 *   | ErrorObject<"invalid-user", { readonly issues: ReadonlyArray<Issue> }>;
 * ```
 *
 * @template Kind The discriminant literal.
 * @template Data Extra fields carried alongside `kind` and `message`.
 */
export type ErrorObject<Kind extends string, Data = object> = {
  readonly kind: Kind;
  readonly message: ErrorString;
} & Data;

/** Construct an {@link ErrorObject}. */
export function errorObject<Kind extends string>(
  kind: Kind,
  message: ErrorString,
): ErrorObject<Kind>;
export function errorObject<Kind extends string, Data extends object>(
  kind: Kind,
  message: ErrorString,
  data: Data,
): ErrorObject<Kind, Data>;
export function errorObject<Kind extends string, Data extends object>(
  kind: Kind,
  message: ErrorString,
  data?: Data,
): ErrorObject<Kind, Data> {
  return { kind, message, ...(data ?? ({} as Data)) };
}
