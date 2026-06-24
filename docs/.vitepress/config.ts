import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "MheePDF",
  description: "TypeScript PDF generation library with Thai language support, custom fonts, images, tables, encryption, and compression",
  base: "/mheePDF/",
  themeConfig: {
    logo: "/resources/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "API Reference", link: "/api/" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Thai Font Support", link: "/guide/thai" },
            { text: "Tables", link: "/guide/tables" },
            { text: "Images", link: "/guide/images" }
          ]
        }
      ],
      "/api/": [
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/api/" }
          ]
        },
        {
          text: "Core Classes",
          items: [
            { text: "MheePDF", link: "/api/classes/MheePDF" },
            { text: "Table", link: "/api/classes/Table" },
            { text: "Text", link: "/api/classes/Text" },
            { text: "Image", link: "/api/classes/Image" },
            { text: "Color", link: "/api/classes/Color" }
          ]
        },
        {
          text: "PDF Objects & Low Level",
          items: [
            { text: "PDFEngine", link: "/api/classes/PDFEngine" },
            { text: "PDFPageWriter", link: "/api/classes/PDFPageWriter" },
            { text: "PDFType0FontObject", link: "/api/classes/PDFType0FontObject" },
            { text: "PDFCatalogObject", link: "/api/classes/PDFCatalogObject" },
            { text: "PDFEncryptObject", link: "/api/classes/PDFEncryptObject" },
            { text: "PDFFontObject", link: "/api/classes/PDFFontObject" },
            { text: "PDFIndirectBaseObject", link: "/api/classes/PDFIndirectBaseObject" },
            { text: "PDFIndirectStreamObject", link: "/api/classes/PDFIndirectStreamObject" },
            { text: "PDFInfoObject", link: "/api/classes/PDFInfoObject" },
            { text: "PDFPageObject", link: "/api/classes/PDFPageObject" },
            { text: "PDFPagesObject", link: "/api/classes/PDFPagesObject" }
          ]
        },
        {
          text: "Interfaces & Utilities",
          items: [
            { text: "Component", link: "/api/interfaces/Component" },
            { text: "LayoutContext", link: "/api/interfaces/LayoutContext" },
            { text: "serialize", link: "/api/functions/serialize" }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/a1um1/mheePDF" }
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026-present a1um1"
    }
  }
})
