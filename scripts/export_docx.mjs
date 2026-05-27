import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicOnly = process.env.PUBLIC_ONLY === "1";
const profile = JSON.parse(fs.readFileSync(path.join(root, "src", "profile.json"), "utf8"));
const privateProfilePath = path.join(root, "src", "profile.private.json");
const privateProfile = fs.existsSync(privateProfilePath)
  ? JSON.parse(fs.readFileSync(privateProfilePath, "utf8"))
  : {};
const publicContact = profile.contact.public;
const privateContact = {
  phone: privateProfile.phone,
  city: privateProfile.city ?? privateProfile.applicationLocation
};
const master = {
  title: profile.targetProfiles.itBusinessTechnical.title,
  filenameBase: "Artjom_Warkentin_Lebenslauf_Business_Analyst_IT_Teamleiter",
  targetRoles: profile.targetProfiles.itBusinessTechnical.targetRoles
};

if (publicOnly) {
  console.log("Skipped public DOCX export; public downloads are PDF-only.");
} else {
  await writeDocx("private", path.join(root, "dist", "for_application", `${master.filenameBase}.docx`));
}

async function writeDocx(scope, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const document = buildDocument(scope);
  const buffer = await Packer.toBuffer(document);
  fs.writeFileSync(outputPath, buffer);
  if (buffer.length < 10_000) {
    throw new Error(`Generated DOCX looks too small: ${path.relative(root, outputPath)} (${buffer.length} bytes)`);
  }
  console.log(`Generated ${path.relative(root, outputPath)}`);
}

function buildDocument(scope) {
  const children = [];
  const contact = scope === "private"
    ? [
        privateContact.city || profile.person.currentRegion,
        privateContact.phone ? `Telefon: ${privateContact.phone}` : null,
        `E-Mail: ${publicContact.email}`,
        `GitHub: ${publicContact.github}`
      ].filter(Boolean)
    : [
        `E-Mail: ${publicContact.email}`,
        `GitHub: ${publicContact.github}`,
        `Zielregion: ${profile.person.targetRegion}`
      ];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: profile.person.name, bold: true, size: 34 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: master.title, bold: true, color: "0B7EA3", size: 24 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: contact.join(" · "), size: 20 })]
    })
  );

  addHeading(children, "Kurzprofil");
  profile.positioning.shortProfile.forEach((line) => children.push(paragraph(line)));

  addHeading(children, "Zielpositionen");
  children.push(paragraph(master.targetRoles.join(" · ")));

  addHeading(children, "Kernkompetenzen");
  for (const group of profile.competencyGroups) {
    children.push(paragraph(`${group.title}: ${group.items.join(" · ")}`));
  }

  addHeading(children, "Berufserfahrung");
  for (const item of profile.experience) {
    children.push(paragraph(`${item.period} · ${item.publicRole}`, true));
    children.push(paragraph(`${item.employer} · ${item.location}`));
    children.push(paragraph(item.focus));
    item.bullets.forEach((bullet) => children.push(bulletParagraph(bullet)));
  }

  addHeading(children, "Ausgewählte Projekte");
  for (const project of profile.projects) {
    children.push(paragraph(project.title, true));
    children.push(paragraph(`${project.description}${project.link ? ` ${project.link}` : ""}`));
  }

  addHeading(children, "Elektronik & Werkstatt");
  children.push(paragraph(profile.electronics.intro));
  children.push(paragraph(`Geräte: ${profile.electronics.devices.join(" · ")}`));
  profile.electronics.methods.forEach((item) => children.push(bulletParagraph(item)));

  addHeading(children, "Ausbildung");
  for (const item of profile.education) {
    children.push(paragraph(`${item.period} · ${item.degree}`, true));
    children.push(paragraph(`${item.details} · ${item.institution}${item.note ? ` · ${item.note}` : ""}`));
  }

  addHeading(children, "Fortbildung / Zertifizierungen / Schulungen");
  profile.training.forEach((item) => children.push(bulletParagraph(item)));

  addHeading(children, "Sprachen");
  profile.languages.forEach((item) => children.push(bulletParagraph(`${item.language}: ${item.level}`)));

  addHeading(children, "Weitere Angaben");
  const further = scope === "private"
    ? [`Geburtsjahr: ${profile.person.birthYear}`, `Staatsangehörigkeit: ${profile.person.citizenship}`, `Führerschein: ${profile.person.driverLicense}`, profile.person.car, `Zielregion: ${profile.person.targetRegion}`]
    : [`Staatsangehörigkeit: ${profile.person.citizenship}`, `Führerschein: ${profile.person.driverLicense}`, profile.person.car, `Zielregion: ${profile.person.targetRegion}`];
  further.forEach((item) => children.push(bulletParagraph(item)));

  return new Document({
    creator: "Artjom Warkentin",
    title: `${profile.person.name} - ${master.title}`,
    description: "Lebenslauf für Business Analyse, IT-Teamleitung, technische Systembetreuung und Elektronikdiagnose.",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  });
}

function addHeading(children, text) {
  children.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 80 } }));
}

function paragraph(text, bold = false) {
  return new Paragraph({
    spacing: { after: 90 },
    children: [new TextRun({ text, bold, size: 20 })]
  });
}

function bulletParagraph(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 20 })]
  });
}
