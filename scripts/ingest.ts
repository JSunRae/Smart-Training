type DocumentChunk = {
  id: string;
  text: string;
  metadata: {
    tenant: string;
    language: string;
    product: string;
    source: string;
  };
};

export function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  if (!text.trim()) return [];
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) {
      break;
    }
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export async function indexChunks(chunks: DocumentChunk[]): Promise<void> {
  for (const chunk of chunks) {
    console.log(`Indexing chunk ${chunk.id} for tenant ${chunk.metadata.tenant}`);
  }
}

export async function queryRelevantChunks(
  _query: string,
  tenant: string
): Promise<DocumentChunk[]> {
  return [
    {
      id: "demo-1",
      text: "Demo retrieval result",
      metadata: {
        tenant,
        language: "en-GB",
        product: "security-suite",
        source: "sample"
      }
    }
  ];
}
