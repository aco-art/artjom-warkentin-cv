# Artjom Warkentin - CV / Portfolio

Public CV and portfolio site for **Artjom Warkentin**.

**Positioning:** Technischer IT-Service & Elektronikdiagnose  
**Target region:** Soltau / Heidekreis / Niedersachsen  
**Live site:** https://aco-art.github.io/artjom-warkentin-cv/

## Profile

Hands-on IT-Infrastruktur, Elektronikdiagnose und KI-gestützte technische Dokumentation.

This project presents a public, recruiter-readable portfolio for technical roles where system understanding, clean fault isolation, documentation quality and practical service experience matter.

Relevant target areas:

- IT-Systembetreuung / IT-Service
- Technischer Support / Serviceinnendienst
- Servicetechniker Elektronik / Prüftechnik
- IT-nahe Systemdiagnose / Infrastrukturservice

## Public Downloads

The site provides public-safe CV downloads without phone number, full address or private application documents:

- Master CV: Technischer IT-Service & Elektronikdiagnose
- Soltau CV: IT-Systembetreuung & Technischer IT-Service
- Rheinmetall/Elektronik CV: Elektronikdiagnose, Prüftechnik & Technischer Service
- ATS-readable DOCX version

Full application documents and educational certificates are shared directly with employers when needed.

## Project Structure

- `src/` contains structured profile and CV source content.
- `scripts/` builds the static site and exports PDF/DOCX files.
- `public/` is the GitHub Pages output directory.
- `.github/workflows/pages.yml` deploys the site through GitHub Actions.

## Local Build

```bash
npm install
npm run build
npm run validate
npm run preview
```

For GitHub Pages CI:

```bash
npm run build:public
npm run validate:public
```

## Privacy

Only the sanitized `public/` output is deployed. Private application exports, certificates, local source documents, logs and machine-specific files are intentionally excluded from the repository and from GitHub Pages.
