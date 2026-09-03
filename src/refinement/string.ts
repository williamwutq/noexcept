/**
 * Refined string types.
 *
 * @module refinement/string
 */

import type { Brand } from "./nominal";
import type { Option } from "../core/option";
import { Refinement } from "./guard";

/**
 * A string of length at least 1. A {@link Refinement}, so it composes — e.g.
 * `Refinement.shape({ name: NonEmptyString })`.
 */
export type NonEmptyString = Brand<string, "NonEmptyString">;

const nonEmpty = Refinement.of(
  (value: unknown): value is NonEmptyString => typeof value === "string" && value.length > 0,
  "non-empty string",
);

/** The {@link NonEmptyString} namespace: the refinement, plus {@link NonEmptyString.trimmed}. */
export const NonEmptyString = Object.freeze({
  ...nonEmpty,

  /**
   * Trim `value`, and return it only if non-empty, otherwise `null` (e.g.
   * `"  "` → `null`). A *transformative* constructor: it changes the value, so
   * it is not the derived `parse` and is not part of the machinery.
   */
  trimmed: (value: unknown): Option<NonEmptyString> => {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text.length > 0 ? (text as NonEmptyString) : null;
  },
});

/**
 * A non-empty error message: a `string` (never an object), never empty. Same
 * runtime shape as {@link NonEmptyString}, branded distinctly to mark an error
 * message rather than an arbitrary non-empty string.
 */
export type ErrorString = Brand<string, "ErrorString">;

/** The {@link ErrorString} refinement. */
export const ErrorString = Refinement.of(
  (value: unknown): value is ErrorString => typeof value === "string" && value.length > 0,
  "error string",
);
