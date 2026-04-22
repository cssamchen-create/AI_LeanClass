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

  // 測試員工資料
  const manager = await prisma.employee.upsert({
    where: { adAccount: 'manager01' },
    update: {},
    create: {
      name: '張主管',
      email: 'manager01@company.com',
      adAccount: 'manager01',
      department: '業務部',
      unit: '業務一組',
      role: 'MANAGER',
      hireDate: new Date('2020-01-01'),
    },
  })

  await prisma.employee.upsert({
    where: { adAccount: 'employee01' },
    update: {},
    create: {
      name: '陳員工',
      email: 'employee01@company.com',
      adAccount: 'employee01',
      department: '業務部',
      unit: '業務一組',
      role: 'EMPLOYEE',
      managerId: manager.id,
      hireDate: new Date('2022-06-01'),
    },
  })

  await prisma.employee.upsert({
    where: { adAccount: 'hr01' },
    update: {},
    create: {
      name: '李人資',
      email: 'hr01@company.com',
      adAccount: 'hr01',
      department: '人力資源部',
      unit: '教育訓練組',
      role: 'HR',
      hireDate: new Date('2019-03-01'),
    },
  })

  console.log('Seed completed: test employees inserted')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
