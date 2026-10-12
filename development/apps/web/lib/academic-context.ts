export function parseAcademicContext(input: {
  attemptId?: string | string[];
  period?: string | string[];
}): { valid: boolean; query: URLSearchParams } {
  const query = new URLSearchParams();
  if (
    (input.attemptId !== undefined &&
      (typeof input.attemptId !== "string" ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          input.attemptId,
        ))) ||
    (input.period !== undefined &&
      (typeof input.period !== "string" ||
        !input.period.trim() ||
        input.period.length > 64 ||
        /[\u0000-\u001f\u007f]/.test(input.period)))
  )
    return { valid: false, query };
  if (input.attemptId) query.set("attemptId", input.attemptId);
  if (input.period) query.set("period", input.period);
  return { valid: true, query };
}
export function academicHref(
  path: string,
  context: { attemptId?: string; period?: string },
): string {
  const parsed = parseAcademicContext(context);
  if (!parsed.valid) throw new Error("Invalid academic context");
  return `${path}${parsed.query.size ? `?${parsed.query}` : ""}`;
}
