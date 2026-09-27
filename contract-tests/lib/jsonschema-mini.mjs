export function validate(schema, data, root = schema, path = "$") {
  const errors = [];
  if (schema === true || schema === undefined) return errors;
  if (schema === false) { errors.push({ path, msg: "schema is false" }); return errors; }
  const S = (schema.$ref && schema.$ref.startsWith("#/")) ? resolveRef(root, schema.$ref) : schema;
  const t = S.type;
  const typeOf = (v) => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
  if (t) {
    const want = Array.isArray(t) ? t : [t];
    if (!want.includes(typeOf(data)))
      errors.push({ path, msg: `expected ${want.join("|")}, got ${typeOf(data)}` });
  }
  if (S.const !== undefined && JSON.stringify(data) !== JSON.stringify(S.const))
    errors.push({ path, msg: "const" });
  if (S.enum && !S.enum.some(e => JSON.stringify(e) === JSON.stringify(data)))
    errors.push({ path, msg: "enum" });
  if (t === "object" || (data && typeof data === "object" && !Array.isArray(data))) {
    const req = S.required || [];
    for (const k of req) if (!(k in data)) errors.push({ path: `${path}.${k}`, msg: "required" });
    const props = S.properties || {};
    if (S.additionalProperties === false)
      for (const k of Object.keys(data)) if (!(k in props))
        errors.push({ path: `${path}.${k}`, msg: "additionalProperties" });
    for (const [k, sub] of Object.entries(props))
      if (k in data) errors.push(...validate(sub, data[k], root, `${path}.${k}`));
  }
  if (t === "array" || Array.isArray(data)) {
    if (S.items) data.forEach((v, i) => errors.push(...validate(S.items, v, root, `${path}[${i}]`)));
  }
  if (typeof data === "string") {
    if (S.minLength !== undefined && data.length < S.minLength) errors.push({ path, msg: "minLength" });
    if (S.pattern && !new RegExp(S.pattern).test(data)) errors.push({ path, msg: "pattern" });
  }
  if (typeof data === "number") {
    if (S.minimum !== undefined && data < S.minimum) errors.push({ path, msg: "minimum" });
    if (S.maximum !== undefined && data > S.maximum) errors.push({ path, msg: "maximum" });
  }
  if (S.allOf) for (const s of S.allOf) errors.push(...validate(s, data, root, path));
  if (S.anyOf && !S.anyOf.some(s => validate(s, data, root, path).length === 0))
    errors.push({ path, msg: "anyOf" });
  if (S.oneOf && S.oneOf.filter(s => validate(s, data, root, path).length === 0).length !== 1)
    errors.push({ path, msg: "oneOf" });
  return errors;
}
function resolveRef(root, ref) {
  const parts = ref.replace(/^#\//, "").split("/");
  let n = root;
  for (const p of parts) n = n?.[p.replace(/~1/g, "/").replace(/~0/g, "~")];
  return n || {};
}
