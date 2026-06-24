export function serialize(value: any, indent: number = 0): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toString();

  if (typeof value === "string") {
    if (value.startsWith("/")) return value;
    return `(${value})`;
  }
  if (Array.isArray(value)) return `[${value.map((v) => serialize(v, indent)).join(" ")}]`;

  if (typeof value === "object") {
    if (typeof value.toRef === "function") return value.toRef().toString();
    if (
      value._type === "reference" ||
      value._type === "stream" ||
      value._type === "tailer"
    )
      return value.toString();

    // ponytail: Format dictionary entries with standard indentation for readability
    const currentIndent = "  ".repeat(indent);
    const nextIndent = "  ".repeat(indent + 1);
    const entries = Object.entries(value)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${nextIndent}/${k} ${serialize(v, indent + 1)}`)
      .join("\n");
    return `<<\n${entries}\n${currentIndent}>>`;
  }
  return "";
}
