import {
  AlignmentType,
  BorderStyle,
  Document,
  Paragraph,
  Tab,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import { parseResume } from "@/lib/resumeParser";

// Sizes are in half-points (docx convention): 22 = 11pt.
export const DOC_VARIANTS = {
  v1: {
    label: "V1 · Classic serif",
    font: "Georgia",
    center: true,
    nameCaps: true,
    nameSize: 36,
    nameColor: "000000",
    headerCaps: true,
    headerSize: 24,
    headerColor: "000000",
    headerBorder: "000000",
    body: 22,
    bodyColor: "000000",
  },
  v2: {
    label: "V2 · Modern blue",
    font: "Calibri",
    center: false,
    nameCaps: false,
    nameSize: 44,
    nameColor: "111827",
    headerCaps: true,
    headerSize: 24,
    headerColor: "2563EB",
    headerBorder: null,
    body: 22,
    bodyColor: "1F2937",
  },
  v3: {
    label: "V3 · Minimal compact",
    font: "Arial",
    center: false,
    nameCaps: true,
    nameSize: 30,
    nameColor: "111827",
    headerCaps: true,
    headerSize: 18,
    headerColor: "6B7280",
    headerBorder: null,
    body: 20,
    bodyColor: "1F2937",
  },
  v4: {
    label: "V4 · Executive navy",
    font: "Cambria",
    center: true,
    nameCaps: true,
    nameSize: 38,
    nameColor: "1F3A5F",
    headerCaps: true,
    headerSize: 24,
    headerColor: "1F3A5F",
    headerBorder: "1F3A5F",
    body: 22,
    bodyColor: "1F2937",
  },
};

function run(text, cfg, opts = {}) {
  return new TextRun({
    text,
    font: cfg.font,
    size: opts.size ?? cfg.body,
    color: opts.color ?? cfg.bodyColor,
    bold: opts.bold,
    italics: opts.italics,
  });
}

function buildResumeParagraphs(text, cfg) {
  const parsed = parseResume(text);
  const align = cfg.center ? AlignmentType.CENTER : AlignmentType.LEFT;
  const paragraphs = [];

  paragraphs.push(
    new Paragraph({
      alignment: align,
      spacing: { after: 60 },
      children: [
        run(cfg.nameCaps ? parsed.name.toUpperCase() : parsed.name, cfg, {
          bold: true,
          size: cfg.nameSize,
          color: cfg.nameColor,
        }),
      ],
    })
  );

  parsed.contact.forEach((line) => {
    paragraphs.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 40 },
        children: [run(line, cfg)],
      })
    );
  });

  parsed.sections.forEach((section) => {
    if (section.title) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          border: cfg.headerBorder
            ? { bottom: { color: cfg.headerBorder, space: 2, style: BorderStyle.SINGLE, size: 6 } }
            : undefined,
          children: [
            run(cfg.headerCaps ? section.title.toUpperCase() : section.title, cfg, {
              bold: true,
              size: cfg.headerSize,
              color: cfg.headerColor,
            }),
          ],
        })
      );
    }

    section.items.forEach((item) => {
      if (item.kind === "entry") {
        paragraphs.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            spacing: { before: 100, after: 40 },
            children: [
              run(item.left, cfg, { bold: true }),
              new TextRun({
                children: [new Tab(), item.right],
                font: cfg.font,
                size: cfg.body,
                color: cfg.bodyColor,
              }),
            ],
          })
        );
      } else if (item.kind === "sub") {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [run(item.text, cfg, { italics: true })],
          })
        );
      } else if (item.kind === "bullet") {
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [run(item.text, cfg)],
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 60 },
            children: [run(item.text, cfg)],
          })
        );
      }
    });
  });

  return paragraphs;
}

function buildLetterParagraphs(text, cfg) {
  return text.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return new Paragraph({ text: "", spacing: { after: 60 } });
    return new Paragraph({
      spacing: { after: 80 },
      children: [run(trimmed, cfg)],
    });
  });
}

export function buildResumeDoc(resumeText, variant = "v1") {
  const cfg = DOC_VARIANTS[variant] || DOC_VARIANTS.v1;
  return new Document({ sections: [{ children: buildResumeParagraphs(resumeText, cfg) }] });
}

export function buildLetterDoc(letterText, variant = "v1") {
  const cfg = DOC_VARIANTS[variant] || DOC_VARIANTS.v1;
  return new Document({ sections: [{ children: buildLetterParagraphs(letterText, cfg) }] });
}
