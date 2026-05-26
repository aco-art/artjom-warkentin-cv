import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";
const profile = readJson("src/profile.json");
const failures = [];
const badTransliteration = "Kla" + "erung";

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
  extractMarker(publicIndex, "hero"),
  extractMarker(publicIndex, "cta"),
  extractMarker(publicIndex, "bring"),
  extractMarker(publicIndex, "short"),
  extractMarker(publicIndex, "roles")
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

for (const file of listFiles(path.join(root, "public"))) {
  const relative = path.relative(root, file);
  if (/Lebenslauf .*\.docx|\.android|vontar-h618-armbian-patches\//i.test(relative)) {
    failures.push(`Public file path references private/source material: ${relative}`);
  }
}

const publicDownloadFiles = listFiles(path.join(root, "public", "downloads"));
for (const file of publicDownloadFiles) {
  const artifactText = extractArtifactText(file);
  if (/\+49|0176|65165602|Telefon|Tel\./.test(artifactText)) {
    failures.push(`Public download appears to contain phone data: ${path.relative(root, file)}`);
  }
}

const cvSourceFiles = [
  "src/cv_master.de.md",
  "src/cv_soltau_it_service.de.md",
  "src/cv_rheinmetall_elektronik.de.md"
];
const placeholderPattern = /src\/profile\.json|generiert|Generator|Platzhalter|vollständige, aus/i;
for (const relativePath of cvSourceFiles) {
  const text = readText(relativePath);
  if (placeholderPattern.test(text)) {
    failures.push(`CV source contains generator/placeholder wording: ${relativePath}`);
  }
  if (!/^### Berufserfahrung$/m.test(text)) {
    failures.push(`CV source lacks Berufserfahrung section: ${relativePath}`);
  }
  const stationCount = (text.match(/^####\s+\d{2}/gm) ?? []).length;
  if (stationCount < 4) {
    failures.push(`CV source has too few career stations (${stationCount}): ${relativePath}`);
  }
}

const filesForTextQuality = [
  ...publicText.map(([relative]) => relative),
  ...cvSourceFiles,
  "src/profile.json"
];
for (const relativePath of filesForTextQuality) {
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  const text = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (text.includes(badTransliteration)) {
    failures.push(`Forbidden transliteration found in ${relativePath}`);
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

function extractMarker(html, sectionName) {
  const pattern = new RegExp(`<!-- validate:${escapeRegExp(sectionName)}:start -->([\\s\\S]*?)<!-- validate:${escapeRegExp(sectionName)}:end -->`, "i");
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

function extractArtifactText(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".docx") {
    try {
      return execFileSync("unzip", ["-p", file], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    } catch {
      return fs.readFileSync(file).toString("latin1");
    }
  }
  return fs.readFileSync(file).toString("latin1");
}
