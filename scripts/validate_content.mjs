import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";
const profile = readJson("src/profile.json");
const failures = [];
const publicDownloads = [
  "public/downloads/Artjom_Warkentin_Kurzprofil_Public.pdf",
  "public/downloads/Artjom_Warkentin_Lebenslauf_IT_Public.pdf",
  "public/downloads/Artjom_Warkentin_Lebenslauf_ServiceTechniker_Public.pdf"
];
const currentPublicDownloadNames = publicDownloads.map((item) => path.basename(item));
const applicationVariants = [
  "dist/for_application/Artjom_Warkentin_Lebenslauf_Business_Analyst_IT_Teamleiter.pdf",
  "dist/for_application/Artjom_Warkentin_Lebenslauf_Soltau_Technical_Service.pdf",
  "dist/for_application/Artjom_Warkentin_Lebenslauf_Elektronik_Prueftechnik.pdf"
];
const genericPhrases = [
  "seltene Kombination",
  "belastbare Kombination",
  "KI-gestützte technische Arbeit",
  "moderne technische Workflows"
];
const brokenPdfPatterns = [
  /\u00ad/,
  /\u0002/,
  /\uFFFE/,
  /\uFFFD/,
  /\uFFFF/,
  /IT\uFFFE/,
  /BGA\uFFFE/,
  /Build\uFFFE/,
  /Performance\uFFFE/
];
const unclearTechnicalTerms = [
  /\bSOPs\b/i,
  /\bTHT\b/,
  /\bDC-In\b/i,
  /komplexe Fehlerbilder/i,
  /\bUAT\b/
];
const forbiddenPublicDownloadPatterns = [
  /Artjom_Warkentin_Lebenslauf_Public\.pdf/i,
  /Artjom_Warkentin_Technikprofil_Public\.pdf/i,
  /Rheinmetall/i,
  /Suedsee/i,
  /Südsee/i,
  /\.docx$/i
];
const privatePhonePatterns = [
  /\+49\s*176\s*65165602/,
  /176\s*65165602/
];

assertV2Profile();
assertSourcePrivacy();
assertExists("public/index.html");
assertExists("public/assets/site.css");
assertExists("public/assets/profile-photo.png");
assertExists("public/assets/project-images/vontar-h618-frontside.jpg");
assertExists("public/assets/project-images/vontar-h618-backside.jpg");
for (const file of publicDownloads) assertExists(file);

const publicIndex = fs.existsSync(path.join(root, "public/index.html")) ? readText("public/index.html") : "";
const publicHtmlText = decodeHtml(stripHtml(publicIndex));
const expectedHero = "Business Analyst & IT-Teamleiter mit technischer Service- und Elektronikpraxis";
const expectedSupport = "Requirements · Scrum-Master-Rolle · Abnahme-/Nutzertests · UI-Prüfung · IT-Infrastruktur · Elektronikdiagnose";

