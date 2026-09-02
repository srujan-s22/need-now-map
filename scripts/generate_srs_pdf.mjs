import fs from "fs";
import http from "http";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRS_MD_PATH = path.resolve(__dirname, "../SRS.md");
const OUTPUT_PDF_PATH = path.resolve(__dirname, "../SRS.pdf");
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!fs.existsSync(SRS_MD_PATH)) {
  console.error(`Error: SRS.md not found at ${SRS_MD_PATH}`);
  process.exit(1);
}

const markdownContent = fs.readFileSync(SRS_MD_PATH, "utf-8");

async function buildHtml() {
  // Fetch marked.min.js from CDN to pre-render markdown server-side
  console.log("Loading marked parser in Node.js...");
  const markedRes = await fetch("https://cdn.jsdelivr.net/npm/marked@9.1.2/marked.min.js");
  const markedCode = await markedRes.text();

  // Create marked instance in Node
  const markedModule = {};
  const runMarked = new Function("exports", "module", markedCode);
  runMarked(markedModule, { exports: markedModule });
  const marked = markedModule.marked || markedModule;

  // Custom renderer
  const renderer = new marked.Renderer();

  // Custom blockquote for GitHub-style Alerts
  renderer.blockquote = function(quote) {
    if (quote.includes('[!NOTE]')) {
      const body = quote.replace(/<p>\s*\[!NOTE\]\s*/i, '<p>');
      return '<div class="callout callout-note"><div class="callout-title">ℹ Note</div>' + body + '</div>';
    } else if (quote.includes('[!IMPORTANT]')) {
      const body = quote.replace(/<p>\s*\[!IMPORTANT\]\s*/i, '<p>');
      return '<div class="callout callout-important"><div class="callout-title">⚠ Important Requirement</div>' + body + '</div>';
    } else if (quote.includes('[!WARNING]')) {
      const body = quote.replace(/<p>\s*\[!WARNING\]\s*/i, '<p>');
      return '<div class="callout callout-warning"><div class="callout-title">⚡ Warning / Security Notice</div>' + body + '</div>';
    } else if (quote.includes('[!TIP]')) {
      const body = quote.replace(/<p>\s*\[!TIP\]\s*/i, '<p>');
      return '<div class="callout callout-tip"><div class="callout-title">💡 Operational Tip</div>' + body + '</div>';
    }
    return '<blockquote>' + quote + '</blockquote>';
  };

  // Custom code renderer for Mermaid
  renderer.code = function(code, lang) {
    if (lang === 'mermaid') {
      return '<div class="mermaid-container"><div class="mermaid">' + code + '</div></div>';
    }
    return '<pre><code class="language-' + (lang || 'text') + '">' + 
      code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + 
      '</code></pre>';
  };

  marked.setOptions({
    renderer: renderer,
    gfm: true,
    breaks: false
  });

  console.log("Parsing markdown into complete HTML DOM...");
  let rawHtml = marked.parse(markdownContent);

  // Replace verification tags with styled badge spans
  rawHtml = rawHtml
    .replace(/\[VERIFIED IN CODE\]/g, '<span class="badge badge-verified">VERIFIED IN CODE</span>')
    .replace(/\[VERIFIED IN CONFIGURATION\]/g, '<span class="badge badge-verified">VERIFIED IN CONFIG</span>')
    .replace(/\[INFERRED\]/g, '<span class="badge badge-inferred">INFERRED</span>')
    .replace(/\[NOT IMPLEMENTED\]/g, '<span class="badge badge-not-impl">NOT IMPLEMENTED</span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NeedNow Map — Software Requirements Specification (SRS)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- KaTeX CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">

  <style>
    :root {
      --primary: #1e40af;
      --primary-light: #dbeafe;
      --text: #1f2937;
      --text-muted: #4b5563;
      --bg: #ffffff;
      --border: #e2e8f0;
      --border-dark: #cbd5e1;
      --code-bg: #0f172a;
      --code-text: #f8fafc;
    }

    * {
      box-sizing: border-box;
    }

    @page {
      size: A4 portrait;
      margin: 18mm 14mm 18mm 14mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #6b7280;
      }
      @bottom-left {
        content: "NeedNow Map — Software Requirements Specification (SRS v1.0)";
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #6b7280;
      }
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9.5pt;
      line-height: 1.55;
      color: var(--text);
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .document-container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
      break-after: avoid;
    }

    h1 {
      font-size: 19pt;
      font-weight: 800;
      border-bottom: 2.5px solid var(--primary);
      padding-bottom: 6px;
      margin-top: 0.8em;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    h2 {
      font-size: 13.5pt;
      font-weight: 750;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 1.6em;
      color: #1e293b;
      letter-spacing: -0.01em;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      margin-top: 1.2em;
      color: #334155;
    }

    h4 {
      font-size: 10pt;
      font-weight: 650;
      color: #475569;
    }

    p {
      margin-top: 0.3em;
      margin-bottom: 0.7em;
      color: #374151;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 8pt;
      line-height: 1.35;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
    }

    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* Lists */
    ul, ol {
      margin-top: 0.3em;
      margin-bottom: 0.7em;
      padding-left: 20px;
    }

    li {
      margin-bottom: 0.25em;
    }

    /* Code Blocks */
    pre {
      background-color: var(--code-bg);
      color: var(--code-text);
      border-radius: 6px;
      padding: 10px 12px;
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 7.5pt;
      line-height: 1.45;
      overflow-x: auto;
      border: 1px solid #1e293b;
      margin: 8px 0 14px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    code {
      font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace;
      font-size: 8pt;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 1.5px 4px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }

    pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: 7.5pt;
    }

    /* Alerts / Callouts */
    .callout {
      padding: 10px 14px;
      border-radius: 6px;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
      line-height: 1.45;
      page-break-inside: avoid;
      break-inside: avoid;
      border-left: 4px solid;
    }

    .callout-note {
      background-color: #eff6ff;
      border-color: #3b82f6;
      color: #1e3a8a;
    }

    .callout-important {
      background-color: #fef2f2;
      border-color: #ef4444;
      color: #991b1b;
    }

    .callout-warning {
      background-color: #fffbeb;
      border-color: #f59e0b;
      color: #92400e;
    }

    .callout-tip {
      background-color: #f0fdf4;
      border-color: #10b981;
      color: #065f46;
    }

    .callout-title {
      font-weight: 700;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.05em;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 1.5px 5px;
      font-size: 7pt;
      font-weight: 700;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-left: 4px;
      vertical-align: middle;
    }

    .badge-verified {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .badge-inferred {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .badge-not-impl {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Mermaid Diagrams */
    .mermaid-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 12px 0 16px 0;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid {
      max-width: 100%;
      text-align: center;
    }

    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
    }

    /* KaTeX Math */
    .katex-display {
      margin: 6px 0;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 3px 0;
    }

    /* Dividers */
    hr {
      border: 0;
      height: 1px;
      background-color: #e2e8f0;
      margin: 18px 0;
    }

    /* Print Specific Rules */
    @media print {
      body {
        font-size: 9pt;
      }
      .mermaid-container, pre, table, .callout {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      h1, h2, h3, h4 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="document-container" id="content">
    ${rawHtml}
  </div>

  <!-- Mermaid JS & KaTeX Math Engines -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>

  <script>
    (async function() {
      // Initialize Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        themeVariables: {
          primaryColor: '#e0f2fe',
          primaryBorderColor: '#0284c7',
          primaryTextColor: '#0f172a',
          lineColor: '#475569',
          secondaryColor: '#f1f5f9',
          tertiaryColor: '#ffffff'
        },
        securityLevel: 'loose',
        flowchart: { curve: 'basis', useMaxWidth: true },
        sequence: { useMaxWidth: true, actorMargin: 40 }
      });

      // Render KaTeX Math
      if (window.renderMathInElement) {
        renderMathInElement(document.getElementById("content"), {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      }

      // Render all Mermaid diagrams into SVGs
      try {
        await mermaid.run({
          nodes: document.querySelectorAll('.mermaid')
        });
      } catch (err) {
        console.warn("Mermaid render error:", err);
      }

      // Signal completion
      document.body.setAttribute("data-render-complete", "true");
    })();
  </script>
</body>
</html>`;
}

async function main() {
  const fullHtml = await buildHtml();

  // Start local server to serve the page
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fullHtml);
  });

  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    const targetUrl = `http://127.0.0.1:${port}/`;
    console.log(`Render server active at ${targetUrl}`);
    console.log("Invoking Google Chrome print-to-pdf engine...");

    const chromeArgs = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=15000",
      "--no-pdf-header-footer",
      `--print-to-pdf=${OUTPUT_PDF_PATH}`,
      targetUrl
    ];

    execFile(CHROME_PATH, chromeArgs, (error, stdout, stderr) => {
      server.close();

      if (error) {
        console.error("Chrome export error:", error);
        if (stderr) console.error(stderr);
        process.exit(1);
      }

      if (fs.existsSync(OUTPUT_PDF_PATH)) {
        const stats = fs.statSync(OUTPUT_PDF_PATH);
        console.log(`\n======================================================`);
        console.log(`✓ COMPLETE SRS.PDF GENERATED SUCCESSFULLY!`);
        console.log(`======================================================`);
        console.log(`Output File: ${OUTPUT_PDF_PATH}`);
        console.log(`File Size:   ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`======================================================\n`);
      } else {
        console.error("PDF was not created at target location.");
        process.exit(1);
      }
    });
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
