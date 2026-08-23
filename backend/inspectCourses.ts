import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  const courses = await prisma.course.findMany({
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: { orderBy: { order: 'asc' } },
        },
      },
    },
  });

  for (const c of courses) {
    console.log(`=== COURSE: ${c.title} (Slug: ${c.slug}) ===`);
    for (const m of c.modules) {
      console.log(`  Module: ${m.title}`);
      for (const l of m.lessons) {
        console.log(`    - Lesson: ${l.title}`);
      }
    }
  }
}

inspect()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
