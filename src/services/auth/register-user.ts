import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().max(80).optional(),
});

export type RegisterEmailUserInput = z.infer<typeof registerSchema>;

export function parseRegisterEmailUser(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError({
      message: "Enter a valid email and a password with at least 8 characters.",
      code: "VALIDATION_ERROR",
      status: 400,
      expose: true,
    });
  }
  return parsed.data;
}
