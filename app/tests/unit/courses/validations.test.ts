import { describe, it, expect } from 'vitest'
import { createCourseSchema } from '@/lib/courses/validations'

describe('createCourseSchema', () => {
  it('should pass with valid data', () => {
    const result = createCourseSchema.safeParse({
      name: '法治教育課程',
      categoryId: 'uuid-1234',
      measurementUnit: 'HOURS',
      measurementValue: 3,
      requiresReflection: true,
      isGroupCourse: false,
    })
    expect(result.success).toBe(true)
  })

  it('should fail when name is empty', () => {
    const result = createCourseSchema.safeParse({
      name: '',
      categoryId: 'uuid-1234',
      measurementUnit: 'HOURS',
      measurementValue: 3,
    })
    expect(result.success).toBe(false)
  })

  it('should fail when categoryId is missing', () => {
    const result = createCourseSchema.safeParse({
      name: '測試課程',
      measurementUnit: 'HOURS',
      measurementValue: 3,
    })
    expect(result.success).toBe(false)
  })

  it('should fail when measurementValue is not positive', () => {
    const result = createCourseSchema.safeParse({
      name: '測試課程',
      categoryId: 'uuid-1234',
      measurementUnit: 'HOURS',
      measurementValue: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should fail with invalid measurementUnit', () => {
    const result = createCourseSchema.safeParse({
      name: '測試課程',
      categoryId: 'uuid-1234',
      measurementUnit: 'INVALID',
      measurementValue: 3,
    })
    expect(result.success).toBe(false)
  })
})
