import type { ZodType } from "zod";

export function validateSchema<T>(
  schema: ZodType<T>,
  data: unknown,
  setErrors: (errors: Record<string, string>) => void
): boolean {
  const result = schema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};

    result.error.issues.forEach((issue) => {
      const field = issue.path.join(".");

      if (field) {
        fieldErrors[field] = issue.message;
      }
    });
    console.log(fieldErrors)
    setErrors(fieldErrors);
    return false;
  }

  setErrors({});
  return true;
}