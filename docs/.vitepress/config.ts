import { defineConfig } from "vitepress";
import { readdirSync, existsSync } from "fs";
import { resolve, basename } from "path";

const docsDir = resolve(__dirname, "..");

/** Scan a docs/api/<subfolder> directory and return a sidebar group. */
function apiSidebarGroup(subfolder: string) {
  const dir = resolve(docsDir, "api", subfolder);
  if (!existsSync(dir)) return null;

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (files.length === 0) return null;

  // "type-aliases" → "Type Aliases"
  const label = subfolder
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    text: label,
    items: files.map((f) => {
      const name = basename(f, ".md");
      return { text: name, link: `/api/${subfolder}/${name}` };
    }),
  };
}

const apiSubfolders = ["classes", "interfaces", "functions", "type-aliases"];

const apiSidebar = [
  {
    text: "API Reference",
    items: [{ text: "Overview", link: "/api/" }],
  },
  ...apiSubfolders.map(apiSidebarGroup).filter(Boolean),
];

export default defineConfig({
  title: "MheePDF",
  description:
    "TypeScript PDF generation library with Thai language support, custom fonts, images, tables, encryption, and compression",
  base: "/mheePDF/",
  themeConfig: {
    logo: "/resources/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Examples", link: "/guide/examples/basic" },
      { text: "API Reference", link: "/api/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Thai Font Support", link: "/guide/thai" },
            { text: "Tables", link: "/guide/tables" },
            { text: "Images", link: "/guide/images" },
            { text: "Lines", link: "/guide/line" },
            { text: "SVG Vector Graphics", link: "/guide/svg" },
            { text: "Encryption & Security", link: "/guide/encryption" },
            { text: "Templates & Loops", link: "/guide/templates" },
            { text: "Page Options", link: "/guide/page-options" },
            { text: "Document Metadata", link: "/guide/metadata" },
          ],
        },
        {
          text: "Examples",
          items: [
            { text: "Basic Hello World", link: "/guide/examples/basic" },
            { text: "Thai Language Support", link: "/guide/examples/thai" },
            { text: "Table Grid & Styling", link: "/guide/examples/table" },
            { text: "Images & SVG Vectors", link: "/guide/examples/image" },
            { text: "PDF Encryption & Security", link: "/guide/examples/encrypt" },
            { text: "Student Certificate Template", link: "/guide/examples/certificate" },
            { text: "Professional Invoice", link: "/guide/examples/invoice" },
            { text: "POS Receipt Slip", link: "/guide/examples/receipt" },
          ],
        },
      ],
      "/api/": apiSidebar,
    },
    socialLinks: [{ icon: "github", link: "https://github.com/a1um1/mheePDF" }],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present a1um1",
    },
  },
});
