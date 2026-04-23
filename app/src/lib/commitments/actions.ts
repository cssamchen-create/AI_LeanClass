'use server'

import { signCommitment, resignEmployee } from './service'
import { auth } from '@/auth'

export async function signCommitmentAction(enrollmentId: string) {
  const session = await auth()
  const employeeId = (session?.user as { id?: string })?.id
  if (!employeeId) throw new Error('未登入')
  return signCommitment(enrollmentId, employeeId)
}

export async function resignEmployeeAction(employeeId: string, resignedAt: string) {
  const session = await auth()
  const actorId = (session?.user as { id?: string })?.id
  if (!actorId) throw new Error('未登入')
  return resignEmployee(employeeId, resignedAt, actorId)
}
