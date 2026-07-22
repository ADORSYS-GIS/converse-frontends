// Parser for the `.cstack` schema subset actually used by authz.cstack: `mixin`, `model`,
// `type`, `view`, and `mutation procedure` declarations, with field-level modifiers
// (`@id`, `@unique`, `@readonly`, `@server_only`, `@default(...)`, `@relation(...)`) and
// model-level attributes (`@@allow(...)`, `@@audit`, `@@soft_delete`, `@@materialized`).
//
// This is not a general cratestack-DSL parser — it covers exactly the grammar present in
// this schema, scoped generously enough (brace-matched blocks, line-based field/attr
// parsing) to tolerate ordinary schema edits (new fields, new models) without needing a
// hand-authored grammar update.

/** Strips `//` line comments. Safe here: no schema string literal contains `//`. */
function stripComments(source) {
  return source
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

/** Finds every `<keyword> <Name> [from <a, b, c>] { ... }` block via brace-depth matching. */
function findBlocks(source, keyword) {
  const header = new RegExp(String.raw`^${keyword}\s+(\w+)\s*(?:from\s+([^{]+))?\{`, 'gm');
  const blocks = [];
  let match = header.exec(source);
  while (match !== null) {
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let i = bodyStart;
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      i++;
    }
    blocks.push({
      name: match[1],
      from: match[2] ? match[2].split(',').map((s) => s.trim()) : undefined,
      body: source.slice(bodyStart, i - 1),
    });
    header.lastIndex = i;
    match = header.exec(source);
  }
  return blocks;
}

/** Parses `@mod` / `@mod(args)` occurrences out of the tail of a field-declaration line. */
function parseModifiers(tail) {
  const modifiers = [];
  const re = /@(\w+)(\(([^)]*)\))?/g;
  let m = re.exec(tail);
  while (m !== null) {
    modifiers.push({ name: m[1], args: m[3] });
    m = re.exec(tail);
  }
  return modifiers;
}

/** Parses the field and `@@attribute` lines inside a block body. */
function parseBody(body) {
  const fields = [];
  const uses = [];
  const attrs = [];

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const useMatch = line.match(/^@use\((\w+)\)$/);
    if (useMatch) {
      uses.push(useMatch[1]);
      continue;
    }

    const attrMatch = line.match(/^@@(\w+)(\((.*)\))?$/);
    if (attrMatch) {
      attrs.push({ name: attrMatch[1], args: attrMatch[3] });
      continue;
    }

    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\?)?(\[\])?(.*)$/);
    if (fieldMatch) {
      const [, name, scalarType, optional, isArray, tail] = fieldMatch;
      const modifiers = parseModifiers(tail);
      fields.push({
        name,
        scalarType,
        optional: Boolean(optional),
        isArray: Boolean(isArray),
        modifiers,
        isRelation: modifiers.some((m) => m.name === 'relation'),
      });
      continue;
    }

    throw new Error(`parse-cstack: unrecognized line in block body: "${line}"`);
  }

  return { fields, uses, attrs };
}

/** Parses `mutation procedure name(args: ArgType): ReturnType`, ignoring the trailing `@allow(...)`. */
function findProcedures(source) {
  const re = /mutation procedure (\w+)\(args:\s*(\w+)\):\s*(\w+)/g;
  const procedures = [];
  let m = re.exec(source);
  while (m !== null) {
    procedures.push({ name: m[1], argsType: m[2], returnType: m[3] });
    m = re.exec(source);
  }
  return procedures;
}

export function parseCstack(sourceText) {
  const source = stripComments(sourceText);

  const mixins = {};
  for (const block of findBlocks(source, 'mixin')) {
    mixins[block.name] = parseBody(block.body);
  }

  const models = {};
  for (const block of findBlocks(source, 'model')) {
    const parsed = parseBody(block.body);
    const mixinFields = parsed.uses.flatMap((mixinName) => {
      const mixin = mixins[mixinName];
      if (!mixin) {
        throw new Error(`parse-cstack: model "${block.name}" uses unknown mixin "${mixinName}"`);
      }
      return mixin.fields;
    });
    models[block.name] = {
      name: block.name,
      fields: [...parsed.fields, ...mixinFields],
      attrs: parsed.attrs,
      allowCreate: parsed.attrs.some(
        (a) => a.name === 'allow' && a.args && /^\s*"create"/.test(a.args)
      ),
      softDelete: parsed.attrs.some((a) => a.name === 'soft_delete'),
    };
  }

  const types = {};
  for (const block of findBlocks(source, 'type')) {
    types[block.name] = { name: block.name, fields: parseBody(block.body).fields };
  }

  const views = {};
  for (const block of findBlocks(source, 'view')) {
    views[block.name] = {
      name: block.name,
      from: block.from,
      fields: parseBody(block.body).fields,
    };
  }

  const procedures = findProcedures(source);

  return { mixins, models, types, views, procedures };
}
