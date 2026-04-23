import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client-runtime-utils'

export async function updateTrainingRecord(employeeId: string, sessionId: string) {
  const session = await prisma.courseSession.findUnique({
    where: { id: sessionId },
    include: { course: true },
  })
  if (!session) throw new Error('梯次不存在')

  const course = session.course
  const year = session.startDate.getFullYear()

  const isHours = course.measurementUnit === 'HOURS'
  const isCredits = course.measurementUnit === 'CREDIT'
  const value = new Decimal(course.measurementValue)

  const existing = await prisma.employeeTrainingRecord.findUnique({
    where: { employeeId_year: { employeeId, year } },
  })

  const currentTotalHours = existing ? existing.totalHours : new Decimal(0)
  const currentAnnualHours = existing ? existing.annualHours : new Decimal(0)
  const currentTotalCredits = existing ? existing.totalCredits : new Decimal(0)

  const newTotalHours = isHours ? currentTotalHours.plus(value) : currentTotalHours
  const newAnnualHours =
    isHours && !course.isNewHireTraining
      ? currentAnnualHours.plus(value)
      : currentAnnualHours
  const newTotalCredits = isCredits ? currentTotalCredits.plus(value) : currentTotalCredits

  await prisma.employeeTrainingRecord.upsert({
    where: { employeeId_year: { employeeId, year } },
    update: {
      totalHours: newTotalHours,
      annualHours: newAnnualHours,
      totalCredits: newTotalCredits,
    },
    create: {
      employeeId,
      year,
      totalHours: newTotalHours,
      annualHours: newAnnualHours,
      totalCredits: newTotalCredits,
    },
  })

  return {
    year,
    hoursAdded: isHours ? value.toNumber() : 0,
    creditsAdded: isCredits ? value.toNumber() : 0,
    newAnnualHours: newAnnualHours.toNumber(),
  }
}
