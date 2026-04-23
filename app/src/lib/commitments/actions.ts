'use server'

import { signCommitment, resignEmployee } from './service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function signCommitmentAction(enrollmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.employeeId) throw new Error('未登入')
  return signCommitment(enrollmentId, session.user.employeeId)
}

export async function resignEmployeeAction(employeeId: string, resignedAt: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.employeeId) throw new Error('未登入')
  return resignEmployee(employeeId, resignedAt, session.user.employeeId)
}
