import { prisma } from '../config/database';

async function updateCoursePrices() {
  console.log('Updating course prices in PostgreSQL...');

  // 1. Update Window 11 Basic's -> 1000 KSH
  const winCourse = await prisma.course.updateMany({
    where: { slug: 'window-11-basic-s' },
    data: {
      price: 1000.0,
      discountPrice: null,
      currency: 'KES',
      isFree: false,
    },
  });

  // 2. Update Linux Advanced Course -> 3000 KSH
  const linuxCourse = await prisma.course.updateMany({
    where: { slug: 'linux-advanced-course' },
    data: {
      price: 3000.0,
      discountPrice: null,
      currency: 'KES',
      isFree: false,
    },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, slug: true, price: true, currency: true, isFree: true },
    orderBy: { createdAt: 'desc' },
  });

  console.log('\n--- VERIFIED COURSES IN DATABASE ---');
  for (const c of courses) {
    console.log(`- "${c.title}" (${c.slug}) -> Price: ${c.price.toLocaleString()} ${c.currency} (Free: ${c.isFree})`);
  }
}

updateCoursePrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
