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
    return typeStr.replace(/\\\|/g, "|");
  }

  const cleaned = cleanType(typeStr);

  if (!cleaned.includes("{")) {
    return `\`${cleaned}\``;
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

  return html;
}

function extractCleanName(cell: string): string {
  // Remove HTML comments and tags
  let cleaned = cell.replace(/<[^>]*>/g, "");
  // Remove markdown links like [foo](bar) -> foo
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove backticks
  cleaned = cleaned.replace(/`/g, "");
  // Trim spaces
  cleaned = cleaned.trim();
  // Remove trailing optional sign '?'
  if (cleaned.endsWith("?")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned.trim();
}

function stripParentPrefix(cell: string, parentCleanName: string): string {
  const prefix = parentCleanName + ".";
  if (cell.includes(prefix)) {
    return cell.replace(prefix, "");
  }
  // Fallback in case of backticks around individual parts:
  const backtickPrefix = "`" + parentCleanName + ".";
  if (cell.includes(backtickPrefix)) {
    return cell.replace(backtickPrefix, "`");
  }
  return cell;
}

function parseTableLine(line: string): string[] {
  const cols = line.split(/(?<!\\)\|/).map((c) => c.trim());
  if (cols.length > 0 && cols[0] === "") cols.shift();
  if (cols.length > 0 && cols[cols.length - 1] === "") cols.pop();
  return cols;
}

function htmlifyCellContent(cellStr: string): string {
  if (cellStr.startsWith('<code class="vp-api-type-block">')) {
    return cellStr;
  }

  let html = cellStr.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    let cleanUrl = url;
    if (cleanUrl.endsWith(".md")) {
      cleanUrl = cleanUrl.slice(0, -3) + ".html";
    } else if (cleanUrl.includes(".md#")) {
      cleanUrl = cleanUrl.replace(".md#", ".html#");
    }
    return `<a href="${cleanUrl}">${text}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  const tags: string[] = [];
  const htmlTagRegex = /<\/?(a|code|span|div|label|input|br)\b[^>]*>/gi;
  html = html.replace(htmlTagRegex, (match) => {
    tags.push(match);
    return `__HTML_TAG_${tags.length - 1}__`;
  });

  html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/__HTML_TAG_(\d+)__/g, (_, idx) => tags[parseInt(idx)]);
  
  // Clean all escaped pipes
  html = html.replace(/\\\|/g, "|");
  
  return html;
}

function processTable(tableLines: string[]): string {
  if (tableLines.length < 3) {
    return tableLines.join("\n");
  }

  // 1. Parse header
  const headerCols = parseTableLine(tableLines[0]);

  // 2. Identify key columns
  const propertyColIdx = headerCols.findIndex(
    (c) =>
      c.toLowerCase() === "property" ||
      c.toLowerCase() === "parameter" ||
      c.toLowerCase() === "member" ||
      c.toLowerCase() === "name",
  );
  const typeColIdx = headerCols.findIndex((c) => c.toLowerCase() === "type");
  const definedInColIdx = headerCols.findIndex((c) => c.toLowerCase() === "defined in");

  // 3. Parse data rows
  const dataRows: string[][] = [];
  for (let i = 2; i < tableLines.length; i++) {
    const cols = parseTableLine(tableLines[i]);
    if (cols.length > 0) {
      dataRows.push(cols);
    }
  }

  // 4. Extract clean names
  const cleanNames = dataRows.map((row) => {
    if (propertyColIdx !== -1 && row[propertyColIdx]) {
      return extractCleanName(row[propertyColIdx]);
    }
    return "";
  });

  // Identify which cleanName is a parent
  const parentNamesSet = new Set<string>();
  for (let i = 0; i < cleanNames.length; i++) {
    const name = cleanNames[i];
    if (!name) continue;
    const isParent = cleanNames.some((other) => other && other.startsWith(name + "."));
    if (isParent) {
      parentNamesSet.add(name);
    }
  }

  // Build the HTML Table
  let html = `<div class="vp-api-table-wrapper">\n`;
  html += `<table>\n`;

  // Header
  html += `  <thead>\n    <tr>\n`;
  headerCols.forEach((colName, idx) => {
    if (idx === definedInColIdx) return;
    html += `      <th>${colName}</th>\n`;
  });
  html += `    </tr>\n  </thead>\n`;

  // Body
  html += `  <tbody>\n`;

  dataRows.forEach((row, i) => {
    const cleanName = cleanNames[i];
    const isParent = parentNamesSet.has(cleanName);

    let parentPath = "";
    let depth = 0;
    if (cleanName) {
      const parts = cleanName.split(".");
      depth = parts.length - 1;
      if (depth > 0) {
        parentPath = parts.slice(0, -1).join(".");
      }
    }

    const safeId = cleanName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

    // 1. Process Type cell
    let typeCell = row[typeColIdx] || "";
    if (typeColIdx !== -1) {
      if (isParent && typeCell.includes("{")) {
        typeCell = `<code>object</code>`;
      } else {
        typeCell = htmlifyCellContent(formatTypeString(typeCell));
      }
    }

    // 2. Process Defined In & Property cells
    let fileLink = "";
    if (definedInColIdx !== -1 && row[definedInColIdx]) {
      const srcCell = row[definedInColIdx];
      const srcMatch = srcCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (srcMatch) {
        const linkText = srcMatch[1];
        const linkUrl = srcMatch[2];
        const fileName = linkText.split("/").pop();
        fileLink = `<br><span style="font-size: 0.8em; opacity: 0.7;margin-top:-6px;display:block;"><a href="${linkUrl}">${fileName}</a></span>`;
      }
    }

    let propCell = row[propertyColIdx] || "";
    let displayName = propCell;
    if (depth > 0 && parentPath) {
      displayName = stripParentPrefix(propCell, parentPath);
    }
    displayName = htmlifyCellContent(displayName);

    const propMatch = propCell.match(/(<a id="([^"]+)">.*?<\/a>\s*)(.+)/);
    let cellContent = "";
    if (propMatch) {
      const anchorHtml = propMatch[1];
      const anchorId = propMatch[2];
      const rawNamePart = propMatch[3];
      const displayNamePart =
        depth > 0 && parentPath ? stripParentPrefix(rawNamePart, parentPath) : rawNamePart;
      const formattedName = htmlifyCellContent(displayNamePart);
      cellContent = `${anchorHtml}<a href="#${anchorId}">${formattedName}</a>${fileLink}`;
    } else {
      cellContent = `${displayName}${fileLink}`;
    }

    let nameCellHtml = "";
    const paddingLeft = depth * 20 + 16;
    const styleAttr = `style="padding-left: ${paddingLeft}px !important;"`;

    if (isParent) {
      nameCellHtml = `
        <div class="vp-api-param-name-wrapper">
          <span class="vp-api-toggle-label" aria-expanded="false" data-row-path="${cleanName}">
            ${cellContent}
          </span>
        </div>
      `;
    } else {
      nameCellHtml = cellContent;
    }

    let trAttrs = "";
    if (depth > 0 && parentPath) {
      trAttrs += ` class="vp-api-child-row" data-parent-path="${parentPath}"`;
    }

    html += `    <tr${trAttrs}>\n`;
    row.forEach((cell, idx) => {
      if (idx === definedInColIdx) return;
      if (idx === propertyColIdx) {
        html += `      <td ${styleAttr}>${nameCellHtml}</td>\n`;
      } else if (idx === typeColIdx) {
        html += `      <td>${typeCell}</td>\n`;
      } else {
        html += `      <td>${htmlifyCellContent(cell)}</td>\n`;
      }
    });
    html += `    </tr>\n`;
  });

  html += `  </tbody>\n`;
  html += `</table>\n`;
  html += `</div>`;

  return html;
}

function processMarkdown(content: string): string {
  const lines = content.split("\n");
  const processedLines: string[] = [];

  let inTable = false;
  let tableLines: string[] = [];
  let isFirstDefinedIn = true;
  let lastHeadingIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "## Extends") {
      let nextIdx = i + 1;
      while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
        nextIdx++;
      }
      if (nextIdx < lines.length && lines[nextIdx].trim().startsWith("- ")) {
        const extendsLine = lines[nextIdx].trim();
        const extendsMatch = extendsLine.match(/-\s+\[([^\]]+)\]\(([^)]+)\)/);
        if (extendsMatch) {
          const extendsText = extendsMatch[1].replace(/`/g, "");
          let extendsUrl = extendsMatch[2];
          if (extendsUrl.endsWith(".md")) {
            extendsUrl = extendsUrl.slice(0, -3) + ".html";
          } else if (extendsUrl.includes(".md#")) {
            extendsUrl = extendsUrl.replace(".md#", ".html#");
          }
          const extendsHtml = `<span class="vp-api-extends-badge">Extends <a href="${extendsUrl}">${extendsText}<span></span></a></span>`;
          const h1Idx = processedLines.findIndex(
            (line) => line.trim().startsWith("# ") && !line.trim().startsWith("##"),
          );
          if (h1Idx !== -1) {
            processedLines[h1Idx] = processedLines[h1Idx].trim() + " " + extendsHtml;
          }
          i = nextIdx;
          continue;
        }
      }
    }

    if (trimmed === "## Constructors") {
      continue;
    }

    if (trimmed.startsWith("#")) {
      lastHeadingIdx = processedLines.length;
    }

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
      if (!inTable) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith("|") && nextLine.includes("---")) {
          inTable = true;
          tableLines = [line];
        } else {
          processedLines.push(line);
        }
      } else {
        tableLines.push(line);
      }
    } else {
      if (inTable) {
        processedLines.push(processTable(tableLines));
        inTable = false;
        tableLines = [];
      }
      processedLines.push(line);
    }
  }

  if (inTable) {
    processedLines.push(processTable(tableLines));
  }

  return processedLines.join("\n");
}

function injectOutlineFalse(content: string): string {
  if (content.startsWith("---")) {
    const secondTripleDashIdx = content.indexOf("---", 3);
    if (secondTripleDashIdx !== -1) {
      const frontmatter = content.slice(3, secondTripleDashIdx);
      if (!frontmatter.includes("outline:")) {
        return `---${frontmatter}outline: false\n` + content.slice(secondTripleDashIdx);
      }
      return content;
    }
  }
  return `---\noutline: false\n---\n\n` + content;
}

async function main() {
  const apiDir = join(process.cwd(), "docs/api");
  const globScanner = new Bun.Glob("**/*.md");

  for await (const file of globScanner.scan(apiDir)) {
    const filePath = join(apiDir, file);
    const content = await readFile(filePath, "utf-8");

    // Process markdown content
    const cleaned = injectOutlineFalse(processMarkdown(content));

    await writeFile(filePath, cleaned, "utf-8");
  }
  console.log("Processed API tables and horizontal rules successfully.");
}

main().catch(console.error);
