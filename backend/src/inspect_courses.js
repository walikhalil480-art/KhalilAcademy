const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          enrollments: true,
          modules: true,
          certificates: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total courses in DB: ${courses.length}`);
  console.table(
    courses.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      price: c.price,
      status: c.status,
      enrollments: c._count.enrollments,
      modules: c._count.modules,
      certificates: c._count.certificates,
      createdAt: c.createdAt,
    }))
  );
}

main().finally(() => prisma.$disconnect());
