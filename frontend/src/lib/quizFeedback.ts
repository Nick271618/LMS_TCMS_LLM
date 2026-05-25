/** Индексы вариантов, для которых показываем объяснение при неверной попытке. */
export function feedbackIndicesToShow(
  selected: number[],
  correctIndices: number[],
): number[] {
  const correct = new Set(correctIndices);
  const chosen = new Set(selected);
  const indices = new Set<number>();
  for (const i of chosen) {
    if (!correct.has(i)) indices.add(i);
  }
  for (const i of correct) {
    if (!chosen.has(i)) indices.add(i);
  }
  return [...indices].sort((a, b) => a - b);
}
