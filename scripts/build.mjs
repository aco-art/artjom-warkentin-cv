import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";

const profile = readJson("src/profile.json");
const publicContact = profile.contact.public;
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
  const heroSupport = "Requirements · Scrum-Master-Rolle · Abnahme-/Nutzertests · UI-Prüfung · IT-Infrastruktur · Elektronikdiagnose";
  const currentExperience = data.experience[0];
  const currentRoleBullets = [
    "IT-Team fachlich koordiniert: Aufgaben, Priorisierung, Daily/Weekly, Sprint-/Releaseplanung und Abnahmevorbereitung.",
    "Anforderungen in Pflichtenhefte, User Stories, Use Cases, Akzeptanzkriterien und Entwickleraufgaben übersetzt.",
    "Abnahme-/Nutzertests, UI-/Website-Prüfung, Bug Reports, Fehlernachverfolgung und Abnahmen vorbereitet.",
    "TrueNAS-Projektspeicher, interne Dienste, technische Dokumentation und Testvorbereitung aufgebaut bzw. begleitet."
  ];
  const coreFields = [
    {
      title: "IT, Requirements & Teamkoordination",
      text: "Requirements, Entwickleraufgaben, Product Owner Rolle, Scrum-Master-Rolle, Backlog, Priorisierung, Release- und Abnahmevorbereitung."
    },
    {
      title: "Tests, UI-Prüfung & Dokumentation",
      text: "Abnahme-/Nutzertests, UI-/Website-Workflows, Designabgleich, Bug Reports, Postman, Browser DevTools, MCP-/Playwright-gestützte UI-Prüfung."
    },
    {
      title: "IT-Infrastruktur & interne Dienste",
      text: "TrueNAS/NAS, SMB/Rechte, Windows/Linux, RDP/USB-over-RDP, VPN/DNS, Backups, Monitoring, Docker-nahe lokale Dienste."
    },
    {
      title: "Elektronikservice & Diagnose",
      text: "Board-Level-Service, Datensicherung/Backup, Stromversorgung, Mainboard-Diagnose, Oszilloskop/Logikanalysator, Rework, Funktionsprüfung."
    }
  ];
  const compactExperience = [
    {
      period: "01/2023 - heute",
      role: "Abteilungsleiter IT / Business Analyst & Product Owner",
      employer: "INFORMA GmbH & Co. KG",
      bullets: [
        "Requirements, Entwickleraufgaben, Backlog/Priorisierung, Abnahme-/Nutzertests, UI-Prüfung und Release-Abstimmung zwischen Fachbereichen, Kunden und Entwicklung koordiniert.",
        "TrueNAS-Projektspeicher, interne Dienste, technische Dokumentation und Codex-/LLM-gestützte Strukturierung von Spezifikationen und Tests aufgebaut bzw. begleitet."
      ]
    },
    {
      period: "06/2022 - 01/2023",
      role: "Kommissarische IT-Leitung / Scrum- und Umsetzungskoordination",
      employer: "INFORMA GmbH & Co. KG",
      bullets: [
        "Scrum-Arbeitsweise eingeführt und Daily/Weekly, Sprint-/Aufgabensteuerung, offene Punkte und Release-Abstimmung übernommen.",
        "Entwickleraufgaben vorbereitet, Kundenanforderungen priorisiert und Abnahme-/Nutzertests begleitet."
      ]
    },
    {
      period: "10/2018 - 06/2019",
      role: "Handelsautomatisierung, Systemadministration und Webshop-Integration",
      employer: "MEGA GmbH",
      bullets: [
        "Windows Server, Linux/CentOS, NGINX, Apache, MySQL und Mailserver im Handels-/Webshop-Umfeld administriert.",
        "Webshop-Einführung, CRM-Bitrix-Anbindung und 1C-Integration technisch begleitet."
      ]
    },
    {
      period: "2008 - 2018",
      role: "Elektronik-/IT-Service, Werkstatt, OEM, Reparaturqualität",
      employer: "Innovation Service Center",
      bullets: [
        "Werkstattprozesse, komplexe Diagnose, Reparaturqualität, Ersatzteile, OEM-Serviceumfeld und technische Eskalationen verantwortet.",
        "Mainboards, Stromversorgung, Peripherie und elektronische Baugruppen diagnostiziert, repariert, geprüft und dokumentiert."
      ]
    },
    {
      period: "2006 - 2008",
      role: "Servicetechniker Reparatur & Elektronik",
      employer: "Einzelunternehmer Badin - Reparatur & Elektronik",
      bullets: [
        "Computertechnik diagnostiziert, Baugruppen instandgesetzt, Funktionstests durchgeführt und Reparaturergebnisse dokumentiert."
      ]
    }
  ];
  const professionalProjects = data.projects.filter((project) => [
    "informa_erp_tourism",
    "truenas_project_hub",
    "monitoring_internal_services",
    "codebase_api_documentation"
  ].includes(project.id));
  const privateProjects = data.projects.filter((project) => [
    "home_lab_automation",
    "h618_embedded"
  ].includes(project.id));
  const projectSummaries = {
    informa_erp_tourism: "Requirements, Entwickleraufgaben, User Stories, Use Cases, Akzeptanzkriterien, UI-/Website-Tests, Abnahme-/Nutzertests und Dokumentation im Umfeld interner ERP- und touristiknaher Softwareprozesse.",
    truenas_project_hub: "Zentraler Projekt-Hub auf TrueNAS-Basis mit SMB-Shares, Rechte-/Benutzerstruktur, Fachbereichsnutzung, Performance-Tuning und technischer Dokumentation.",
    monitoring_internal_services: "Interne Monitoring-Anwendung zur Beobachtung von Websites, Projekten und technischen Zuständen mit Fokus auf Transparenz, Fehlererkennung und Systemübersicht.",
    codebase_api_documentation: "Werkzeuge und Skripte für Codebase-Orientierung, Swagger/OpenAPI-Auswertung, Projektkarten, Roadmaps, Usecase-Indizes und technische Dokumentation.",
    home_lab_automation: "Private Home-Lab-Umgebung mit n8n, Telegram-Bot, Caching-DNS, Werbeblocker, VPN-Client, Home Assistant und lokalen Serverdiensten.",
    h618_embedded: "Privates Embedded-/Hardware-Projekt mit Armbian userpatches, U-Boot/SPL-, Kernel- und DTB-Anpassungen, LAN/UART/ADB-Diagnose und reproduzierbarer Build-Dokumentation."
  };
  const workshopDevices = "Notebooks, PCs, Mainboards, Monitore, Tablets, Smartphones, Netzteile, Grafikkarten, Router, TV-Boxen, Peripherie.";
  const workshopDiagnostics = "Datensicherung/Backup, Stromversorgung, Mainboard-Diagnose, Schaltplanlesen, Oszilloskop/Multimeter, Logikanalysator, SMD-Löten, Löten bedrahteter Bauteile, Heißluft, Mikroskop, BGA-Rework, Firmware/BIOS/EEPROM, Funktionsprüfung.";

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
          <a href="#downloads">Unterlagen</a>
          <a href="#aktuell">Aktuell</a>
          <a href="#kompetenzen">Kernfelder</a>
          <a href="#erfahrung">Erfahrung</a>
          <a href="#projekte">Projekte</a>
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
            <p class="hero-copy">${escapeHtml(heroSupport)}</p>
            <!-- validate:cta:start -->
            <div class="button-row" data-validate-section="cta">
              <a class="button primary" href="downloads/${escapeHtml(short.filenameBase)}_Public.pdf" download>Kurzprofil</a>
              <a class="button secondary" href="downloads/${escapeHtml(itProfile.filenameBase)}_Public.pdf" download>Lebenslauf IT-Profil</a>
              <a class="button secondary" href="downloads/${escapeHtml(serviceProfile.filenameBase)}_Public.pdf" download>Lebenslauf Service-Techniker-Profil</a>
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

      <section id="downloads" class="section downloads-section">
        <div class="section-head">
          <h2>Bewerbungsunterlagen</h2>
        </div>
        <div class="download-grid">
          ${documents.map(renderDownload).join("\n          ")}
        </div>
      </section>

      <section id="aktuell" class="section current-role">
        <div class="section-head">
          <h2>Aktuelle Tätigkeit & Arbeitsumfang</h2>
        </div>
        <div class="current-role-body">
          <p>Artjom Warkentin arbeitet aktuell als Abteilungsleiter IT, Business Analyst & Product Owner bei ${escapeHtml(currentExperience.employer)}.</p>
          <ul>${currentRoleBullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
          <h3>Arbeitsumfang / IT-Team-Kennzahlen</h3>
          <ul>${currentExperience.metrics.map((metric) => `<li>${escapeHtml(metric)}</li>`).join("")}</ul>
        </div>
      </section>

      <!-- validate:bring:start -->
      <section id="kompetenzen" class="section compact" data-validate-section="bring">
        <div class="section-head">
          <h2>Kernfelder</h2>
        </div>
        <div class="core-field-grid">
          ${coreFields.map(renderSimpleCard).join("\n          ")}
        </div>
      </section>
      <!-- validate:bring:end -->

      <section id="erfahrung" class="section">
        <div class="section-head">
          <h2>Berufliche Erfahrung</h2>
        </div>
        <div class="timeline">
          ${compactExperience.map(renderCompactTimelineItem).join("\n          ")}
        </div>
      </section>

      <section id="projekte" class="section">
        <div class="section-head">
          <h2>Technische Praxis & Projekte</h2>
        </div>
        <div class="project-groups">
          ${renderProjectGroup("Berufliche Praxis", professionalProjects, projectSummaries)}
          ${renderProjectGroup("Private technische Projekte", privateProjects, projectSummaries)}
        </div>
      </section>

      <section class="workshop">
        <div class="section">
          <div class="section-head">
            <h2>Elektronik & Werkstatt</h2>
          </div>
          <div class="workshop-grid">
            <article class="card">
              <h3>Geräte</h3>
              <p>${escapeHtml(workshopDevices)}</p>
            </article>
            <article class="card">
              <h3>Diagnose/Reparatur</h3>
              <p>${escapeHtml(workshopDiagnostics)}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="kontakt" class="contact-band">
        <div class="section">
          <div class="section-head">
            <h2>Kontakt</h2>
          </div>
          <div class="contact-list">
            <span class="contact-item">Zielregion: ${escapeHtml(data.person.targetRegion)}</span>
            <a class="contact-item" href="mailto:${escapeHtml(publicContact.email)}">${escapeHtml(publicContact.email)}</a>
            <a class="contact-item" href="${escapeHtml(publicContact.github)}">GitHub Profil</a>
            <a class="contact-item" href="${escapeHtml(publicContact.h618Project)}">H618 Projekt</a>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function renderSimpleCard(card) {
  return `<article class="card simple-card">
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.text)}</p>
          </article>`;
}

function renderCompactTimelineItem(item) {
  return `<article class="timeline-item">
            <div class="period">${escapeHtml(item.period)}</div>
            <div>
              <h3>${escapeHtml(item.role)}</h3>
              <p class="meta">${escapeHtml(item.employer)}</p>
              <ul>${item.bullets.slice(0, 2).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
            </div>
          </article>`;
}

function renderProjectGroup(title, projects, summaries) {
  return `<section class="project-group">
            <h3>${escapeHtml(title)}</h3>
            <div class="project-grid">
              ${projects.map((project) => renderProjectCard(project, summaries[project.id])).join("\n              ")}
            </div>
          </section>`;
}

function renderProjectCard(project, summary) {
  const link = project.link ? `<p class="project-link"><a href="${escapeHtml(project.link)}">Projekt ansehen</a></p>` : "";
  return `<article class="card project-card">
            <h3>${escapeHtml(project.title)}</h3>
            <p>${escapeHtml(summary ?? project.description)}</p>
            ${link}
          </article>`;
}

function renderDownload(document) {
  return `<a class="download" href="downloads/${escapeHtml(document.filenameBase)}_Public.pdf" download>
            <h3>${escapeHtml(document.label)}</h3>
          </a>`;
}

function renderCvDocument(data, document, scope, assets) {
  const css = fs.readFileSync(path.join(root, "templates", "cv.css"), "utf8");
  const printCss = fs.readFileSync(path.join(root, "templates", "print.css"), "utf8");
  const title = document.title;
  const subtitle = document.subtitle ?? document.focus;
  const headerTitle = title;
  const githubDisplayUrl = displayUrl(assets.githubProfileUrl);

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
        <div class="cv-photo-col">
          ${assets.photoDataUrl ? `<img class="profile-photo" src="${assets.photoDataUrl}" alt="Portrait von ${escapeHtml(data.person.name)}">` : ""}
        </div>
        <div class="cv-main-col">
          <h1>${escapeHtml(data.person.name)}</h1>
          <p class="title">${escapeHtml(headerTitle)}</p>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
          <p class="target-region">Zielregion: ${escapeHtml(data.person.targetRegion)}</p>
        </div>
        <div class="cv-contact-col">
          <p>${escapeHtml(publicContact.email)}</p>
          <p>${escapeHtml(githubDisplayUrl)}</p>
          <a class="cv-qr-block" href="${escapeHtml(assets.githubProfileUrl)}" aria-label="GitHub-Profil"><img src="${assets.githubProfileQrDataUrl}" alt="QR-Code zum GitHub-Profil"><span>GITHUB-PROFIL</span></a>
        </div>
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
