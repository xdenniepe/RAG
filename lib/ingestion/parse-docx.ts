import mammoth from "mammoth";

function cleanText(text: string) {
  return text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function parseDocxFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });
  return cleanText(result.value ?? "");
}
