import { glob } from "bun";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

function cleanType(typeStr: string): string {
  let cleaned = typeStr
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\</g, "<")
    .replace(/\\>/g, ">")
    .replace(/\\\|/g, "|")
    .replace(/`/g, "")
    .trim();
  return cleaned;
}

function formatTypeString(typeStr: string): string {
  if (typeStr.includes("](") && !typeStr.includes("{")) {
    return typeStr.replace(/(?<!\\)\|/g, "\\|");
  }

  const cleaned = cleanType(typeStr);

  if (!cleaned.includes("{")) {
    return `\`${cleaned}\``.replace(/(?<!\\)\|/g, "\\|");
  }

  let indent = 0;
  let result = "";
  let i = 0;

  while (i < cleaned.length) {
    const char = cleaned[i];

    if (char === "{") {
      result += "{<br>" + "  ".repeat(++indent);
      while (cleaned[i + 1] === " ") i++;
    } else if (char === "}") {
      indent = Math.max(0, indent - 1);
      result += "<br>" + "  ".repeat(indent) + "}";
      while (cleaned[i + 1] === " ") i++;
    } else if (char === ";") {
      result += ";";
      if (cleaned[i + 1] !== "}") {
        result += "<br>" + "  ".repeat(indent);
      }
      while (cleaned[i + 1] === " ") i++;
    } else if (char === "<") {
      result += "&lt;";
    } else if (char === ">") {
      result += "&gt;";
    } else if (char === "&") {
      result += "&amp;";
    } else {
      result += char;
    }
    i++;
  }

  let formatted = result.replace(/(<br>\s*)+<br>/g, "<br>").trim();
  const html = `<code class="vp-api-type-block">${formatted}</code>`;

  return html.replace(/(?<!\\)\|/g, "\\|");
}

function processMarkdown(content: string): string {
  const lines = content.split("\n");
  const processedLines: string[] = [];

  let inTable = false;
  let headerCols: string[] = [];
  let propertyColIdx = -1;
  let definedInColIdx = -1;
  let typeColIdx = -1;
  let isFirstDefinedIn = true;
  let lastHeadingIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track heading line index in processedLines
    if (trimmed.startsWith("#")) {
      lastHeadingIdx = processedLines.length;
    }

    // Skip original separators
    if (trimmed === "***" || trimmed === "---") {
      continue;
    }

    if (trimmed.startsWith("Defined in: [") && !inTable) {
      const match = trimmed.match(/Defined in: \[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const linkText = match[1];
        const linkUrl = match[2];
        if (isFirstDefinedIn) {
          isFirstDefinedIn = false;
          processedLines.push(
            `<p class="vp-api-defined-in-top">Defined in: <a href="${linkUrl}">${linkText}</a></p>`,
          );
        } else {
          // Member-level: Append to the last matched heading
          if (lastHeadingIdx !== -1) {
            const heading = processedLines[lastHeadingIdx];
            processedLines[lastHeadingIdx] =
              `${heading} <span class="vp-api-defined-in-member-inline"><a href="${linkUrl}">${linkText}</a></span>`;
          } else {
            processedLines.push(
              `<p class="vp-api-defined-in-member">Defined in: <a href="${linkUrl}">${linkText}</a></p>`,
            );
          }
        }
        continue;
      }
    }

    if (trimmed.startsWith("|")) {
      const cols = line.split(/(?<!\\)\|/).map((c) => c.trim());

      if (!inTable) {
        // Detect table header that has "Defined in" and/or "Property" / "Parameter" / "Name" / "Type"
        propertyColIdx = cols.findIndex(
          (c) =>
            c.toLowerCase() === "property" ||
            c.toLowerCase() === "parameter" ||
            c.toLowerCase() === "member" ||
            c.toLowerCase() === "name",
        );
        typeColIdx = cols.findIndex((c) => c.toLowerCase() === "type");
        definedInColIdx = cols.findIndex((c) => c.toLowerCase() === "defined in");

        if (propertyColIdx !== -1 || typeColIdx !== -1) {
          inTable = true;
          headerCols = [...cols];

          // Remove the "Defined in" column from header if it exists
          if (definedInColIdx !== -1) {
            cols.splice(definedInColIdx, 1);
          }
          processedLines.push(cols.join(" | "));
          continue;
        }
      } else {
        // Table separator or data rows
        if (cols.length === headerCols.length) {
          if (line.includes("---")) {
            // Remove divider column for alignment row if it exists
            if (definedInColIdx !== -1) {
              cols.splice(definedInColIdx, 1);
            }
            processedLines.push(cols.join(" | "));
            continue;
          }

          // Clean Type cell formatting and format object types nicely
          if (typeColIdx !== -1) {
            cols[typeColIdx] = formatTypeString(cols[typeColIdx]);
          }

          // Data row processing for "Defined in" column merging
          if (definedInColIdx !== -1 && propertyColIdx !== -1) {
            const propCell = cols[propertyColIdx];
            const srcCell = cols[definedInColIdx];

            let updatedPropCell = propCell;

            // 1. Parse Defined in cell link
            const srcMatch = srcCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
            let fileLink = "";
            if (srcMatch) {
              const linkText = srcMatch[1];
              const linkUrl = srcMatch[2];
              const fileName = linkText.split("/").pop(); // Only show filename
              fileLink = `<br><span style="font-size: 0.8em; opacity: 0.7;margin-top:-6px;display:block;">[${fileName}](${linkUrl})</span>`;
            }

            // 2. Parse Property cell and make name a link to its anchor
            const propMatch = propCell.match(/(<a id="([^"]+)">.*?<\/a>\s*)(.+)/);
            if (propMatch) {
              const anchorHtml = propMatch[1];
              const anchorId = propMatch[2];
              const propName = propMatch[3];

              // Format property name as a link to its anchor, and append small file link
              updatedPropCell = `${anchorHtml}[${propName}](#${anchorId})${fileLink}`;
            } else {
              updatedPropCell = `${propCell}${fileLink}`;
            }

            cols[propertyColIdx] = updatedPropCell;
            cols.splice(definedInColIdx, 1);
          }

          processedLines.push(cols.join(" | "));
          continue;
        } else {
          inTable = false;
        }
      }
    } else {
      inTable = false;
    }

    processedLines.push(line);
  }

  return processedLines.join("\n");
}

async function main() {
  const apiDir = join(process.cwd(), "docs/api");
  const globScanner = new Bun.Glob("**/*.md");

  for await (const file of globScanner.scan(apiDir)) {
    const filePath = join(apiDir, file);
    const content = await readFile(filePath, "utf-8");

    // Process markdown content
    const cleaned = processMarkdown(content);

    await writeFile(filePath, cleaned, "utf-8");
  }
  console.log("Processed API tables and horizontal rules successfully.");
}

main().catch(console.error);
