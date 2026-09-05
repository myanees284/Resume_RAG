export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index];
    const rightValue = right[index];
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  if (denominator === 0) {
    return 0;
  }

  return dot / denominator;
}

export function exactRescore(
  hits: Array<{ embedding?: number[]; score: number }>,
  queryVector: number[]
): number[] {
  return hits
    .map((hit, index) => ({
      index,
      score:
        hit.embedding && hit.embedding.length === queryVector.length
          ? cosineSimilarity(queryVector, hit.embedding)
          : hit.score,
    }))
    .sort((left, right) => right.score - left.score)
    .map((item) => item.index);
}
