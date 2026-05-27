import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";

const profile = readJson("src/profile.json");
const privateProfile = readOptionalJson("src/profile.private.json");
const publicContact = profile.contact.public;
const privateContact = {
  phone: privateProfile.phone,
  city: privateProfile.city ?? privateProfile.applicationLocation
};
const githubProfileUrl = String(publicContact.github ?? "");
const cvAssets = {
  photoDataUrl: readAssetDataUrl("assets/profile-photo.jpeg", "assets/profile-photo.png"),
  githubProfileUrl,
  githubProfileQrDataUrl: await QRCode.toDataURL(githubProfileUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: {
      dark: "#14213d",
      light: "#ffffff"
    }
  })
};

const publicDocuments = getPublicDocuments(profile);
const applicationVariants = getApplicationVariants(profile);
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

copyIfExists("assets/profile-photo.png", "public/assets/profile-photo.png");
copyIfExists("assets/project-images/vontar-h618-frontside.jpg", "public/assets/project-images/vontar-h618-frontside.jpg");
copyIfExists("assets/project-images/vontar-h618-backside.jpg", "public/assets/project-images/vontar-h618-backside.jpg");
copyIfExists("src/site.css", "public/assets/site.css");

writeFile("public/index.html", renderIndex(profile, publicDocuments));

for (const document of publicDocuments) {
  writeFile(`dist/html/${document.id}.public.html`, renderCvDocument(profile, document, "public", cvAssets));
}