if (!publicHtmlText.includes(expectedHero)) {
  failures.push("Public hero does not use the V2 public title.");
}
if (!publicHtmlText.includes(expectedSupport)) {
  failures.push("Public hero does not use the V2 support line.");
}
if (!publicHtmlText.includes("IT-Profil") || !publicHtmlText.includes("Service-Techniker-Profil") || !publicHtmlText.includes("Kurzprofil")) {
  failures.push("Public site is missing one of the required profile entry paths.");
}
const forbiddenPublicPhrases = [
  "Zwei Einstiegspfade",
  "Ein gemeinsamer beruflicher Kern",
  "Profil in einem Satz",
  "Drei Kompetenzbereiche",
  "Proof of Work",
  "Berufliche IT-/Produktarbeit",
  "Berufliches Infrastrukturprojekt",
  "Arbeitsnahe Analyse- und Dokumentationswerkzeuge",
  "Öffentliche Unterlagen ohne private Kontaktdaten",
  "Private Kontaktdaten, vollständige Adresse"
];
for (const phrase of forbiddenPublicPhrases) {
  if (publicHtmlText.includes(phrase)) {
    failures.push(`Public site still contains forbidden phrase: ${phrase}`);
  }
}
if (!publicHtmlText.includes("Technische Praxis & Projekte")) {
  failures.push("Public site is missing renamed projects section.");
}
if (!publicHtmlText.includes("Aktuelle Tätigkeit & Arbeitsumfang")) {
  failures.push("Public site is missing current role/KPI section.");
}
for (const phrase of ["2023: 36 Kunden", "2024: 25 Kunden", "646 Issues", "998 Story Points", "495 Issues", "648 Story Points"]) {
  if (!publicHtmlText.includes(phrase)) {
    failures.push(`Public site is missing current role/KPI text: ${phrase}`);
  }
}
const currentExperience = profile.experience[0];
for (const phrase of [
  currentExperience.publicRole,
  currentExperience.employer,
  currentExperience.location,
  currentExperience.focus,
  ...currentExperience.bullets,
  ...currentExperience.metrics
]) {
  if (!publicHtmlText.includes(phrase)) {
    failures.push(`Public site is missing current experience source text from profile.json: ${phrase.slice(0, 90)}`);
  }
}
const expectedDownloadCards = [
  {
    href: "downloads/Artjom_Warkentin_Kurzprofil_Public.pdf",
    label: "Kurzprofil"
  },
  {
    href: "downloads/Artjom_Warkentin_Lebenslauf_IT_Public.pdf",
    label: "Lebenslauf IT-Profil"
  },
  {
    href: "downloads/Artjom_Warkentin_Lebenslauf_ServiceTechniker_Public.pdf",
    label: "Lebenslauf Service-Techniker-Profil"
  }
];
const downloadCards = [...publicIndex.matchAll(/<a class="download" href="([^"]+)" download>\s*<h3>([^<]+)<\/h3>\s*(?:<p>PDF herunterladen<\/p>\s*)?<\/a>/g)]
  .map((match) => ({ href: decodeHtml(match[1]), label: decodeHtml(match[2]) }));
if (downloadCards.length !== expectedDownloadCards.length) {
  failures.push(`Public site must contain exactly ${expectedDownloadCards.length} download cards; got ${downloadCards.length}.`);
}
for (let index = 0; index < expectedDownloadCards.length; index += 1) {
  const expected = expectedDownloadCards[index];
  const actual = downloadCards[index];
  if (!actual || actual.href !== expected.href || actual.label !== expected.label) {
    failures.push(`Public download card ${index + 1} mismatch; expected ${expected.label} -> ${expected.href}.`);
  }
}
if (!publicIndex.includes(profile.contact.public.github) || !publicIndex.includes(profile.contact.public.h618Project)) {
  failures.push("Public site is missing required GitHub/H618 links.");
}
if (!/[äöüÄÖÜß]/.test(publicIndex)) {
  failures.push("German Umlauts are missing from public index.");
}
if (/DOCX/i.test(publicHtmlText)) {
  failures.push("Public HTML contains DOCX wording.");
}
for (const pattern of [/Artjom_Warkentin_Lebenslauf_Public\.pdf/i, /Artjom_Warkentin_Technikprofil_Public\.pdf/i]) {
  if (pattern.test(publicIndex)) {
    failures.push(`Public HTML contains old public download filename: ${pattern}`);
  }
}

