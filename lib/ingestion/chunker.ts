import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { ChunkRecord, NormalizedSection, ParsedFile } from "@/lib/ingestion/types";

export const CHUNKING_VERSION = "chunk_v1";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 900,
  chunkOverlap: 180,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export async function chunkParsedFile(params: {
  file: ParsedFile;
  sections: NormalizedSection[];
}): Promise<ChunkRecord[]> {
  const records: ChunkRecord[] = [];
  let chunkIndex = 0;

  for (const section of params.sections) {
    const chunks = await splitter.splitText(section.sectionText);
    for (const content of chunks) {
      records.push({
        chunkIndex,
        tokenCount: estimateTokens(content),
        content,
        sectionOrder: section.sectionOrder,
        sectionTitle: section.sectionTitle,
        pageNumber:
          typeof section.metadata.pageNumber === "number"
            ? section.metadata.pageNumber
            : null,
        metadata: {
          ...params.file.metadata,
          fileName: params.file.fileName,
          mimeType: params.file.mimeType,
          sectionOrder: section.sectionOrder,
          sectionTitle: section.sectionTitle ?? "",
          chunkingVersion: CHUNKING_VERSION,
        },
      });
      chunkIndex += 1;
    }
  }

  return records;
}
