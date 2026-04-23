import { prisma } from '@/lib/prisma'
import type { CreateResourceInput, UpdateResourceInput } from './validations'

export async function getCourseResources(courseId: string) {
  return prisma.knowledgeBaseResource.findMany({
    where: { courseId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function addResource(courseId: string, data: CreateResourceInput) {
  return prisma.knowledgeBaseResource.create({
    data: { courseId, ...data },
  })
}

export async function updateResource(resourceId: string, data: UpdateResourceInput) {
  return prisma.knowledgeBaseResource.update({
    where: { id: resourceId },
    data,
  })
}

export async function deleteResource(resourceId: string) {
  return prisma.knowledgeBaseResource.delete({
    where: { id: resourceId },
  })
}
