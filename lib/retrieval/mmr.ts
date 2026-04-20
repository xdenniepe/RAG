type CandidateChunk = {
  id: string;
  content: string;
  similarity: number;
};

function cosineApprox(textA: string, textB: string) {
  const wordsA = new Set(textA.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\W+/).filter(Boolean));
  if (!wordsA.size || !wordsB.size) return 0;
  let overlap = 0;
  for (const token of wordsA) {
    if (wordsB.has(token)) overlap += 1;
  }
  return overlap / Math.sqrt(wordsA.size * wordsB.size);
}

export function rerankWithMMR(
  candidates: CandidateChunk[],
  limit: number,
  lambda = 0.7,
) {
  if (candidates.length <= limit) return candidates;
  const selected: CandidateChunk[] = [];
  const pool = [...candidates];

  while (selected.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const [index, candidate] of pool.entries()) {
      const maxRedundancy = selected.length
        ? Math.max(
            ...selected.map((item) => cosineApprox(item.content, candidate.content)),
          )
        : 0;
      const score = lambda * candidate.similarity - (1 - lambda) * maxRedundancy;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    selected.push(pool[bestIndex]);
    pool.splice(bestIndex, 1);
  }

  return selected;
}
