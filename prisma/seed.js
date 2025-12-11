import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: 'cat-restaurant' },
      update: {},
      create: {
        id: 'cat-restaurant',
        name: 'Restaurants',
        description: 'Dining establishments',
        icon: '🍽️',
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-retail' },
      update: {},
      create: {
        id: 'cat-retail',
        name: 'Retail',
        description: 'Retail stores and shops',
        icon: '🛍️',
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-services' },
      update: {},
      create: {
        id: 'cat-services',
        name: 'Services',
        description: 'Professional services',
        icon: '🔧',
      },
    }),
    prisma.category.upsert({
      where: { id: 'cat-healthcare' },
      update: {},
      create: {
        id: 'cat-healthcare',
        name: 'Healthcare',
        description: 'Healthcare providers',
        icon: '🏥',
      },
    }),
  ])

  console.log('Created categories:', categories.length)

  // Create admin user (password: admin123 - CHANGE THIS IN PRODUCTION!)
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@jocobusiness.com',
      password: hashedPassword,
      role: 'admin',
    },
  })

  console.log('Created admin user:', admin.username)
  console.log('⚠️  WARNING: Default admin password is "admin123" - CHANGE THIS IN PRODUCTION!')

  // Create sample businesses
  const sampleBusinesses = [
    {
      name: 'Smithfield BBQ',
      description: 'Authentic North Carolina barbecue restaurant',
      address: '123 Main Street',
      city: 'Smithfield',
      state: 'NC',
      zip: '27577',
      phone: '(919) 555-0100',
      email: 'info@smithfieldbbq.com',
      website: 'https://smithfieldbbq.com',
      categoryId: 'cat-restaurant',
      latitude: 35.5073,
      longitude: -78.3394,
    },
    {
      name: 'Johnston County Hardware',
      description: 'Full-service hardware store',
      address: '456 Commerce Drive',
      city: 'Smithfield',
      state: 'NC',
      zip: '27577',
      phone: '(919) 555-0200',
      email: 'info@jchardware.com',
      categoryId: 'cat-retail',
      latitude: 35.5100,
      longitude: -78.3400,
    },
  ]

  for (const business of sampleBusinesses) {
    const existing = await prisma.business.findFirst({
      where: { name: business.name },
    })
    if (!existing) {
      await prisma.business.create({
        data: business,
      })
    }
  }

  console.log('Created sample businesses:', sampleBusinesses.length)
  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

