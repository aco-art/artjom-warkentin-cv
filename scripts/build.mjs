import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";

const profile = readJson("src/profile.json");
const privateProfile = readOptionalJson("private/profile.private.json");

const publicDir = path.join(root, "public");
const publicAssetsDir = path.join(publicDir, "assets");
const publicDownloadsDir = path.join(publicDir, "downloads");
const htmlDir = path.join(root, "dist", "html");

fs.rmSync(publicDir, { recursive: true, force: true });
fs.rmSync(htmlDir, { recursive: true, force: true });
ensureDir(publicAssetsDir);
ensureDir(path.join(publicAssetsDir, "project-images"));
ensureDir(publicDownloadsDir);
ensureDir(htmlDir);
ensureDir(path.join(root, "dist", "for_application"));

copyIfExists("assets/profile-photo.jpeg", "public/assets/profile-photo.jpeg");
copyIfExists("assets/project-images/vontar-h618-frontside.jpg", "public/assets/project-images/vontar-h618-frontside.jpg");
copyIfExists("assets/project-images/vontar-h618-backside.jpg", "public/assets/project-images/vontar-h618-backside.jpg");
copyIfExists("src/site.css", "public/assets/site.css");

writeFile("public/index.html", renderIndex(profile));

for (const document of profile.publicDocuments) {
  writeFile(`dist/html/${document.id}.public.html`, renderCvDocument(profile, document, "public", {}));
}

if (!publicOnly) {
  for (const variant of profile.cvVariants) {
    writeFile(`dist/html/${variant.id}.private.html`, renderCvDocument(profile, variant, "private", privateProfile));
  }
}

