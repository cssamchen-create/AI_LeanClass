import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCourseResources, addResource, updateResource, deleteResource } from '@/lib/knowledge-base/service'

const mockPrisma = vi.hoisted(() => ({
  knowledgeBaseResource: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

describe('getCourseResources', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns resources ordered by order then createdAt', async () => {
    const resources = [
      { id: 'res-1', courseId: 'crs-1', title: '文件', type: 'LINK', content: 'https://a.com', order: 0 },
      { id: 'res-2', courseId: 'crs-1', title: '說明', type: 'TEXT', content: '重點...', order: 1 },
    ]
    mockPrisma.knowledgeBaseResource.findMany.mockResolvedValue(resources)

    const result = await getCourseResources('crs-1')

    expect(mockPrisma.knowledgeBaseResource.findMany).toHaveBeenCalledWith({
      where: { courseId: 'crs-1' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    expect(result).toHaveLength(2)
  })

  it('returns empty array when course has no resources', async () => {
    mockPrisma.knowledgeBaseResource.findMany.mockResolvedValue([])
    const result = await getCourseResources('crs-1')
    expect(result).toEqual([])
  })
})

describe('addResource', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a LINK resource', async () => {
    const created = { id: 'res-1', courseId: 'crs-1', title: '文件', type: 'LINK', content: 'https://a.com', order: 0 }
    mockPrisma.knowledgeBaseResource.create.mockResolvedValue(created)

    const result = await addResource('crs-1', { title: '文件', type: 'LINK', content: 'https://a.com', order: 0 })

    expect(mockPrisma.knowledgeBaseResource.create).toHaveBeenCalledWith({
      data: { courseId: 'crs-1', title: '文件', type: 'LINK', content: 'https://a.com', order: 0 },
    })
    expect(result.id).toBe('res-1')
  })

  it('creates a TEXT resource', async () => {
    const created = { id: 'res-2', courseId: 'crs-1', title: '摘要', type: 'TEXT', content: '重點...', order: 1 }
    mockPrisma.knowledgeBaseResource.create.mockResolvedValue(created)

    const result = await addResource('crs-1', { title: '摘要', type: 'TEXT', content: '重點...', order: 1 })

    expect(result.type).toBe('TEXT')
  })
})

describe('updateResource', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates the specified resource', async () => {
    const updated = { id: 'res-1', title: '新標題', type: 'LINK', content: 'https://b.com', order: 0 }
    mockPrisma.knowledgeBaseResource.update.mockResolvedValue(updated)

    const result = await updateResource('res-1', { title: '新標題' })

    expect(mockPrisma.knowledgeBaseResource.update).toHaveBeenCalledWith({
      where: { id: 'res-1' },
      data: { title: '新標題' },
    })
    expect(result.title).toBe('新標題')
  })
})

describe('deleteResource', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the specified resource', async () => {
    mockPrisma.knowledgeBaseResource.delete.mockResolvedValue({ id: 'res-1' })

    await deleteResource('res-1')

    expect(mockPrisma.knowledgeBaseResource.delete).toHaveBeenCalledWith({
      where: { id: 'res-1' },
    })
  })
})
