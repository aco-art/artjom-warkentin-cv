import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";
const profile = readJson("src/profile.json");
const failures = [];

const forbiddenTerms = [
  "Softwareentwickler",
  "klassischer Programmierer",
  "Product Owner",
  "Projektleiter",
  "Scrum Master",
  "Mechaniker",
  "KFZ",
  "Karosserie"
];

const publicIndex = readText("public/index.html");
const scopedParts = [
  extractTitle(publicIndex),
  extractMetaDescription(publicIndex),
  extractValidateSection(publicIndex, "hero"),
  extractValidateSection(publicIndex, "cta"),
  extractValidateSection(publicIndex, "summary"),
  extractValidateSection(publicIndex, "roles"),
  extractValidateSection(publicIndex, "skills")
].join("\n");

for (const term of forbiddenTerms) {
  if (new RegExp(escapeRegExp(term), "i").test(stripHtml(scopedParts))) {
    failures.push(`Forbidden target-positioning term in public positioning context: ${term}`);
  }
}

for (const file of listFiles(path.join(root, "public")).filter((item) => /\.(html|css|js|json|txt|md)$/i.test(item))) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  if (/href=(["'])(\s*|#)\1/i.test(text)) {
    failures.push(`Empty link in ${relative}`);
  }
}

const requiredPublicFiles = [
  "public/index.html",
  "public/assets/site.css",
  "public/assets/profile-photo.jpeg",
  "public/assets/project-images/vontar-h618-frontside.jpg",
  "public/assets/project-images/vontar-h618-backside.jpg"
];

for (const variant of profile.cvVariants) {
  requiredPublicFiles.push(`public/downloads/${variant.filenameBase}_Public.pdf`);
}
requiredPublicFiles.push(`public/downloads/${profile.cvVariants[0].filenameBase}_Public.docx`);

for (const file of requiredPublicFiles) {
  assertExists(file);
}

if (!publicOnly) {
  for (const variant of profile.cvVariants) {
    assertExists(`dist/for_application/${variant.filenameBase}.pdf`);
  }
  assertExists(`dist/for_application/${profile.cvVariants[0].filenameBase}.docx`);
}

if (!publicIndex.includes("https://github.com/aco-art/")) {
  failures.push("Missing GitHub profile link in public index.");
}
if (!publicIndex.includes("https://github.com/aco-art/vontar-h618-armbian-patche")) {
  failures.push("Missing H618 project link in public index.");
}

if (!/[äöüÄÖÜß]/.test(publicIndex)) {
  failures.push("German Umlauts are missing from public index.");
}

const publicText = listFiles(path.join(root, "public"))
  .filter((file) => /\.(html|css|js|json|txt|md|svg)$/i.test(file))
  .map((file) => [path.relative(root, file), fs.readFileSync(file, "utf8")]);

const privatePatterns = [
  { pattern: /\+49|0176|65165602|Tel\.?|Telefon|Straße|Strasse|Hausnummer/, label: "phone or full-address marker" },
  { pattern: /\.android|Lebenslauf .*\.docx|vontar-h618-armbian-patches\/|\/home\/acoart|\/home\/warkentin/i, label: "private source path marker" }
];

for (const [relative, text] of publicText) {
  for (const { pattern, label } of privatePatterns) {
    if (pattern.test(text)) {
      failures.push(`Public file contains ${label}: ${relative}`);
    }
  }
}

const readme = fs.existsSync(path.join(root, "README.md")) ? readText("README.md") : "";
if (!fs.existsSync(path.join(root, "assets", "profile-photo.jpeg")) && !/TODO: Add profile photo/i.test(readme)) {
  failures.push("Profile photo missing and README has no TODO.");
}

if (!/Add public GitLab Android project URL/.test(readme)) {
  failures.push("README TODO for missing GitLab Android project URL is absent.");
}

if (failures.length) {
  console.error("Validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(publicOnly ? "Public validation passed." : "Validation passed.");

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertExists(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return;
  }
  if (fs.statSync(fullPath).isFile() && fs.statSync(fullPath).size === 0) {
    failures.push(`Required file is empty: ${relativePath}`);
  }
}

function extractTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "";
}

function extractMetaDescription(html) {
  return html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*>/i)?.[1] ?? "";
}

function extractValidateSection(html, sectionName) {
  const pattern = new RegExp(`<[^>]+data-validate-section=["']${escapeRegExp(sectionName)}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
  return html.match(pattern)?.[1] ?? "";
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ");
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