console.log(`Generated public site in ${path.relative(root, publicDir)}`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readOptionalJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) return {};
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(from, to) {
  const source = path.join(root, from);
  const target = path.join(root, to);
  if (!fs.existsSync(source)) return;
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function writeFile(relativePath, content) {
  const target = path.join(root, relativePath);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderIndex(data) {
  const publicCv = data.publicDocuments.find((document) => document.id === "public_cv");
  const publicTechnical = data.publicDocuments.find((document) => document.id === "public_technical");
  const metaDescription = "Profil von Artjom Warkentin für technischen IT-Service, IT-Infrastruktur, Elektronikdiagnose, Prüftechnik und KI-gestützte technische Dokumentation in der Zielregion Soltau / Heidekreis / Niedersachsen.";

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(metaDescription)}">
    <title>${escapeHtml(data.person.name)} - ${escapeHtml(data.person.title)}</title>
    <link rel="stylesheet" href="assets/site.css">
  </head>
  <body>
    <header class="site-header">
      <nav class="nav" aria-label="Hauptnavigation">
        <a class="brand" href="#top">
          <strong>${escapeHtml(data.person.name)}</strong>
          <span>${escapeHtml(data.person.title)}</span>
        </a>
        <div class="nav-links">
          <a href="#kompetenzen">Kompetenzen</a>
          <a href="#erfahrung">Erfahrung</a>
          <a href="#projekte">Projekte</a>
          <a href="#downloads">Unterlagen</a>
          <a href="#kontakt">Kontakt</a>
        </div>
      </nav>
    </header>

    <main id="top">
      <!-- validate:hero:start -->
      <section class="hero" data-validate-section="hero">
        <div class="hero-inner">
          <div>
            <p class="eyebrow">Zielregion: ${escapeHtml(data.person.targetRegion)}</p>
            <h1>${escapeHtml(data.person.name)}</h1>
            <p class="hero-title">${escapeHtml(data.person.title)}</p>
            <p class="hero-copy">${escapeHtml(data.person.tagline)}</p>
            <!-- validate:cta:start -->
            <div class="button-row" data-validate-section="cta">
              <a class="button primary" href="downloads/${escapeHtml(publicCv.filenameBase)}_Public.pdf" download>Lebenslauf PDF</a>
              <a class="button secondary" href="downloads/${escapeHtml(publicTechnical.filenameBase)}_Public.pdf" download>Technikprofil</a>
              <a class="button secondary" href="${escapeHtml(data.contact.github)}">GitHub</a>
            </div>
            <!-- validate:cta:end -->
          </div>
          <figure class="hero-photo">
            <img src="assets/profile-photo.jpeg" alt="Portrait von ${escapeHtml(data.person.name)}">
          </figure>
        </div>
      </section>
      <!-- validate:hero:end -->

      <!-- validate:short:start -->
      <section class="statement-band" data-validate-section="short">
        <div class="section statement">
          <h2>Profil in einem Satz</h2>
          <p>${escapeHtml(data.shortStatement)}</p>
        </div>
      </section>
      <!-- validate:short:end -->

      <!-- validate:bring:start -->
      <section id="kompetenzen" class="section compact" data-validate-section="bring">
        <div class="section-head">
          <h2>Drei Kompetenzbereiche</h2>
          <p class="section-lead">Konkrete technische Praxis statt allgemeiner Schlagworte: Infrastruktur, Werkstattdiagnose und nachvollziehbare technische Analyse.</p>
        </div>
        <div class="bring-grid">
          ${data.bringCards.map(renderBringCard).join("\n          ")}
        </div>
      </section>
      <!-- validate:bring:end -->

      <!-- validate:roles:start -->
      <section class="section" data-validate-section="roles">
        <div class="section-head">
          <h2>Beruflicher Schwerpunkt</h2>
          <p class="section-lead">Operative technische Rollen mit Systemverständnis, sauberer Diagnose, Servicequalität und belastbarer Dokumentation.</p>
        </div>
        <div class="role-group-grid">
          ${data.roleGroups.map(renderRoleGroup).join("\n          ")}
        </div>
      </section>
      <!-- validate:roles:end -->

      <section id="erfahrung" class="section">
        <div class="section-head">
          <h2>Berufliche Erfahrung</h2>
          <p class="section-lead">Auf der Webseite bewusst kurz gehalten. Die vollständigen Details stehen im Lebenslauf-PDF.</p>
        </div>
        <div class="timeline">
          ${data.experience.map(renderTimelineItem).join("\n          ")}
        </div>
      </section>

      <section id="projekte" class="section">
        <div class="section-head">
          <h2>Projekte / Proof of Work</h2>
          <p class="section-lead">Ausgewählte Arbeiten mit Infrastruktur-, Analyse-, Test-, Dokumentations- und Hardware-Bring-up-Bezug.</p>
        </div>
        <div class="project-grid">
          ${data.projects.map(renderProjectCard).join("\n          ")}
        </div>
      </section>

      <section class="workshop">
        <div class="section">
          <div class="section-head">
            <h2>Elektronik & Werkstatt</h2>
            <p class="section-lead">${escapeHtml(data.electronics.intro)}</p>
          </div>
          <div class="workshop-grid">
            <article class="card">
              <h3>Geräte</h3>
              <p>${escapeHtml(data.electronics.devices.join(" · "))}</p>
            </article>
            <article class="card">
              <h3>Verfahren</h3>
              <ul>
                ${data.electronics.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n                ")}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="downloads" class="section">
        <div class="section-head">
          <h2>Bewerbungsunterlagen</h2>
          <p class="section-lead">Öffentlich verfügbare Kurzunterlagen ohne Telefonnummer und vollständige Adresse. Vollständige Bewerbungsunterlagen stelle ich bei direktem Kontakt gerne bereit.</p>
        </div>
        <div class="download-grid">
          ${data.publicDocuments.map(renderDownload).join("\n          ")}
        </div>
      </section>

      <section id="kontakt" class="contact-band">
        <div class="section">
          <div class="section-head">
            <h2>Kontakt</h2>
            <p class="section-lead">Öffentliche Kontaktangaben für technische Rückfragen und Bewerbungsdialoge.</p>
          </div>
          <div class="contact-list">
            <span class="contact-item">Region: ${escapeHtml(data.person.currentRegion)} → Zielregion ${escapeHtml(data.person.targetRegion)}</span>
            <a class="contact-item" href="mailto:${escapeHtml(data.contact.email)}">${escapeHtml(data.contact.email)}</a>
            <a class="contact-item" href="${escapeHtml(data.contact.github)}">GitHub Profil</a>
            <a class="contact-item" href="${escapeHtml(data.contact.h618Project)}">H618 Projekt</a>
          </div>
          <p class="note">Telefonnummer, vollständige Adresse und vollständige Bewerbungsunterlagen werden nicht öffentlich bereitgestellt.</p>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function renderBringCard(card) {
  return `<article class="card bring-card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
            <div class="chips">${card.items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
          </article>`;
}

function renderRoleGroup(group) {
  return `<article class="role-group">
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(group.description)}</p>
          </article>`;
}

function renderTimelineItem(item) {
  return `<article class="timeline-item">
            <div class="period">${escapeHtml(item.period)}</div>
            <div>
              <h3>${escapeHtml(item.role)}</h3>
              <p class="meta">${escapeHtml(item.employer)} · ${escapeHtml(item.location)}</p>
              <p>${escapeHtml(item.focus)}</p>
              <ul>${item.bullets.slice(0, 2).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
            </div>
          </article>`;
}

function renderProjectCard(project) {
  const link = project.link ? `<p class="project-link"><a href="${escapeHtml(project.link)}">Projekt ansehen</a></p>` : "";
  return `<article class="card project-card">
            <span class="tag">${escapeHtml(project.type)}</span>
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(project.description)}</p>
            ${link}
          </article>`;
}

function renderDownload(document) {
  return `<a class="download" href="downloads/${escapeHtml(document.filenameBase)}_Public.pdf" download>
            <h3>${escapeHtml(document.label)}</h3>
            <p>${escapeHtml(document.focus)}</p>
          </a>`;
}

function renderCvDocument(data, document, scope, privateData) {
  const css = fs.readFileSync(path.join(root, "templates", "cv.css"), "utf8");
  const printCss = fs.readFileSync(path.join(root, "templates", "print.css"), "utf8");
  const kind = document.kind ?? "full";
  const summary = document.summary ?? selectSummary(data, document, kind);
  const targetRoles = document.targetRoles ?? data.targetRoles;
  const contactLines = scope === "private"
    ? [
        privateData.applicationLocation || data.person.currentRegion,
        privateData.phone ? `Telefon: ${privateData.phone}` : null,
        `E-Mail: ${data.contact.email}`,
        `GitHub: ${data.contact.github}`
      ].filter(Boolean)
    : [
        `E-Mail: ${data.contact.email}`,
        `GitHub: ${data.contact.github}`,
        `Zielregion: ${data.person.targetRegion}`
      ];
  const further = scope === "private"
    ? [`Geburtsjahr: ${data.person.birthYear}`, `Staatsangehörigkeit: ${data.person.citizenship}`, `Führerschein: ${data.person.driverLicense}`, data.person.car, `Zielregion: ${data.person.targetRegion}`]
    : [`Staatsangehörigkeit: ${data.person.citizenship}`, `Führerschein: ${data.person.driverLicense}`, data.person.car, `Zielregion: ${data.person.targetRegion}`];

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(data.person.name)} - ${escapeHtml(document.title)}</title>
    <style>${css}\n${printCss}</style>
  </head>
  <body data-cv-template="unified">
    <article class="cv cv-template-unified">
      <header class="cv-header cv-section">
        <div>
          <h1>${escapeHtml(data.person.name)}</h1>
          <p class="title">${escapeHtml(document.title)}</p>
          <p class="meta">${escapeHtml(document.focus)}</p>
        </div>
        <div class="contact">${contactLines.map(escapeHtml).join("<br>")}</div>
      </header>

      ${renderSection("Kurzprofil", summary.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n        "))}
      ${renderSection("Zielrollen", `<div class="pill-row">${targetRoles.map((role) => `<span class="pill">${escapeHtml(role)}</span>`).join("")}</div>`)}
      ${renderSection("Kompetenzprofil", renderCompetencies(data, kind))}
      ${kind === "short" ? renderSection("Beruflicher Schwerpunkt", renderExperienceCompact(data.experience)) : renderSection("Berufserfahrung", data.experience.map((item) => renderCvEntry(item, kind === "technical" ? 2 : undefined)).join("\n        "))}
      ${renderSection("Ausgewählte technische Projekte", renderProjects(data.projects, kind))}
      ${renderSection("Elektronik & Werkstatt", renderElectronics(data))}
      ${kind === "technical" ? "" : renderSection("Ausbildung", data.education.map(renderEducationEntry).join("\n        "))}
      ${kind === "short" ? "" : renderSection("Fortbildung / Zertifizierungen / Schulungen", `<ul>${data.training.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`)}
      ${renderSection("Sprachen und weitere Angaben", `<div class="grid-two"><div><h3>Sprachen</h3><ul>${data.languages.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h3>Weitere Angaben</h3><ul>${further.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>`)}
      ${renderSection("Links", `<p>GitHub Profil: <a href="${escapeHtml(data.contact.github)}">${escapeHtml(data.contact.github)}</a><br>H618 Projekt: <a href="${escapeHtml(data.contact.h618Project)}">${escapeHtml(data.contact.h618Project)}</a></p>`)}
    </article>
  </body>
</html>`;
}

function selectSummary(data, document, kind) {
  if (kind === "short") {
    return [
      data.shortStatement,
      "Passend für technische Rollen in IT-Systembetreuung, Infrastrukturservice, Elektronikdiagnose, Prüftechnik und Serviceinnendienst.",
      "Die Stärke liegt in reproduzierbarer Fehlereingrenzung, stabilen Abläufen, verständlicher technischer Dokumentation und pragmatischem Einsatz KI-gestützter Werkzeuge."
    ];
  }
  if (kind === "technical") {
    return [
      "Technisches Kompetenzprofil für IT-Infrastruktur, Elektronikdiagnose, Mess-/Prüftechnik und technische Dokumentation.",
      "Schwerpunkt auf Windows/Linux/NAS-Betrieb, strukturierter Fehlersuche, Werkstattpraxis, Baugruppenverständnis, API-/Web-Tests und dokumentierter Analyse.",
      "KI-gestützte Werkzeuge werden konkret für API-Analyse, Parser/Skripte, Projektgraphen, README-/Dokumentationsgenerierung und Testvorbereitung genutzt."
    ];
  }
  return document.summary ?? data.summary;
}

function renderSection(title, content) {
  if (!content) return "";
  return `<section class="cv-section">
        <h2>${escapeHtml(title)}</h2>
        ${content}
      </section>`;
}

function renderCompetencies(data, kind) {
  const groups = kind === "short" ? data.competencies.slice(0, 4) : data.competencies;
  return `<div class="grid-two">
          ${groups.map((group) => `<div class="competency-block"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.items.join(" · "))}</p></div>`).join("\n          ")}
        </div>`;
}

function renderExperienceCompact(experience) {
  return `<ul>${experience.slice(0, 5).map((item) => `<li><strong>${escapeHtml(item.period)} · ${escapeHtml(item.role)}</strong> · ${escapeHtml(item.employer)}: ${escapeHtml(item.bullets[0])}</li>`).join("")}</ul>`;
}

function renderProjects(projects, kind) {
  const selected = kind === "short" ? projects.slice(0, 3) : projects;
  return selected.map((project) => `<div class="entry project-card"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}${project.link ? ` <a href="${escapeHtml(project.link)}">${escapeHtml(project.link)}</a>` : ""}</p></div>`).join("\n        ");
}

function renderElectronics(data) {
  return `<p>${escapeHtml(data.electronics.intro)}</p>
        <p><strong>Geräte:</strong> ${escapeHtml(data.electronics.devices.join(" · "))}</p>
        <ul>${data.electronics.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderEducationEntry(item) {
  return `<div class="entry education-item">
          <h3>${escapeHtml(item.period)} · ${escapeHtml(item.degree)}</h3>
          <p>${escapeHtml(item.details)} · ${escapeHtml(item.institution)}</p>
        </div>`;
}

function renderCvEntry(item, maxBullets = null) {
  const bullets = maxBullets ? item.bullets.slice(0, maxBullets) : item.bullets;
  return `<div class="entry experience-item">
          <h3>${escapeHtml(item.period)} · ${escapeHtml(item.role)}</h3>
          <p class="small">${escapeHtml(item.employer)} · ${escapeHtml(item.location)}</p>
          <p>${escapeHtml(item.focus)}</p>
          <ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
        </div>`;
}
