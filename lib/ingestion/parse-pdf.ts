import { PDFParse } from "pdf-parse";

function cleanText(text: string) {
  return text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function parsePdfFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();
  return cleanText(parsed.text ?? "");
}
