import { test, expect } from "bun:test";
import {
  Email,
  Url,
  Uuid,
  HexColor,
  Slug,
  Base64,
  Base64Url,
  HexString,
  SemVer,
  Ipv4,
  Ipv6,
  Ip,
  DateString,
  TimeString,
  DateTimeString,
  Port,
  Byte,
  Percentage,
  Latitude,
  Longitude,
} from "./formats.js";

test("Email (HTML5 pattern)", () => {
  expect(Email.is("ada@example.com")).toBe(true);
  expect(Email.is("a.b+c@sub.example.co.uk")).toBe(true);
  expect(Email.is("nope")).toBe(false);
  expect(Email.is("a@@b.com")).toBe(false);
  expect(Email.is("a@b")).toBe(true); // HTML5 allows a bare host label
  expect(Email.is(42)).toBe(false);
});

test("Url (WHATWG parser)", () => {
  expect(Url.is("https://example.com/path?q=1#h")).toBe(true);
  expect(Url.is("ftp://host")).toBe(true);
  expect(Url.is("/relative")).toBe(false); // not absolute
  expect(Url.is("not a url")).toBe(false);
});

test("Uuid", () => {
  expect(Uuid.is("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  expect(Uuid.is("123E4567-E89B-42D3-A456-426614174000")).toBe(true); // case-insensitive
  expect(Uuid.is("123e4567-e89b-62d3-a456-426614174000")).toBe(false); // bad version
  expect(Uuid.is("nope")).toBe(false);
});

test("HexColor / Slug", () => {
  expect(HexColor.is("#fff")).toBe(true);
  expect(HexColor.is("#aabbccdd")).toBe(true);
  expect(HexColor.is("fff")).toBe(false);
  expect(HexColor.is("#ggg")).toBe(false);

  expect(Slug.is("a-nice-slug-1")).toBe(true);
  expect(Slug.is("Not-A-Slug")).toBe(false);
  expect(Slug.is("-leading")).toBe(false);
});

test("Base64 / Base64Url / HexString", () => {
  expect(Base64.is("aGVsbG8=")).toBe(true);
  expect(Base64.is("aGVsbG8")).toBe(false); // bad padding length
  expect(Base64Url.is("aGVsbG8")).toBe(true); // unpadded
  expect(Base64Url.is("a+/b")).toBe(false); // not url-safe
  expect(HexString.is("deadBEEF")).toBe(true);
  expect(HexString.is("")).toBe(false);
  expect(HexString.is("xyz")).toBe(false);
});

test("SemVer", () => {
  expect(SemVer.is("1.2.3")).toBe(true);
  expect(SemVer.is("1.0.0-alpha.1+build.5")).toBe(true);
  expect(SemVer.is("1.2")).toBe(false);
  expect(SemVer.is("01.2.3")).toBe(false); // leading zero
});

test("IPv4 / IPv6 / IP", () => {
  expect(Ipv4.is("192.168.0.1")).toBe(true);
  expect(Ipv4.is("256.0.0.1")).toBe(false);
  expect(Ipv6.is("2001:0db8:85a3::8a2e:0370:7334")).toBe(true);
  expect(Ipv6.is("::1")).toBe(true);
  expect(Ipv6.is("gggg::1")).toBe(false);
  expect(Ip.is("10.0.0.1")).toBe(true);
  expect(Ip.is("::1")).toBe(true);
  expect(Ip.is("nope")).toBe(false);
});

test("DateString / TimeString / DateTimeString (HTML5, extended form)", () => {
  expect(DateString.is("2026-09-03")).toBe(true);
  expect(DateString.is("20260903")).toBe(false); // ISO basic form rejected
  expect(DateString.is("2026-13-01")).toBe(false);

  expect(TimeString.is("12:34")).toBe(true);
  expect(TimeString.is("12:34:56.789")).toBe(true);
  expect(TimeString.is("24:00")).toBe(false);

  expect(DateTimeString.is("2026-09-03T12:34Z")).toBe(true); // seconds optional
  expect(DateTimeString.is("2026-09-03T12:34:56.789+02:00")).toBe(true);
  expect(DateTimeString.is("2026-09-03 12:34:56")).toBe(false); // no T, no offset
});

test("bounded numbers", () => {
  expect(Port.is(8080)).toBe(true);
  expect(Port.is(0)).toBe(false);
  expect(Port.is(70000)).toBe(false);
  expect(Byte.is(255)).toBe(true);
  expect(Byte.is(256)).toBe(false);
  expect(Percentage.is(0)).toBe(true);
  expect(Percentage.is(100)).toBe(true);
  expect(Percentage.is(100.1)).toBe(false);
  expect(Latitude.is(-90)).toBe(true);
  expect(Latitude.is(90.1)).toBe(false);
  expect(Longitude.is(180)).toBe(true);
  expect(Longitude.is(-180.1)).toBe(false);
});

test("formats compose and decode with labels", () => {
  expect(Port.decode(0).unwrapErr()).toEqual([{ path: [], message: "expected port" }]);
  expect(Email.decode("nope").unwrapErr()).toEqual([{ path: [], message: "expected email" }]);
});
