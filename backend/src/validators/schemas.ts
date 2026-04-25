import { z } from 'zod';

// --------- Auth ---------

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128)
    .regex(/\d/, 'Password must contain a digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol'),
  fullName: z.string().min(2).max(100),
  role: z.enum(['CANDIDATE', 'RECRUITER']).default('CANDIDATE'),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

// --------- Jobs ---------

export const createJobSchema = z.object({
  title: z.string().min(2).max(200),
  company: z.string().min(1).max(200),
  description: z.string().min(50).max(20000),
  requiredSkills: z.array(z.string().min(1).max(60)).min(1).max(50),
  minYears: z.number().int().min(0).max(50).default(0),
  location: z.string().max(200).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'DRAFT']).default('OPEN'),
});

export const updateJobSchema = createJobSchema.partial();

// --------- Matching ---------

export const runMatchSchema = z.object({
  cvId: z.string().cuid().optional(),
  jobId: z.string().cuid().optional(),
  topK: z.number().int().min(1).max(50).default(10),
}).refine((d) => !!(d.cvId || d.jobId), {
  message: 'Either cvId or jobId must be provided',
});

// --------- Types ---------

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type RunMatchInput = z.infer<typeof runMatchSchema>;
