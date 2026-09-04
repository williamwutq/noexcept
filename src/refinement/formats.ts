/**
 * Common branded formats — email, URL, UUID, IP, colour, dates, and more.
 *
 * Each is a {@link Refinement} over `unknown` with a distinct {@link Brand}, so
 * it composes (`Refinement.shape({ email: Email })`) and carries `is` / `parse`
 * / `decode` like any other refinement. The web formats follow the WHATWG/HTML5
 * definitions rather than the full RFC/ISO grammars: `Email` uses the HTML5
 * `<input type=email>` pattern, and `Url` uses the WHATWG URL parser.
 *
 * @module refinement/formats
 * @author William Wu
 */

import type { Brand } from "./nominal.js";
import { Refinement } from "./guard.js";

/** A refinement for a `string` matching `pattern`, branded `B`. */
const stringFormat = <B extends string>(pattern: RegExp, label: string): Refinement<Brand<string, B>> =>
  Refinement.of(
    (value: unknown): value is Brand<string, B> => typeof value === "string" && pattern.test(value),
    label,
  );

/** A refinement for a `number` passing `check`, branded `B`. */
const numberFormat = <B extends string>(
  check: (value: number) => boolean,
  label: string,
): Refinement<Brand<number, B>> =>
  Refinement.of(
    (value: unknown): value is Brand<number, B> => typeof value === "number" && check(value),
    label,
  );

/* -------------------------------------------------------------------------- */
/*  Web (HTML5 / WHATWG)                                                       */
/* -------------------------------------------------------------------------- */

/** An email address, by the HTML5 `<input type=email>` pattern. */
export type Email = Brand<string, "Email">;
export const Email = stringFormat<"Email">(
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  "email",
);

/** An absolute URL, as accepted by the WHATWG URL parser (the `URL` constructor). */
export type Url = Brand<string, "Url">;
export const Url = Refinement.of((value: unknown): value is Url => {
  if (typeof value !== "string") return false;
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}, "url");

/* -------------------------------------------------------------------------- */
/*  Identifiers & encodings                                                    */
/* -------------------------------------------------------------------------- */

/** A UUID (versions 1–5), case-insensitive. */
export type Uuid = Brand<string, "Uuid">;
export const Uuid = stringFormat<"Uuid">(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  "uuid",
);

/** A `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa` hex colour. */
export type HexColor = Brand<string, "HexColor">;
export const HexColor = stringFormat<"HexColor">(
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  "hex colour",
);

/** A URL-safe slug: lowercase alphanumerics joined by single hyphens. */
export type Slug = Brand<string, "Slug">;
export const Slug = stringFormat<"Slug">(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug");

/** Standard Base64 (with padding). */
export type Base64 = Brand<string, "Base64">;
export const Base64 = stringFormat<"Base64">(
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
  "base64",
);

/** URL-safe Base64 (no padding). */
export type Base64Url = Brand<string, "Base64Url">;
export const Base64Url = stringFormat<"Base64Url">(
  /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2}|[A-Za-z0-9_-]{3})?$/,
  "base64url",
);

/** A non-empty string of hexadecimal digits. */
export type HexString = Brand<string, "HexString">;
export const HexString = stringFormat<"HexString">(/^[0-9a-fA-F]+$/, "hex string");

/** A Semantic Versioning 2.0.0 version string. */
export type SemVer = Brand<string, "SemVer">;
export const SemVer = stringFormat<"SemVer">(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
  "semver",
);

/* -------------------------------------------------------------------------- */
/*  Network addresses                                                          */
/* -------------------------------------------------------------------------- */

/** An IPv4 address in dotted-decimal form. */
export type Ipv4 = Brand<string, "Ipv4">;
export const Ipv4 = stringFormat<"Ipv4">(
  /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/,
  "IPv4 address",
);

/** An IPv6 address, including compressed (`::`) and IPv4-mapped forms. */
export type Ipv6 = Brand<string, "Ipv6">;
export const Ipv6 = stringFormat<"Ipv6">(
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(:[0-9a-fA-F]{1,4}){1,6}|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1[0-9]|[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1[0-9]|[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1[0-9]|[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1[0-9]|[0-9])?[0-9]))$/,
  "IPv6 address",
);

/** Either an IPv4 or an IPv6 address. */
export type Ip = Brand<string, "Ip">;
export const Ip = Refinement.of(
  (value: unknown): value is Ip => Ipv4.is(value) || Ipv6.is(value),
  "IP address",
);

/* -------------------------------------------------------------------------- */
/*  Dates & times (HTML5 / WHATWG — extended form only)                        */
/* -------------------------------------------------------------------------- */

/**
 * An HTML5 date string, `YYYY-MM-DD`. Only the extended (hyphenated) form is
 * valid — unlike ISO 8601, the basic form `YYYYMMDD` is rejected.
 */
export type DateString = Brand<string, "DateString">;
export const DateString = stringFormat<"DateString">(
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  "date",
);

/** An HTML5 time string: `HH:MM`, `HH:MM:SS`, or `HH:MM:SS.sss`. */
export type TimeString = Brand<string, "TimeString">;
export const TimeString = stringFormat<"TimeString">(
  /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?$/,
  "time",
);

/**
 * An HTML5 global date-and-time string: a {@link DateString} and time joined by
 * `T`, with a `Z` or `±HH:MM` offset. Seconds are optional; the extended form is
 * required throughout.
 */
export type DateTimeString = Brand<string, "DateTimeString">;
export const DateTimeString = stringFormat<"DateTimeString">(
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/,
  "date-time",
);

/* -------------------------------------------------------------------------- */
/*  Bounded numbers                                                            */
/* -------------------------------------------------------------------------- */

/** A TCP/UDP port: an integer in `1..65535`. */
export type Port = Brand<number, "Port">;
export const Port = numberFormat<"Port">(
  (value) => Number.isInteger(value) && value >= 1 && value <= 65535,
  "port",
);

/** A byte: an integer in `0..255`. */
export type Byte = Brand<number, "Byte">;
export const Byte = numberFormat<"Byte">(
  (value) => Number.isInteger(value) && value >= 0 && value <= 255,
  "byte",
);

/** A percentage: a finite number in `0..100`. */
export type Percentage = Brand<number, "Percentage">;
export const Percentage = numberFormat<"Percentage">(
  (value) => Number.isFinite(value) && value >= 0 && value <= 100,
  "percentage",
);

/** A latitude: a finite number in `-90..90`. */
export type Latitude = Brand<number, "Latitude">;
export const Latitude = numberFormat<"Latitude">(
  (value) => Number.isFinite(value) && value >= -90 && value <= 90,
  "latitude",
);

/** A longitude: a finite number in `-180..180`. */
export type Longitude = Brand<number, "Longitude">;
export const Longitude = numberFormat<"Longitude">(
  (value) => Number.isFinite(value) && value >= -180 && value <= 180,
  "longitude",
);
