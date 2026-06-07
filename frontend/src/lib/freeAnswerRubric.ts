export type FreeAnswerCriterionId = "definition_accuracy" | "completeness" | "clarity";

export type FreeAnswerCriterion = {
  id: FreeAnswerCriterionId;
  enabled: boolean;
  weight: number;
  hint: string;
};

export type FreeAnswerRubric = {
  criteria: FreeAnswerCriterion[];
  pass_percent: number;
  free_text: string;
};

export const FREE_ANSWER_CATALOG: { id: FreeAnswerCriterionId; defaultWeight: number }[] = [
  { id: "definition_accuracy", defaultWeight: 50 },
  { id: "completeness", defaultWeight: 30 },
  { id: "clarity", defaultWeight: 20 },
];

export const defaultFreeAnswerRubric = (): FreeAnswerRubric => ({
  criteria: FREE_ANSWER_CATALOG.map((c) => ({
    id: c.id,
    enabled: true,
    weight: c.defaultWeight,
    hint: "",
  })),
  pass_percent: 60,
  free_text: "",
});

export function freeAnswerRubricFromContent(content: Record<string, unknown> | undefined): FreeAnswerRubric {
  const raw = content?.rubric;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "criteria" in (raw as object)) {
    const r = raw as FreeAnswerRubric;
    return {
      criteria: r.criteria?.length ? r.criteria : defaultFreeAnswerRubric().criteria,
      pass_percent: Number(r.pass_percent) || 60,
      free_text: String(r.free_text || ""),
    };
  }
  if (typeof raw === "string" && raw.trim()) {
    const base = defaultFreeAnswerRubric();
    base.free_text = raw.trim();
    return base;
  }
  return defaultFreeAnswerRubric();
}

export function freeAnswerRubricToContent(rubric: FreeAnswerRubric): Record<string, unknown> {
  return {
    criteria: rubric.criteria.map((c) => ({
      id: c.id,
      enabled: c.enabled,
      weight: c.weight,
      hint: c.hint || "",
    })),
    pass_percent: rubric.pass_percent,
    free_text: rubric.free_text || "",
  };
}