for (const file of listFiles(path.join(root, "public")).filter((item) => /\.(html|css|js|json|txt|md|svg)$/i.test(item))) {
  const text = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  if (/href=(["'])(\s*|#)\1/i.test(text)) {
    failures.push(`Empty link in ${relative}`);
  }
  assertNoPublicPrivateMarkers(relative, text);
  assertNoGenericPhrases(relative, text);
}

for (const file of listFiles(path.join(root, "public"))) {
  const relative = path.relative(root, file);
  if (/\.docx$/i.test(relative)) {
    failures.push(`Public tree contains DOCX file: ${relative}`);
  }
  if (/\.android|private|dump|dumps|\.log$/i.test(relative)) {
    failures.push(`Public tree contains private log/source marker: ${relative}`);
  }
}

const publicDownloadFiles = listFiles(path.join(root, "public", "downloads")).map((file) => path.relative(root, file));
const allowedDownloads = new Set(publicDownloads);
if (publicDownloadFiles.length !== publicDownloads.length) {
  failures.push(`public/downloads must contain exactly ${publicDownloads.length} files; got ${publicDownloadFiles.length}.`);
}
for (const file of publicDownloadFiles) {
  if (!allowedDownloads.has(file)) {
    failures.push(`Unexpected public download: ${file}`);
  }
  for (const pattern of forbiddenPublicDownloadPatterns) {
    if (pattern.test(file)) {
      failures.push(`Forbidden public download filename: ${file}`);
    }
  }
  if (!/\.pdf$/i.test(file)) {
    failures.push(`Non-PDF file in public downloads: ${file}`);
  }
}

const publicPdfTexts = new Map();
for (const relative of publicDownloads) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const { text, pageCount } = await extractPdfText(file);
  publicPdfTexts.set(relative, { text, pageCount });
  assertNoPublicPrivateMarkers(relative, text);
  assertNoGenericPhrases(relative, text);
  if (/DOCX/i.test(text)) {
    failures.push(`Public PDF contains DOCX wording: ${relative}`);
  }
  if (/[\u00ad\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    failures.push(`Public PDF text extraction contains soft-hyphen or control characters: ${relative}`);
  }
  if (/[\uFFFD\uFFFE\uFFFF]/.test(text)) {
    failures.push(`Public PDF text extraction contains broken glyph markers: ${relative}`);
  }
  for (const pattern of brokenPdfPatterns) {
    if (pattern.test(text)) {
      failures.push(`Public PDF text extraction contains forbidden broken glyph pattern ${pattern}: ${relative}`);
    }
  }
  for (const pattern of unclearTechnicalTerms) {
    if (pattern.test(text)) {
      failures.push(`Public PDF contains unclear or forbidden technical abbreviation ${pattern}: ${relative}`);
    }
  }
  if (/\bLINKS\b/i.test(text)) {
    failures.push(`Public PDF contains duplicate bottom LINKS section: ${relative}`);
  }
  if (/ONLINE-PROFIL/i.test(text)) {
    failures.push(`Public PDF contains ONLINE-PROFIL header text: ${relative}`);
  }
  if (!/GITHUB-PROFIL/i.test(text)) {
    failures.push(`Public PDF is missing GitHub-Profil QR caption/header text: ${relative}`);
  }
  if (/aco-art\.github\.io\/artjom-warkentin-cv/i.test(text)) {
    failures.push(`Public PDF contains GitHub Pages URL in header/text: ${relative}`);
  }
  if (!/BGA-Rework/.test(text)) {
    failures.push(`Public PDF text extraction does not preserve BGA-Rework wording: ${relative}`);
  }
}

const shortPdf = publicPdfTexts.get("public/downloads/Artjom_Warkentin_Kurzprofil_Public.pdf");
if (shortPdf && shortPdf.pageCount > 1) {
  failures.push(`Kurzprofil public PDF must be at most 1 page; got ${shortPdf.pageCount}.`);
}
if (shortPdf && !/AUSBILDUNG/i.test(shortPdf.text)) {
  failures.push("Kurzprofil public PDF is missing Ausbildung.");
}

const itPdf = publicPdfTexts.get("public/downloads/Artjom_Warkentin_Lebenslauf_IT_Public.pdf");
const servicePdf = publicPdfTexts.get("public/downloads/Artjom_Warkentin_Lebenslauf_ServiceTechniker_Public.pdf");
for (const [label, pdf] of [["IT-Profil", itPdf], ["Service-Techniker-Profil", servicePdf]]) {
  if (!pdf) continue;
  if (pdf.pageCount > 3) {
    failures.push(`${label} public PDF must be at most 3 pages; got ${pdf.pageCount}.`);
  }
  if (!/ZIELPROFIL/i.test(pdf.text) || /ZIELROLLEN/i.test(pdf.text)) {
    failures.push(`${label} public PDF must use ZIELPROFIL, not ZIELROLLEN.`);
  }
  for (const section of ["KOMPETENZFELDER", "BERUFSERFAHRUNG", "AUSBILDUNG", "TECHNISCHE PRAXIS", "ELEKTRONIK", "FORTBILDUNG", "SPRACHEN"]) {
    if (!new RegExp(section, "i").test(pdf.text)) {
      failures.push(`${label} public PDF is missing shared section marker: ${section}.`);
    }
  }
}

for (const relative of ["src/profile.json", "public/index.html"]) {
  if (fs.existsSync(path.join(root, relative))) {
    assertNoGenericPhrases(relative, readText(relative));
  }
}

for (const documentId of ["public_short", "public_it", "public_service"]) {
  const htmlPath = path.join(root, "dist", "html", `${documentId}.public.html`);
  if (!fs.existsSync(htmlPath)) {
    failures.push(`Missing public PDF HTML source: ${path.relative(root, htmlPath)}`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  if (!/data-cv-template="unified"/.test(html)) {
    failures.push(`Public PDF HTML does not use unified CV template: ${path.relative(root, htmlPath)}`);
  }
  assertNoPublicPrivateMarkers(path.relative(root, htmlPath), html);
  assertNoGenericPhrases(path.relative(root, htmlPath), html);
}

if (!publicOnly) {
  for (const file of applicationVariants) assertExists(file);
  assertExists("dist/for_application/Artjom_Warkentin_Lebenslauf_Business_Analyst_IT_Teamleiter.docx");
}

const readme = fs.existsSync(path.join(root, "README.md")) ? readText("README.md") : "";
if (/\.android|Lebenslauf .*\.docx|\/home\/acoart|\/home\/warkentin|65165602|0176|\+49/i.test(readme)) {
  failures.push("README contains private source names, local paths, or phone markers.");
}
for (const filename of currentPublicDownloadNames) {
  if (!readme.includes(filename)) {
    failures.push(`README is missing current public download filename: ${filename}`);
  }
}
for (const oldName of ["Artjom_Warkentin_Lebenslauf_Public.pdf", "Artjom_Warkentin_Technikprofil_Public.pdf"]) {
  if (readme.includes(oldName)) {
    failures.push(`README mentions old public download filename: ${oldName}`);
  }
}

if (failures.length) {
  console.error("Validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(publicOnly ? "Public validation passed." : "Validation passed.");

function assertV2Profile() {
  if (profile.schemaVersion !== "2.0") {
    failures.push("src/profile.json is not V2 schemaVersion 2.0.");
  }
  for (const key of ["publicTitle", "technicalTitle"]) {
    if (!profile.person?.[key]) failures.push(`Missing person.${key}.`);
  }
  for (const key of ["positioning", "targetProfiles", "companyContextPublic", "competencyGroups", "educationDisplayRules", "documentRules"]) {
    if (!profile[key]) failures.push(`Missing V2 profile key: ${key}.`);
  }
  if (!profile.contact?.public?.email || !profile.contact?.public?.github) {
    failures.push("Missing contact.public email/github.");
  }
  if (profile.contact?.privateForApplication) {
    failures.push("src/profile.json must not contain contact.privateForApplication.");
  }
  if (profile.documentRules?.applicationOnly?.includes("Foto")) {
    failures.push("documentRules.applicationOnly must not include Foto because public PDFs keep the photo.");
  }
}

function assertSourcePrivacy() {
  const profileSource = readText("src/profile.json");
  for (const pattern of privatePhonePatterns) {
    if (pattern.test(profileSource)) {
      failures.push("src/profile.json contains a private phone number.");
    }
  }
  if (/"phone"\s*:/.test(profileSource) || /privateForApplication/.test(profileSource)) {
    failures.push("src/profile.json contains private phone/contact structure.");
  }

  let trackedFiles = [];
  try {
    trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    failures.push("Could not inspect tracked files with git ls-files.");
    return;
  }

  for (const relative of trackedFiles) {
    const fullPath = path.join(root, relative);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) continue;
    const content = fs.readFileSync(fullPath);
    const text = content.toString("utf8");
    for (const pattern of privatePhonePatterns) {
      if (pattern.test(text)) {
        failures.push(`Tracked file contains private phone number: ${relative}`);
      }
    }
  }
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

function assertNoPublicPrivateMarkers(relative, text) {
  if (/\+49|0176|65165602/.test(text)) {
    failures.push(`Public artifact contains phone data: ${relative}`);
  }
  if (/Straße|Strasse|Hausnummer|\.android|\/home\/acoart|\/home\/warkentin/i.test(text)) {
    failures.push(`Public artifact contains private/source marker: ${relative}`);
  }
}

function assertNoGenericPhrases(relative, text) {
  for (const phrase of genericPhrases) {
    if (new RegExp(escapeRegExp(phrase), "i").test(text)) {
      failures.push(`Forbidden generic phrase found in ${relative}: ${phrase}`);
    }
  }
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ");
}

function decodeHtml(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"');
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

async function extractPdfText(file) {
  const data = new Uint8Array(fs.readFileSync(file));
  const pdf = await getDocument({ data, disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return { text: pages.join("\n"), pageCount: pdf.numPages };
}