if (!publicOnly) {
  for (const variant of applicationVariants) {
    writeFile(`dist/html/${variant.id}.private.html`, renderCvDocument(profile, variant, "private", cvAssets));
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

function readAssetDataUrl(...relativePaths) {
  const relativePath = relativePaths.find((item) => item && fs.existsSync(path.join(root, item)));
  if (!relativePath) return "";
  const fullPath = path.join(root, relativePath);
  const extension = path.extname(fullPath).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mimeType};base64,${fs.readFileSync(fullPath).toString("base64")}`;
}

function trimTrailingSlash(value) {
  return String(value ?? "").replace(/\/+$/, "");
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
  return normalizeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00ad/g, "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFD\uFFFE\uFFFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayUrl(value) {
  return trimTrailingSlash(value).replace(/^https?:\/\//, "");
}

function getPublicDocuments(data) {
  const variants = data.documentVariants;
  return [
    {
      id: "public_short",
      label: variants.short.label,
      title: variants.short.title,
      subtitle: variants.short.subtitle,
      filenameBase: variants.short.filenameBase,
      kind: "short",
      variantKey: "short"
    },
    {
      id: "public_it",
      label: variants.it.label,
      title: variants.it.title,
      subtitle: variants.it.subtitle,
      filenameBase: variants.it.filenameBase,
      kind: "profile",
      variantKey: "it"
    },
    {
      id: "public_service",
      label: variants.serviceTechnician.label,
      title: variants.serviceTechnician.title,
      subtitle: variants.serviceTechnician.subtitle,
      filenameBase: variants.serviceTechnician.filenameBase,
      kind: "profile",
      variantKey: "serviceTechnician"
    }
  ];
}

function getApplicationVariants(data) {
  return [
    {
      id: "business_teamlead",
      label: "Business / Teamlead CV",
      title: data.targetProfiles.itBusinessTechnical.title,
      filenameBase: "Artjom_Warkentin_Lebenslauf_Business_Analyst_IT_Teamleiter",
      focus: "Business Analyse, IT-Teamleitung, Product Owner, Requirements, Scrum, Abnahme- und Nutzertests und interne IT-Projekte.",
      kind: "full",
      variantKey: "it",
      targetProfile: data.targetProfiles.itBusinessTechnical
    },
    {
      id: "hands_on_soltau",
      label: "Soltau Technical Service CV",
      title: data.targetProfiles.handsOnSoltau.title,
      filenameBase: "Artjom_Warkentin_Lebenslauf_Soltau_Technical_Service",
      focus: "Technischer IT-Service, Systembetreuung, Infrastrukturservice und elektroniknahe Diagnose für Soltau / Heidekreis.",
      kind: "full",
      variantKey: "serviceTechnician",
      targetProfile: data.targetProfiles.handsOnSoltau
    },
    {
      id: "electronics_prueftechnik",
      label: "Electronics / Prüftechnik CV",
      title: data.targetProfiles.electronics.title,
      filenameBase: "Artjom_Warkentin_Lebenslauf_Elektronik_Prueftechnik",
      focus: "Elektronikdiagnose, Prüftechnik, Werkstattqualität, technische Dokumentation und systemnahe Fehleranalyse.",
      kind: "full",
      variantKey: "serviceTechnician",
      targetProfile: data.targetProfiles.electronics
    }
  ];
}

function renderIndex(data, documents) {
  const short = documents.find((document) => document.id === "public_short");
  const itProfile = documents.find((document) => document.id === "public_it");
  const serviceProfile = documents.find((document) => document.id === "public_service");
  const metaDescription = "HR-Profil von Artjom Warkentin: Business Analyst und IT-Teamleiter mit Requirements, Scrum, Abnahme-/Nutzertests, UI-Prüfung, ERP-/Touristiksoftware, IT-Infrastruktur und Elektronikdiagnose.";
  const profilePaths = [
    {
      title: "IT-Profil",
      description: "Business Analyse, IT-Teamkoordination, Product Owner Rolle, Scrum-Master-Rolle, Abnahme-/Nutzertests, UI-Prüfung, ERP-/Touristiksoftware, IT-Infrastruktur.",
      href: `downloads/${itProfile.filenameBase}_Public.pdf`,
      button: "Lebenslauf IT-Profil"
    },
    {
      title: "Service-Techniker-Profil",
      description: "Elektronikdiagnose, Prüftechnik, Werkstattpraxis, IT-nahe Systemdiagnose, Home-Lab, technischer Support.",
      href: `downloads/${serviceProfile.filenameBase}_Public.pdf`,
      button: "Lebenslauf Service-Techniker-Profil"
    }
  ];
  const primaryCards = [
    getGroup("requirements_product_scrum"),
    getGroup("qa_uat_ui_design"),
    {
      title: "IT-Infrastruktur & Elektronikdiagnose",
      description: "TrueNAS/NAS, Windows/Linux, Rechtekonzepte, RDP/VPN, Backups sowie 10+ Jahre Elektronikservice mit Mess-, Löt- und Rework-Praxis.",
      items: [
        "TrueNAS/NAS",
        "Windows/Linux",
        "RDP/VPN",
        "Backups",
        "Schaltplanlesen",
        "Multimeter/Oszilloskop",
        "BGA-Rework"
      ]
    }
  ];

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(metaDescription)}">
    <title>${escapeHtml(data.person.name)} - ${escapeHtml(data.person.publicTitle)}</title>
    <link rel="stylesheet" href="assets/site.css">
  </head>
  <body>
    <header class="site-header">
      <nav class="nav" aria-label="Hauptnavigation">
        <a class="brand" href="#top">
          <strong>${escapeHtml(data.person.name)}</strong>
          <span>${escapeHtml(data.person.publicTitle)}</span>
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
            <p class="hero-title">${escapeHtml(data.person.publicTitle)}</p>
            <p class="hero-copy">Requirements · Scrum · Abnahme-/Nutzertests · UI-Prüfung · IT-Infrastruktur · Elektronikdiagnose</p>
            <!-- validate:cta:start -->
            <div class="button-row" data-validate-section="cta">
              <a class="button primary" href="downloads/${escapeHtml(itProfile.filenameBase)}_Public.pdf" download>Lebenslauf IT-Profil</a>
              <a class="button secondary" href="downloads/${escapeHtml(serviceProfile.filenameBase)}_Public.pdf" download>Lebenslauf Service-Techniker-Profil</a>
              <a class="button secondary" href="downloads/${escapeHtml(short.filenameBase)}_Public.pdf" download>Kurzprofil herunterladen</a>
              <a class="button secondary" href="${escapeHtml(publicContact.github)}">GitHub</a>
            </div>
            <!-- validate:cta:end -->
          </div>
          <figure class="hero-photo">
            <img src="assets/profile-photo.png" alt="Portrait von ${escapeHtml(data.person.name)}">
          </figure>
        </div>
      </section>
      <!-- validate:hero:end -->

      <section class="section profile-paths" data-validate-section="profile-paths">
        <div class="section-head">
          <h2>Zwei Einstiegspfade</h2>
          <p class="section-lead">Ein gemeinsamer beruflicher Kern mit zwei klaren öffentlichen Lebenslauf-Varianten: IT/Business-Analyse als Hauptspur und Service-/Elektronikdiagnose als zweite technische Spur.</p>
        </div>
        <div class="profile-path-grid">
          ${profilePaths.map(renderPathCard).join("\n          ")}
        </div>
        <p class="short-download"><a class="button light" href="downloads/${escapeHtml(short.filenameBase)}_Public.pdf" download>Kurzprofil herunterladen</a></p>
      </section>

      <!-- validate:short:start -->
      <section class="statement-band" data-validate-section="short">
        <div class="section statement">
          <h2>Profil in einem Satz</h2>
          <p>${escapeHtml(data.positioning.oneSentence)}</p>
        </div>
      </section>
      <!-- validate:short:end -->

      <!-- validate:bring:start -->
      <section id="kompetenzen" class="section compact" data-validate-section="bring">
        <div class="section-head">
          <h2>Drei Kompetenzbereiche</h2>
          <p class="section-lead">HR-orientierter Überblick: Anforderungen und Scrum, fachliche Qualitätssicherung sowie technische Infrastruktur- und Werkstattbasis.</p>
        </div>
        <div class="bring-grid">
          ${primaryCards.map(renderBringCard).join("\n          ")}
        </div>
      </section>
      <!-- validate:bring:end -->

      <section id="erfahrung" class="section">
        <div class="section-head">
          <h2>Berufliche Erfahrung</h2>
          <p class="section-lead">Schwerpunkt auf aktueller IT-Teamleitung, Business Analyse, Requirements, Scrum, Abnahme- und Nutzertests und früherer Service-/Werkstattverantwortung.</p>
        </div>
        <div class="timeline">
          ${data.experience.map(renderTimelineItem).join("\n          ")}
        </div>
      </section>

      <section id="projekte" class="section">
        <div class="section-head">
          <h2>Projekte / Proof of Work</h2>
          <p class="section-lead">Ausgewählte Arbeiten aus Infrastruktur, ERP-/Touristikprozessen, Qualitätssicherung, Abnahme- und Nutzertests, Website-Prüfung, Codebase/API-Analyse und Hardware-Bring-up.</p>
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
                ${data.electronics.methods.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n                ")}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section id="downloads" class="section">
        <div class="section-head">
          <h2>Bewerbungsunterlagen</h2>
          <p class="section-lead">Öffentliche Unterlagen ohne private Kontaktdaten, vollständige Adresse oder firmenspezifische Varianten.</p>
        </div>
        <div class="download-grid">
          ${documents.map(renderDownload).join("\n          ")}
        </div>
      </section>

      <section id="kontakt" class="contact-band">
        <div class="section">
          <div class="section-head">
            <h2>Kontakt</h2>
            <p class="section-lead">Öffentliche Kontaktangaben für fachliche Rückfragen und Bewerbungsdialoge.</p>
          </div>
          <div class="contact-list">
            <span class="contact-item">Region: ${escapeHtml(data.person.currentRegion)} -> Zielregion ${escapeHtml(data.person.targetRegion)}</span>
            <a class="contact-item" href="mailto:${escapeHtml(publicContact.email)}">${escapeHtml(publicContact.email)}</a>
            <a class="contact-item" href="${escapeHtml(publicContact.github)}">GitHub Profil</a>
            <a class="contact-item" href="${escapeHtml(publicContact.h618Project)}">H618 Projekt</a>
          </div>
          <p class="note">Private Kontaktdaten, vollständige Adresse und Bewerbungsvarianten werden nicht öffentlich bereitgestellt.</p>
        </div>
      </section>
    </main>
  </body>
</html>`;

  function getGroup(id) {
    return data.competencyGroups.find((group) => group.id === id);
  }
}

function renderBringCard(card) {
  return `<article class="card bring-card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description ?? card.items.slice(0, 2).join(" · "))}</p>
            <div class="chips">${card.items.slice(0, 7).map((item) => `<span class="chip">${escapeHtml(shorten(item, 42))}</span>`).join("")}</div>
          </article>`;
}

function renderPathCard(card) {
  return `<article class="card profile-path-card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.description)}</p>
            <p class="path-action"><a class="button light" href="${escapeHtml(card.href)}" download>${escapeHtml(card.button)}</a></p>
          </article>`;
}

function renderTimelineItem(item) {
  return `<article class="timeline-item">
            <div class="period">${escapeHtml(item.period)}</div>
            <div>
              <h3>${escapeHtml(item.publicRole)}</h3>
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
            <p>${escapeHtml(document.subtitle)}</p>
          </a>`;
}

function renderCvDocument(data, document, scope, assets) {
  const css = fs.readFileSync(path.join(root, "templates", "cv.css"), "utf8");
  const printCss = fs.readFileSync(path.join(root, "templates", "print.css"), "utf8");
  const title = document.title;
  const subtitle = document.subtitle ?? document.focus;
  const headerTitle = title;
  const headerContact = [
    `Zielregion: ${data.person.targetRegion}`,
    scope === "private" && privateContact.phone ? `Telefon: ${privateContact.phone}` : null,
    publicContact.email,
    displayUrl(publicContact.github)
  ].filter(Boolean);

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(data.person.name)} - ${escapeHtml(title)}</title>
    <style>${css}\n${printCss}</style>
  </head>
  <body data-cv-template="unified">
    <article class="cv cv-template-unified cv-kind-${escapeHtml(document.kind)}">
      <header class="cv-header cv-section">
        ${assets.photoDataUrl ? `<img class="profile-photo" src="${assets.photoDataUrl}" alt="Portrait von ${escapeHtml(data.person.name)}">` : ""}
        <div class="cv-header-info">
          <h1>${escapeHtml(data.person.name)}</h1>
          <p class="title">${escapeHtml(headerTitle)}</p>
          <p class="meta">${escapeHtml(headerContact.join(" · "))}</p>
          <p class="meta">${escapeHtml(subtitle)}</p>
        </div>
        <a class="cv-qr-block" href="${escapeHtml(assets.githubProfileUrl)}" aria-label="GitHub-Profil"><img src="${assets.githubProfileQrDataUrl}" alt="QR-Code zum GitHub-Profil"><span>GitHub-Profil</span></a>
      </header>

      ${renderCvBody(data, document, scope)}
    </article>
  </body>
</html>`;
}

function renderCvBody(data, document, scope) {
  const variant = data.documentVariants[document.variantKey];
  if (document.kind === "short") {
    return [
      renderSection("Kurzprofil", `<p>${escapeHtml(variant.topProfile)}</p>`),
      renderSection("Zielprofile", renderShortTargetProfiles(data)),
      renderSection("Kernkompetenzen", renderCompetencies(data, ["requirements_product_scrum", "qa_uat_ui_design", "it_infrastructure", "electronics_diagnostics"], 2)),
      renderSection("Aktuelle Rolle", renderExperienceCompact(data.experience.slice(0, 1), 2)),
      renderSection("Ausbildung", renderEducationShort(data)),
      renderSection("Ausgewählte Praxisbeispiele", renderProjects(data.projects.slice(0, 3), true)),
      renderSection("Elektronikbasis", `<p>${escapeHtml([...data.electronics.methods.slice(0, 4), "BGA-Rework mit Reflow/Reballing"].join(" · "))}</p>`),
      renderLanguagesAndFurther(data, scope)
    ].join("\n      ");
  }

  return [
    renderSection("Kurzprofil", renderVariantProfile(variant)),
    renderSection("Zielprofil", renderVariantTargetProfile(variant)),
    renderSection("Kompetenzfelder", renderCompetencyFields(variant)),
    renderSection("Berufserfahrung", data.experience.map((item) => renderCvEntry(item, document.variantKey)).join("\n        ")),
    renderSection("Ausbildung", data.education.map(renderEducationEntry).join("\n        ")),
    renderSection("Technische Praxis & Projekte", renderProjects(data.projects)),
    renderSection("Elektronik & Werkstatt", renderElectronics(data)),
    renderSection("Fortbildung / Zertifizierungen / Schulungen", `<ul>${data.training.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`),
    renderLanguagesAndFurther(data, scope)
  ].join("\n      ");
}

function renderSection(title, content) {
  if (!content) return "";
  return `<section class="cv-section">
        <h2>${escapeHtml(title)}</h2>
        ${content}
      </section>`;
}

function renderShortTargetProfiles(data) {
  const variants = [data.documentVariants.it, data.documentVariants.serviceTechnician];
  return `<div class="target-profile-list">
          ${variants.map((variant) => `<div class="target-profile"><h3>${escapeHtml(variant.targetTitle)}</h3><p>${escapeHtml(variant.targetRoles.slice(0, 4).join(" · "))}</p></div>`).join("\n          ")}
        </div>`;
}

function renderVariantProfile(variant) {
  const highlights = variant.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<p>${escapeHtml(variant.topProfile)}</p><ul>${highlights}</ul>`;
}

function renderVariantTargetProfile(variant) {
  return `<div class="target-profile-list">
          <div class="target-profile"><h3>${escapeHtml(variant.targetTitle)}</h3><ul>${variant.targetRoles.map((role) => `<li>${escapeHtml(role)}</li>`).join("")}</ul></div>
        </div>`;
}

function renderCompetencies(data, ids, maxItems) {
  const selected = ids.map((id) => data.competencyGroups.find((group) => group.id === id)).filter(Boolean);
  return `<div class="grid-two">
          ${selected.map((group) => `<div class="competency-block"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.items.slice(0, maxItems).join(" · "))}</p></div>`).join("\n          ")}
        </div>`;
}

