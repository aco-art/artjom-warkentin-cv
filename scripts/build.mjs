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

for (const variant of profile.cvVariants) {
  writeFile(`dist/html/${variant.id}.public.html`, renderCvDocument(profile, variant, "public", {}));
  if (!publicOnly) {
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
  const master = data.cvVariants.find((variant) => variant.id === "master");
  const publicMasterPdf = `downloads/${master.filenameBase}_Public.pdf`;
  const publicMasterDocx = `downloads/${master.filenameBase}_Public.docx`;
  const metaDescription = "Profil von Artjom Warkentin für technischen IT-Service, IT-Infrastruktur, Elektronikdiagnose und KI-gestützte technische Dokumentation in der Zielregion Soltau / Heidekreis / Niedersachsen.";

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
          <a href="#mitbringen">Mitbringen</a>
          <a href="#erfahrung">Erfahrung</a>
          <a href="#projekte">Projekte</a>
          <a href="#downloads">Downloads</a>
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
              <a class="button primary" href="${publicMasterPdf}" download>Lebenslauf PDF herunterladen</a>
              <a class="button secondary" href="${escapeHtml(data.contact.github)}">GitHub ansehen</a>
              <a class="button secondary" href="mailto:${escapeHtml(data.contact.email)}">Kontakt</a>
            </div>
            <!-- validate:cta:end -->
          </div>
          <figure class="hero-photo">
            <img src="assets/profile-photo.jpeg" alt="Portrait von ${escapeHtml(data.person.name)}">
          </figure>
        </div>
      </section>
      <!-- validate:hero:end -->

      <!-- validate:bring:start -->
      <section id="mitbringen" class="section compact" data-validate-section="bring">
        <div class="section-head">
          <h2>Was ich konkret mitbringe</h2>
          <p class="section-lead">Eine belastbare Kombination aus Infrastrukturpraxis, Elektronikdiagnose und moderner technischer Dokumentation.</p>
        </div>
        <div class="bring-grid">
          ${data.bringCards.map(renderBringCard).join("\n          ")}
        </div>
      </section>
      <!-- validate:bring:end -->

      <!-- validate:short:start -->
      <section class="statement-band" data-validate-section="short">
        <div class="section statement">
          <h2>Kurz gesagt</h2>
          <p>${escapeHtml(data.shortStatement)}</p>
        </div>
      </section>
      <!-- validate:short:end -->

      <!-- validate:roles:start -->
      <section class="section" data-validate-section="roles">
        <div class="section-head">
          <h2>Passende Rollen</h2>
          <p class="section-lead">Keine Management-Zielrolle, sondern operative technische Arbeit mit Systemverständnis, Diagnose und Dokumentation.</p>
        </div>
        <div class="role-group-grid">
          ${data.roleGroups.map(renderRoleGroup).join("\n          ")}
        </div>
      </section>
      <!-- validate:roles:end -->

      <section id="erfahrung" class="section">
        <div class="section-head">
          <h2>Berufliche Erfahrung</h2>
          <p class="section-lead">Aktuelle IT-Systempraxis in Deutschland, ergänzt durch langjährige Service- und Werkstatterfahrung im Elektronik-/IT-Umfeld.</p>
        </div>
        <div class="timeline">
          ${data.experience.map(renderTimelineItem).join("\n          ")}
        </div>
      </section>

      <section id="projekte" class="section">
        <div class="section-head">
          <h2>Technische Projekte</h2>
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
          <h2>Downloads</h2>
          <p class="section-lead">Public-safe Unterlagen ohne Rufnummer, volle Adresse, private Logs oder lokale Pfade.</p>
        </div>
        <div class="download-grid">
          ${data.cvVariants.map((variant) => renderDownload(variant, "PDF", `${variant.filenameBase}_Public.pdf`)).join("\n          ")}
          ${renderDownload(master, "DOCX", `${master.filenameBase}_Public.docx`, publicMasterDocx)}
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
          <p class="note">Detaillierte Bewerbungsunterlagen können personenbezogene Daten enthalten und sollten vor Weitergabe geprüft werden.</p>
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
              <ul>${item.bullets.slice(0, 4).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
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

function renderDownload(variant, type, filename, hrefOverride = null) {
  const href = hrefOverride ?? `downloads/${filename}`;
  return `<a class="download" href="${escapeHtml(href)}" download>
            <h3>${escapeHtml(variant.label)} ${type}</h3>
            <p>${escapeHtml(variant.focus)}</p>
          </a>`;
}

function renderCvDocument(data, variant, scope, privateData) {
  const css = fs.readFileSync(path.join(root, "templates", "cv.css"), "utf8");
  const printCss = fs.readFileSync(path.join(root, "templates", "print.css"), "utf8");
  const summary = variant.summary ?? data.summary;
  const targetRoles = variant.targetRoles ?? data.targetRoles;
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
    <title>${escapeHtml(data.person.name)} - ${escapeHtml(variant.title)}</title>
    <style>${css}\n${printCss}</style>
  </head>
  <body>
    <article class="cv">
      <header class="cv-header">
        <div>
          <h1>${escapeHtml(data.person.name)}</h1>
          <p class="title">${escapeHtml(variant.title)}</p>
          <p class="meta">${escapeHtml(variant.focus)}</p>
        </div>
        <div class="contact">${contactLines.map(escapeHtml).join("<br>")}</div>
      </header>

      <section>
        <h2>Kurzprofil</h2>
        ${summary.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n        ")}
      </section>

      <section>
        <h2>Zielrollen</h2>
        <div class="pill-row">${targetRoles.map((role) => `<span class="pill">${escapeHtml(role)}</span>`).join("")}</div>
      </section>

      <section>
        <h2>Kompetenzprofil</h2>
        <div class="grid-two">
          ${data.competencies.map((group) => `<div><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.items.join(" · "))}</p></div>`).join("\n          ")}
        </div>
      </section>

      <section>
        <h2>Berufserfahrung</h2>
        ${data.experience.map((item) => renderCvEntry(item)).join("\n        ")}
      </section>

      <section>
        <h2>Ausgewählte technische Projekte</h2>
        ${data.projects.map((project) => `<div class="entry"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}${project.link ? ` <a href="${escapeHtml(project.link)}">${escapeHtml(project.link)}</a>` : ""}</p></div>`).join("\n        ")}
      </section>

      <section>
        <h2>Elektronik & Werkstatt</h2>
        <p>${escapeHtml(data.electronics.intro)}</p>
        <p><strong>Geräte:</strong> ${escapeHtml(data.electronics.devices.join(" · "))}</p>
        <ul>${data.electronics.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>

      <section>
        <h2>Ausbildung</h2>
        ${data.education.map((item) => `<div class="entry"><div class="entry-head"><div class="period">${escapeHtml(item.period)}</div><div><h3>${escapeHtml(item.degree)}</h3><p>${escapeHtml(item.details)} · ${escapeHtml(item.institution)}</p></div></div></div>`).join("\n        ")}
      </section>

      <section>
        <h2>Fortbildung / Zertifizierungen / Schulungen</h2>
        <ul>${data.training.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>

      <section class="grid-two">
        <div>
          <h2>Sprachen</h2>
          <ul>${data.languages.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div>
          <h2>Weitere Angaben</h2>
          <ul>${further.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </section>

      <section>
        <h2>Links</h2>
        <p>GitHub Profil: <a href="${escapeHtml(data.contact.github)}">${escapeHtml(data.contact.github)}</a><br>H618 Projekt: <a href="${escapeHtml(data.contact.h618Project)}">${escapeHtml(data.contact.h618Project)}</a></p>
      </section>
    </article>
  </body>
</html>`;
}

function renderCvEntry(item) {
  return `<div class="entry">
          <div class="entry-head">
            <div class="period">${escapeHtml(item.period)}</div>
            <div>
              <h3>${escapeHtml(item.role)}</h3>
              <p class="small">${escapeHtml(item.employer)} · ${escapeHtml(item.location)}</p>
              <p>${escapeHtml(item.focus)}</p>
              <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
            </div>
          </div>
        </div>`;
}
