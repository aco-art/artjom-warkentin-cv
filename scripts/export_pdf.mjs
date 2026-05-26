import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";
const profile = JSON.parse(fs.readFileSync(path.join(root, "src", "profile.json"), "utf8"));

const jobs = [];
for (const variant of profile.cvVariants) {
  jobs.push({
    html: path.join(root, "dist", "html", `${variant.id}.public.html`),
    pdf: path.join(root, "public", "downloads", `${variant.filenameBase}_Public.pdf`)
  });
  if (!publicOnly) {
    jobs.push({
      html: path.join(root, "dist", "html", `${variant.id}.private.html`),
      pdf: path.join(root, "dist", "for_application", `${variant.filenameBase}.pdf`)
    });
  }
}

const browser = await chromium.launch({ headless: true });
try {
  for (const job of jobs) {
    if (!fs.existsSync(job.html)) {
      throw new Error(`Missing HTML source for PDF export: ${path.relative(root, job.html)}`);
    }
    fs.mkdirSync(path.dirname(job.pdf), { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.goto(pathToFileURL(job.html).href, { waitUntil: "networkidle" });
    await page.pdf({
      path: job.pdf,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" }
    });
    await page.close();
    const stat = fs.statSync(job.pdf);
    if (stat.size < 10_000) {
      throw new Error(`Generated PDF looks too small: ${path.relative(root, job.pdf)} (${stat.size} bytes)`);
    }
    console.log(`Generated ${path.relative(root, job.pdf)}`);
  }
} finally {
  await browser.close();
}
