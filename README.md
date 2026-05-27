# Artjom Warkentin - CV / Portfolio

Public GitHub Pages CV and portfolio site for **Artjom Warkentin**.

**Positioning:** Business Analyst & IT-Teamleiter mit technischer Service- und Elektronikpraxis  
**Target region:** Soltau / Heidekreis / Niedersachsen  
**Live site:** https://aco-art.github.io/artjom-warkentin-cv/

## Public Downloads

The public site provides exactly three PDF documents without private contact data, full address or private application variants:

- `Artjom_Warkentin_Kurzprofil_Public.pdf` - 1-page HR snapshot.
- `Artjom_Warkentin_Lebenslauf_IT_Public.pdf` - Business Analyst / IT-Teamleitung / Scrum / Abnahme- und Nutzertests / ERP / IT-Infrastruktur.
- `Artjom_Warkentin_Lebenslauf_ServiceTechniker_Public.pdf` - Elektronikdiagnose / Prüftechnik / technischer IT-Service.

## Project Structure

- `src/profile.json` contains public, tracked profile data.
- `src/profile.private.json` can be created locally for private application exports and is ignored by Git.
- `scripts/` builds the static site and exports PDFs.
- `public/` is the GitHub Pages output directory.
- `.github/workflows/pages.yml` deploys only `public/`.

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

Only sanitized public output is deployed. Private contact data, full addresses, private logs, old DOCX source files and firm-specific application variants must not be placed in `public/`.

Wenn dieses Repository öffentlich ist, dürfen private Kontaktdaten nicht in getrackten Quelldateien liegen. Bereits veröffentlichte Git-Historie muss bei Bedarf separat geprüft werden.
