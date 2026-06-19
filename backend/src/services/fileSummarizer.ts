const MAX_SUMMARY_LENGTH = 300;

function ext(filePath: string): string {
  return "." + filePath.split(".").pop()!.toLowerCase();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function extractExports(lines: string[]): string[] {
  const exports: string[] = [];
  for (const line of lines) {
    const m = line.match(/export\s+(?:default\s+)?(?:function|class|const|type|interface)\s+(\w+)/);
    if (m) exports.push(m[1]);
  }
  return [...new Set(exports)].slice(0, 5);
}

function extractImports(lines: string[]): string[] {
  const deps: string[] = [];
  for (const line of lines) {
    const m = line.match(/from\s+['"]([^'"]+)['"]/);
    if (m && !m[1].startsWith(".")) deps.push(m[1].split("/").pop()!);
  }
  return [...new Set(deps)].slice(0, 5);
}

function extractJsxElements(lines: string[]): string[] {
  const elements = new Set<string>();
  const jsxTagRe = /<([A-Za-z][A-Za-z0-9]*)[\s/>]/g;
  for (const line of lines) {
    let m: RegExpExecArray | null;
    while ((m = jsxTagRe.exec(line)) !== null) {
      const tag = m[1];
      if (tag[0] === tag[0].toLowerCase()) elements.add(tag); // HTML tags only
    }
  }
  return [...elements].slice(0, 6);
}

function summarizePackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content) as { name?: string; description?: string; scripts?: Record<string, string> };
    const scripts = pkg.scripts ? Object.keys(pkg.scripts).join(", ") : "";
    return truncate(
      `Package: ${pkg.name ?? "unknown"}. ${pkg.description ?? ""}. Scripts: ${scripts}`,
      MAX_SUMMARY_LENGTH
    );
  } catch {
    return "package.json configuration file";
  }
}

function summarizeMarkdown(filePath: string, content: string): string {
  const first = content.slice(0, 200).replace(/[#*`]/g, "").trim();
  return truncate(`File: ${filePath}\nContent: ${first}`, MAX_SUMMARY_LENGTH);
}

export function buildFileSummary(filePath: string, content: string): string {
  const extension = ext(filePath);

  if (filePath.endsWith("package.json")) return summarizePackageJson(content);
  if (extension === ".md") return summarizeMarkdown(filePath, content);

  const lines = content.split("\n").slice(0, 50);
  const exports = extractExports(lines);
  const imports = extractImports(lines);
  const jsxElements = extractJsxElements(lines);

  // Determine file type
  let fileType = "Module";
  if ([".tsx", ".jsx"].includes(extension)) fileType = "React Component";
  else if (extension === ".ts" || extension === ".js") {
    if (filePath.includes("route") || filePath.includes("controller")) fileType = "API Route";
    else if (filePath.includes("service")) fileType = "Service";
    else if (filePath.includes("hook") || filePath.includes("use")) fileType = "Hook";
    else if (filePath.includes("util") || filePath.includes("helper")) fileType = "Utility";
    else if (filePath.includes("type") || filePath.includes("interface")) fileType = "Types";
  } else if (extension === ".py") fileType = "Python Module";
  else if (extension === ".css") fileType = "Stylesheet";

  // Extract comments/docstrings for purpose hints
  const commentLines = lines
    .filter((l) => l.trim().startsWith("//") || l.trim().startsWith("*") || l.trim().startsWith("#"))
    .map((l) => l.trim().replace(/^[/*#]+/, "").trim())
    .filter((l) => l.length > 5)
    .slice(0, 2)
    .join(". ");

  const parts = [`File: ${filePath}`, `Type: ${fileType}`];
  if (exports.length) parts.push(`Exports: ${exports.join(", ")}`);
  if (jsxElements.length) parts.push(`Elements: ${jsxElements.join(", ")}`);
  if (imports.length) parts.push(`Dependencies: ${imports.join(", ")}`);
  if (commentLines) parts.push(`Notes: ${commentLines}`);

  return truncate(parts.join("\n"), MAX_SUMMARY_LENGTH);
}
