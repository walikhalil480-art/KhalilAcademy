import { prisma } from '../config/database';

async function updatePrices() {
  await prisma.course.updateMany({
    where: { slug: 'window-11-basic-s' },
    data: { price: 10.0, discountPrice: null, currency: 'KES', isFree: false },
  });

  await prisma.course.updateMany({
    where: { slug: 'linux-advanced-course' },
    data: { price: 20.0, discountPrice: null, currency: 'KES', isFree: false },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true, slug: true, price: true, currency: true, isFree: true },
  });

  console.log('Courses successfully updated in PostgreSQL:');
  for (const c of courses) {
    console.log(`  - "${c.title}" (${c.slug}): Price = ${c.price} KSH (${c.currency})`);
  }
}

updatePrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
