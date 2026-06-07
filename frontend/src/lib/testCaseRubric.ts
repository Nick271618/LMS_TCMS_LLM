export type RubricCriterionId =
  | "tz_alignment"
  | "structure"
  | "steps_quality"
  | "expected_result"
  | "preconditions";

export type RubricCriterion = {
  id: RubricCriterionId;
  enabled: boolean;
  weight: number;
  hint: string;
};

export type StepRubric = {
  criteria: RubricCriterion[];
  pass_percent: number;
  free_text: string;
};

export type ReferenceTestCase = {
  title?: string;
  preconditions?: string;
  execution_steps?: string;
  expected_result?: string;
};

export type LlmCriterionResult = {
  id: string;
  percent: number;
  comment: string;
};

export type LlmGrade = {
  total_percent: number;
  criteria: LlmCriterionResult[];
  summary: string;
  recommendations: string[];
  awarded_points?: number;
  band_min_percent?: number | null;
};

export const CRITERION_CATALOG: { id: RubricCriterionId; defaultWeight: number }[] = [
  { id: "tz_alignment", defaultWeight: 30 },
  { id: "structure", defaultWeight: 20 },
  { id: "steps_quality", defaultWeight: 25 },
  { id: "expected_result", defaultWeight: 15 },
  { id: "preconditions", defaultWeight: 10 },
];

export const defaultRubric = (): StepRubric => ({
  criteria: CRITERION_CATALOG.map((c) => ({
    id: c.id,
    enabled: true,
    weight: c.defaultWeight,
    hint: "",
  })),
  pass_percent: 60,
  free_text: "",
});

export function rubricFromContent(content: Record<string, unknown> | undefined): StepRubric {
  const raw = content?.rubric;
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "criteria" in (raw as object)) {
    const r = raw as StepRubric;
    return {
      criteria: r.criteria?.length ? r.criteria : defaultRubric().criteria,
      pass_percent: Number(r.pass_percent) || 60,
      free_text: String(r.free_text || ""),
    };
  }
  if (typeof raw === "string" && raw.trim()) {
    const base = defaultRubric();
    base.free_text = raw.trim();
    return base;
  }
  return defaultRubric();
}

export function rubricToContent(rubric: StepRubric): Record<string, unknown> {
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
