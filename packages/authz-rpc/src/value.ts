/**
 * Plain-JS <-> cratestack `Value` conversion.
 *
 * cratestack's `Json` columns (`Project.allowedModels`, `Project.defaultLimits`) carry
 * `cratestack_core::Value`, a serde-derived enum with the default *externally tagged*
 * representation: a unit variant serializes as a bare string (`Value::Null` -> `"Null"`),
 * every other variant as a single-key map (`Value::Map(_)` -> `{"Map": {...}}`,
 * `Value::List(_)` -> `{"List": [...]}`, etc). This holds for both wire codecs (JSON and
 * CBOR) because both go through the same serde derive with no format-specific override.
 *
 * `tagValue`/`untagValue` convert between this wire shape and plain JS values (objects,
 * arrays, strings, numbers, booleans, null) so callers never have to think about the
 * tagged representation.
 */

import type { JsonValue } from '../generated/src/runtime';

export type { JsonValue };

type TaggedValue =
  | 'Null'
  | { Bool: boolean }
  | { Int: number }
  | { Float: number }
  | { String: string }
  | { Bytes: number[] }
  | { List: TaggedValue[] }
  | { Map: Record<string, TaggedValue> };

export function tagValue(value: JsonValue): TaggedValue {
  if (value === null) {
    return 'Null';
  }
  if (typeof value === 'boolean') {
    return { Bool: value };
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { Int: value } : { Float: value };
  }
  if (typeof value === 'string') {
    return { String: value };
  }
  if (Array.isArray(value)) {
    return { List: value.map(tagValue) };
  }
  const map: Record<string, TaggedValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    map[key] = tagValue(entry);
  }
  return { Map: map };
}

export function untagValue(tagged: unknown): JsonValue {
  if (tagged === 'Null' || tagged === null || tagged === undefined) {
    return null;
  }
  if (typeof tagged !== 'object') {
    throw new TypeError(`untagValue: unexpected tagged Value ${JSON.stringify(tagged)}`);
  }
  const entries = Object.entries(tagged as Record<string, unknown>);
  if (entries.length !== 1) {
    throw new TypeError(
      `untagValue: expected a single-key tagged Value, got ${JSON.stringify(tagged)}`
    );
  }
  const [variant, payload] = entries[0];
  switch (variant) {
    case 'Bool':
      return payload as boolean;
    case 'Int':
    case 'Float':
      return payload as number;
    case 'String':
      return payload as string;
    case 'Bytes':
      return payload as number[];
    case 'List':
      return (payload as unknown[]).map(untagValue);
    case 'Map': {
      const result: Record<string, JsonValue> = {};
      for (const [key, entry] of Object.entries(payload as Record<string, unknown>)) {
        result[key] = untagValue(entry);
      }
      return result;
    }
    default:
      throw new TypeError(`untagValue: unknown Value variant "${variant}"`);
  }
}