function renderCompetencyFields(variant) {
  return `<div class="grid-two competency-fields">
          ${variant.competencyFields.map((field) => `<div class="competency-block"><h3>${escapeHtml(field.title)}</h3><p>${escapeHtml(field.text)}</p></div>`).join("\n          ")}
        </div>`;
}

function renderExperienceCompact(experience, bulletLimit = 1) {
  return `<ul>${experience.flatMap((item) => item.bullets.slice(0, bulletLimit).map((bullet) => `<li><strong>${escapeHtml(item.period)} · ${escapeHtml(item.publicRole)}</strong>: ${escapeHtml(bullet)}</li>`)).join("")}</ul>`;
}

function renderProjects(projects, compact = false) {
  return projects.map((project) => `<div class="entry project-card"><h3>${escapeHtml(project.title)}</h3>${compact ? "" : `<p class="small">${escapeHtml(project.type)}</p>`}<p>${escapeHtml(project.description)}${project.link ? ` <a href="${escapeHtml(project.link)}">${escapeHtml(project.link)}</a>` : ""}</p></div>`).join("\n        ");
}

function renderElectronics(data) {
  return `<p>${escapeHtml(data.electronics.intro)}</p>
        <p><strong>Geräte:</strong> ${escapeHtml(data.electronics.devices.join(" · "))}</p>
        <p><strong>OEM:</strong> ${escapeHtml(data.electronics.oemContext.join(" · "))}</p>
        <ul>${data.electronics.methods.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderElectronicsCompact(data) {
  return `<p>${escapeHtml(data.electronics.intro)}</p>
        <p><strong>Geräte:</strong> ${escapeHtml(data.electronics.devices.slice(0, 8).join(" · "))}</p>
        <p><strong>Praxis:</strong> ${escapeHtml(data.electronics.methods.slice(0, 6).join(" · "))}</p>
        <p><strong>OEM:</strong> ${escapeHtml(data.electronics.oemContext.join(" · "))}</p>`;
}

function renderEducationEntry(item) {
  return `<div class="entry education-item">
          <h3>${escapeHtml(item.period)} · ${escapeHtml(item.degree)}</h3>
          <p>${escapeHtml(item.details)} · ${escapeHtml(item.institution)}${item.note ? ` · ${escapeHtml(item.note)}` : ""}</p>
        </div>`;
}

function renderEducationShort(data) {
  return `<ul>${data.educationDisplayRules.shortFormat.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderEducationTechnical(data) {
  return `<ul>${data.educationDisplayRules.technicalFormat.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCvEntry(item, variantKey) {
  const metricsTitle = variantKey === "serviceTechnician" ? "Arbeitsumfang / IT-Team-Kennzahlen (Zusatzkontext)" : "Arbeitsumfang / IT-Team-Kennzahlen";
  return `<div class="entry experience-item">
          <h3>${escapeHtml(item.period)} · ${escapeHtml(item.publicRole)}</h3>
          <p class="small">${escapeHtml(item.employer)} · ${escapeHtml(item.location)}</p>
          <p>${escapeHtml(item.focus)}</p>
          <ul>${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
          ${item.metrics ? `<div class="metrics-block ${variantKey === "serviceTechnician" ? "metrics-secondary" : ""}"><h3>${escapeHtml(metricsTitle)}</h3><ul>${item.metrics.map((metric) => `<li>${escapeHtml(metric)}</li>`).join("")}</ul></div>` : ""}
        </div>`;
}

function renderLanguagesAndFurther(data, scope) {
  const further = scope === "private"
    ? [`Geburtsjahr: ${data.person.birthYear}`, "deutsche Staatsangehörigkeit", `Führerschein: ${data.person.driverLicense}`, data.person.car, `Zielregion: ${data.person.targetRegion}`]
    : ["deutsche Staatsangehörigkeit", `Führerschein: ${data.person.driverLicense}`, data.person.car, `Zielregion: ${data.person.targetRegion}`];
  return renderSection("Sprachen und weitere Angaben", `<div class="grid-two"><div><h3>Sprachen</h3><ul>${data.languages.map((item) => `<li>${escapeHtml(`${item.language}: ${item.level}`)}</li>`).join("")}</ul></div><div><h3>Weitere Angaben</h3><ul>${further.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>`);
}

function shorten(value, maxLength) {
  const text = String(value ?? "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}...`;
}
