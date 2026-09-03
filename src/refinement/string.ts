/**
 * Refined string types.
 *
 * @module refinement/string
 */

import type { Brand } from "./nominal";
import type { Option } from "../core/option";
import { Refinement } from "./guard";

/**
 * A string with at least one character.
 *
 * The refinement most worth having, because empty is where "the user typed
 * nothing" and "there is a name" get confused. A `NonEmptyString` says the
 * question was already asked and answered. It is a {@link Refinement}, so it
 * composes: `Refinement.shape({ name: NonEmptyString })`.
 */
export type NonEmptyString = Brand<string, "NonEmptyString">;

const nonEmpty = Refinement.of(
  (value: unknown): value is NonEmptyString => typeof value === "string" && value.length > 0,
);

/** The {@link NonEmptyString} namespace: the refinement, plus {@link NonEmptyString.trimmed}. */
export const NonEmptyString = Object.freeze({
  ...nonEmpty,

  /**
   * Trim `value` and keep it only if something remains.
   *
   * The one member here that returns a *different* value than it was given — a
   * *transformative* constructor, so it is not the derived `parse` and does not
   * come from the machinery. For the boundary where a person typed something and
   * trailing space is a slip: `"  "` is somebody who typed nothing, and this
   * says so with `null`.
   */
  trimmed: (value: unknown): Option<NonEmptyString> => {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text.length > 0 ? (text as NonEmptyString) : null;
  },
});
