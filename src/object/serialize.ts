export function escapePDFString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function serialize(value: any, indent: number = 0, encryptFn?: (str: string) => string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toString();

  if (typeof value === "string") {
    if (value.startsWith("/")) return value;
    if (value.startsWith("<") && value.endsWith(">")) return value;
    if (encryptFn) {
      return encryptFn(value);
    }
    return `(${escapePDFString(value)})`;
  }
  if (Array.isArray(value)) return `[${value.map((v) => serialize(v, indent, encryptFn)).join(" ")}]`;

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
      .map(([k, v]) => `${nextIndent}/${k} ${serialize(v, indent + 1, encryptFn)}`)
      .join("\n");
    return `<<\n${entries}\n${currentIndent}>>`;
  }
  return "";
}
