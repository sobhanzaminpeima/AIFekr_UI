export type PublicAssessmentQuestion = {
  type: string;
  question: string;
  options?: string[];
  items?: string[];
  left?: string[];
  right?: string[];
};
export function assessmentAnswers(
  questions: PublicAssessmentQuestion[],
  form: FormData,
) {
  return questions.map((q, i) => {
    const name = "q" + i,
      raw = form.get(name);
    if (q.type === "shortAnswer") {
      if (typeof raw !== "string" || !raw.trim())
        throw Error("ANSWER_ALL_QUESTIONS");
      return raw.trim();
    }
    if (q.type === "trueFalse") {
      if (raw !== "true" && raw !== "false")
        throw Error("ANSWER_ALL_QUESTIONS");
      return raw === "true";
    }
    if (q.type === "multipleChoice") {
      if (raw == null || raw === "") throw Error("ANSWER_ALL_QUESTIONS");
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n >= (q.options?.length ?? 0))
        throw Error("INVALID_ANSWER");
      return n;
    }
    const values =
      q.type === "multipleSelect"
        ? form.getAll(name).map(Number)
        : Array.from(
            { length: (q.type === "ordering" ? q.items : q.left)?.length ?? 0 },
            (_, j) => {
              const v = form.get(name + "_" + j);
              if (v == null || v === "") throw Error("ANSWER_ALL_QUESTIONS");
              return Number(v);
            },
          );
    const max =
      (q.type === "ordering"
        ? q.items
        : q.type === "matching"
          ? q.right
          : q.options
      )?.length ?? 0;
    if (
      !values.length ||
      new Set(values).size !== values.length ||
      values.some((v) => !Number.isInteger(v) || v < 0 || v >= max)
    )
      throw Error("INVALID_ANSWER");
    return values;
  });
}
