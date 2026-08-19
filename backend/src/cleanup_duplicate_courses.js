const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('Cleaning up temporary duplicate test courses...');

  // Identify duplicate test course IDs to remove
  const testCourseSlugs = [
    'internal-uncertificated-seminar-msya1177',
    'docker-kubernetes-fundamentals-msya109h',
    'internal-uncertificated-seminar-msy9rt1i',
    'docker-kubernetes-fundamentals-msy9rsfe',
    'docker-kubernetes-fundamentals-msy9qw86',
    'docker-kubernetes-fundamentals-msy9p16i',
  ];

  const coursesToDelete = await prisma.course.findMany({
    where: {
      OR: [
        { slug: { in: testCourseSlugs } },
        { title: { contains: 'Test Temp' } },
        { title: { contains: 'Paystack Architecture' } },
      ],
    },
    select: { id: true, title: true, slug: true },
  });

  console.log(`Found ${coursesToDelete.length} duplicate test courses to delete:`);
  for (const c of coursesToDelete) {
    console.log(` - Deleting: ${c.title} (${c.slug} | ID: ${c.id})`);
    
    // Cascading deletion of dependent entities
    await prisma.certificate.deleteMany({ where: { courseId: c.id } });
    await prisma.review.deleteMany({ where: { courseId: c.id } });
    await prisma.lessonProgress.deleteMany({ where: { lesson: { module: { courseId: c.id } } } });
    await prisma.lesson.deleteMany({ where: { module: { courseId: c.id } } });
    await prisma.module.deleteMany({ where: { courseId: c.id } });
    await prisma.enrollment.deleteMany({ where: { courseId: c.id } });
    await prisma.order.deleteMany({ where: { courseId: c.id } });
    await prisma.course.delete({ where: { id: c.id } });
  }

  // Delete test users created during test runs if any
  await prisma.user.deleteMany({
    where: { email: { contains: 'cert_student_' } },
  });

  console.log('✓ Duplicate test courses & orphan test data cleaned up successfully!');
}

cleanupDuplicates()
  .catch((err) => console.error('Error during cleanup:', err))
  .finally(() => prisma.$disconnect());
