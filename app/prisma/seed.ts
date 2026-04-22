import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: '法治教育', countsTowardAnnualHours: true, defaultHours: null },
    { name: '經營管理', countsTowardAnnualHours: true, defaultHours: null },
    { name: '年度特訓', countsTowardAnnualHours: true, defaultHours: 12 },
    { name: '新人教育訓練', countsTowardAnnualHours: false, defaultHours: null },
    { name: '職能發展', countsTowardAnnualHours: true, defaultHours: null },
    { name: '安全衛生', countsTowardAnnualHours: true, defaultHours: null },
  ]

  for (const cat of categories) {
    await prisma.courseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }

  console.log('Seed completed: course categories inserted')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
