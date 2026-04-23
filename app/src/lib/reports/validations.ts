import { z } from 'zod'

const currentYear = new Date().getFullYear()

export const yearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(currentYear + 1).default(currentYear),
})

export const employeeSearchSchema = z.object({
  search: z.string().optional(),
  employeeId: z.string().optional(),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
})

export type YearInput = z.infer<typeof yearSchema>
export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
