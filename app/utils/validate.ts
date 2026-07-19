import type { ZodType } from "zod";

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string> };

export function validate<T>(
  schema: ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { success: true, data: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, errors };
}
