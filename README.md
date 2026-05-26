# Artjom Warkentin CV / Portfolio

Static GitHub Pages project for a public professional CV and portfolio landing page.

Main positioning: **Technischer IT-Service & Elektronikdiagnose**  
Target region: **Soltau / Heidekreis / Niedersachsen**

Expected public URL after deployment:

```text
https://aco-art.github.io/artjom-warkentin-cv/
```

## Build

```bash
npm install
npm run build
npm run validate
npm run preview
```

The public site is generated into `public/`. GitHub Pages deploys only that directory.

For CI / Pages, use the public-only build:

```bash
npm run build:public
npm run validate:public
```

## Privacy Boundary

Public page is optimized for portfolio visibility; detailed CV PDFs may contain personal data and should be reviewed before public release.

- `public/downloads/` contains only sanitized public-safe files.
- `dist/for_application/` contains local full application exports and is ignored by Git.
- `private/profile.private.json` is ignored by Git and may contain application-only contact data.
- `.android/`, old DOCX originals, nested repositories, private logs, device dumps and machine-specific paths must not be published.

## Source Material Reviewed

- `Lebenslauf Elektronikreparateur Artjom Warketnin.docx`
- `Lebenslauf IT Artjom Warketnin.docx`
- `Lebenslauf_Artjom_Warkentin_Technischer_IT_Service_Elektronik.docx`
- H618 public project README, hardware profile, known status and notice files
- selected private `.android` summary documents, used only as internal fact context

## Generated Outputs

Public:

- `public/index.html`
- `public/assets/`
- `public/downloads/*_Public.pdf`
- `public/downloads/*_Public.docx`

Local application exports:

- `dist/for_application/*.pdf`
- `dist/for_application/*.docx`

## GitHub Pages Setup

If the remote repository exists:

```bash
git init -b main
git add README.md .gitignore package.json package-lock.json src assets templates scripts public .github
git commit -m "Create CV portfolio site"
git remote add origin git@github.com:aco-art/artjom-warkentin-cv.git
git push -u origin main
```

If the repository does not exist yet, create a public GitHub repository named `aco-art/artjom-warkentin-cv`, then run the remote and push commands above.

The workflow in `.github/workflows/pages.yml` builds the public site, exports PDFs, validates content, uploads `public/`, and deploys GitHub Pages.

## Validation / Safety Gate

Run before committing or publishing:

```bash
npm run build
npm run validate
find public -type f | sort
find public/downloads -type f | sort
rg -n "\\+49|0176|65165602|Tel\\.?|Telefon|Straße|Strasse|Hausnummer|[0-9]{5}" public || true
rg -n "\\.android|Lebenslauf .*\\.docx|vontar-h618-armbian-patches/|/home/acoart|/home/warkentin" public || true
```

If any private data appears under `public/`, fix it, rebuild, and rerun validation.

## TODO

- Add public GitLab Android project URL.
- Replace the extracted 312x310 DOCX portrait with a higher-resolution professional photo if available.
