import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

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
  "public/assets/profile-photo.png",
  "public/assets/project-images/vontar-h618-frontside.jpg",
  "public/assets/project-images/vontar-h618-backside.jpg",
  "public/downloads/Artjom_Warkentin_Lebenslauf_Public.pdf",
  "public/downloads/Artjom_Warkentin_Kurzprofil_Public.pdf",
  "public/downloads/Artjom_Warkentin_Technikprofil_Public.pdf"
];

for (const file of requiredPublicFiles) {
  assertExists(file);
}

const publicDownloadFiles = listFiles(path.join(root, "public", "downloads")).map((file) => path.relative(root, file));
const allowedDownloads = new Set(requiredPublicFiles.filter((file) => file.startsWith("public/downloads/")));
for (const file of publicDownloadFiles) {
  if (!allowedDownloads.has(file)) {
    failures.push(`Unexpected public download: ${file}`);
  }
  if (/\.(docx|txt|log)$/i.test(file)) {
    failures.push(`Non-PDF file in public downloads: ${file}`);
  }
  if (/Rheinmetall|Suedsee|Soltau_IT_Service|Soltau.*IT.?Service|Technischer_IT_Service_Elektronik/i.test(file)) {
    failures.push(`Company-targeted or old CV filename in public downloads: ${file}`);
  }
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

const publicHtmlText = stripHtml(publicIndex);
const forbiddenPublicLabels = [
  "Rheinmetall",
  "Rheinmetall Elektronik CV",
  "Soltau IT-Service CV",
  "Master CV DOCX",
  "Master CV",
  "DOCX"
];
for (const label of forbiddenPublicLabels) {
  if (new RegExp(escapeRegExp(label), "i").test(publicHtmlText)) {
    failures.push(`Public HTML contains forbidden public download/target label: ${label}`);
  }
}

const publicTextFiles = listFiles(path.join(root, "public"))
  .filter((file) => /\.(html|css|js|json|txt|md|svg)$/i.test(file))
  .map((file) => [path.relative(root, file), fs.readFileSync(file, "utf8")]);

const privatePatterns = [
  { pattern: /\+49|0176|65165602|Straße|Strasse|Hausnummer|[0-9]{5}/, label: "phone number or full-address marker" },
  { pattern: /\.android|Lebenslauf .*\.docx|vontar-h618-armbian-patches\/|\/home\/acoart|\/home\/warkentin/i, label: "private source path marker" }
];

for (const [relative, text] of publicTextFiles) {
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

for (const relative of allowedDownloads) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const artifactText = await extractArtifactText(file);
  if (/\+49|0176|65165602/.test(artifactText)) {
    failures.push(`Public download appears to contain phone data: ${relative}`);
  }
  if (/Rheinmetall|Soltau IT-Service CV|Rheinmetall Elektronik CV|DOCX/i.test(artifactText)) {
    failures.push(`Public PDF contains company-targeted label or DOCX wording: ${relative}`);
  }
  if (/konnten\.10\/|\)FORTBILDUNG|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(artifactText)) {
    failures.push(`Public PDF text extraction contains broken layout markers or control characters: ${relative}`);
  }
  if (!/BGA-Rework/.test(artifactText)) {
    failures.push(`Public PDF text extraction does not preserve BGA-Rework wording: ${relative}`);
  }
}

for (const document of profile.publicDocuments) {
  const htmlPath = path.join(root, "dist", "html", `${document.id}.public.html`);
  if (!fs.existsSync(htmlPath)) {
    failures.push(`Missing public PDF HTML source: ${path.relative(root, htmlPath)}`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  if (!/data-cv-template="unified"/.test(html)) {
    failures.push(`Public PDF HTML does not use unified CV template: ${path.relative(root, htmlPath)}`);
  }
}

const cvSourceFiles = [
  "src/cv_master.de.md",
  "src/cv_it_service.de.md",
  "src/cv_elektronik.de.md"
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
  ...publicTextFiles.map(([relative]) => relative),
  ...cvSourceFiles,
  "src/profile.json",
  "README.md"
];
for (const relativePath of filesForTextQuality) {
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  const text = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (text.includes(badTransliteration)) {
    failures.push(`Forbidden transliteration found in ${relativePath}`);
  }
  if (/upstream kernel developer|Linux maintainer|U-Boot maintainer|professional embedded developer/i.test(text)) {
    failures.push(`Forbidden H618 overclaim found in ${relativePath}`);
  }
}

const readme = fs.existsSync(path.join(root, "README.md")) ? readText("README.md") : "";
if (!fs.existsSync(path.join(root, "assets", "profile-photo.png")) && !/TODO: Add profile photo/i.test(readme)) {
  failures.push("Profile photo missing and README has no TODO.");
}
if (/\.android|Lebenslauf .*\.docx|\/home\/acoart|\/home\/warkentin|65165602|0176|\+49/i.test(readme)) {
  failures.push("README contains private source names, local paths, or phone markers.");
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

async function extractArtifactText(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".pdf") {
    return extractPdfText(file);
  }
  if (ext === ".docx") {
    try {
      return execFileSync("unzip", ["-p", file], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    } catch {
      return fs.readFileSync(file).toString("latin1");
    }
  }
  return fs.readFileSync(file, "utf8");
}

async function extractPdfText(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const pdf = await getDocument({ data, disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n");
}
