import { Packer } from "docx";
import { DOC_VARIANTS, buildResumeDoc, buildLetterDoc } from "@/lib/docxBuilder";

export { DOC_VARIANTS };

async function downloadDoc(doc, filename) {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return blob;
}

export async function downloadResumeAsDocx(resumeText, variant = "v1", filename = "tailored-resume.docx") {
  return downloadDoc(buildResumeDoc(resumeText, variant), filename);
}

export async function downloadCoverLetterAsDocx(letterText, variant = "v1", filename = "cover-letter.docx") {
  return downloadDoc(buildLetterDoc(letterText, variant), filename);
}
