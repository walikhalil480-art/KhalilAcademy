import { PrismaClient, Role, Level, CourseStatus, ContentType, VideoSource } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Upgraded Khalil Academy PostgreSQL Database ---');

  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const instructorPasswordHash = await bcrypt.hash('Instructor@12345', 10);
  const studentPasswordHash = await bcrypt.hash('Student@12345', 10);

  // 1. Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@khalilacademy.com' },
    update: { passwordHash: adminPasswordHash, role: Role.SUPER_ADMIN, status: 'ACTIVE', emailVerified: true },
    create: {
      email: 'admin@khalilacademy.com',
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      role: Role.SUPER_ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
      bio: 'Executive Founder',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'academy.admin@khalilacademy.com' },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN, status: 'ACTIVE', emailVerified: true },
    create: {
      email: 'academy.admin@khalilacademy.com',
      passwordHash: adminPasswordHash,
      name: 'Academy Admin',
      role: Role.ADMIN,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@khalilacademy.com' },
    update: { passwordHash: instructorPasswordHash, role: Role.INSTRUCTOR, status: 'ACTIVE', emailVerified: true },
    create: {
      email: 'instructor@khalilacademy.com',
      passwordHash: instructorPasswordHash,
      name: 'Khalil Instructor',
      role: Role.INSTRUCTOR,
      status: 'ACTIVE',
      emailVerified: true,
      bio: 'Principal Cloud & DevOps Architect with 12+ years experience.',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@khalilacademy.com' },
    update: { passwordHash: studentPasswordHash, role: Role.STUDENT, status: 'ACTIVE', emailVerified: true },
    create: {
      email: 'student@khalilacademy.com',
      passwordHash: studentPasswordHash,
      name: 'Test Student',
      role: Role.STUDENT,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  console.log('Seeded Users: SuperAdmin, Admin, Instructor, Student.');

  // 2. Categories
  const categoryNames = [
    { name: 'Cloud Computing', slug: 'cloud-computing', description: 'Core Cloud Platforms & Infrastructure' },
    { name: 'DevOps', slug: 'devops', description: 'Continuous Integration & Delivery Pipelines' },
    { name: 'DevSecOps', slug: 'devsecops', description: 'Pipeline Security Automation' },
    { name: 'AWS', slug: 'aws', description: 'Amazon Web Services Architecture' },
    { name: 'Kubernetes', slug: 'kubernetes', description: 'Container Orchestration' },
    { name: 'Docker', slug: 'docker', description: 'Containerization & Microservices' },
    { name: 'Linux', slug: 'linux', description: 'Enterprise Linux Systems' },
    { name: 'Programming', slug: 'programming', description: 'Modern Software Engineering' },
  ];

  const categoriesMap = new Map();
  for (const cat of categoryNames) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug, description: cat.description },
    });
    categoriesMap.set(cat.slug, created);
  }

  // 3. Coupons
  await prisma.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minPurchaseAmount: 5,
      maxUses: 500,
      isActive: true,
    },
  });

  // 4. Course 1: AWS Cloud Fundamentals
  const course1 = await prisma.course.upsert({
    where: { slug: 'aws-cloud-fundamentals' },
    update: { isFree: false, price: 15.00 },
    create: {
      title: 'AWS Cloud Fundamentals',
      slug: 'aws-cloud-fundamentals',
      description: 'A beginner-friendly introduction to cloud computing and Amazon Web Services.',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      instructorId: instructor.id,
      categoryId: categoriesMap.get('aws').id,
      level: Level.BEGINNER,
      isFree: false,
      price: 15.00,
      currency: 'USD',
      durationHours: 4.5,
      learningObjectives: [
        'Understand cloud computing fundamentals and AWS global infrastructure',
        'Configure IAM security policies and role-based access',
        'Deploy EC2 virtual servers, S3 buckets, and VPC networks',
      ],
      requirements: ['Basic computer knowledge.'],
      targetAudience: ['Beginners in cloud engineering, developers, and SysAdmins.'],
      status: CourseStatus.PUBLISHED,
    },
  });

  // Module 1: AWS Fundamentals
  const c1m1 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Module 1 — AWS Fundamentals',
      order: 1,
      lessons: {
        create: [
          {
            title: '1. Introduction to Cloud Computing',
            description: 'Overview of cloud models, scalability, and benefits.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'ulprqHHWlng',
            videoUrl: 'https://www.youtube.com/watch?v=ulprqHHWlng',
            durationMinutes: 15,
            order: 1,
            isPreview: true, // Free preview lesson
          },
          {
            title: '2. What is AWS?',
            description: 'Core Amazon Web Services platform introduction.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'rrB13utjYV4',
            videoUrl: 'https://www.youtube.com/watch?v=rrB13utjYV4',
            durationMinutes: 20,
            order: 2,
          },
          {
            title: '3. AWS Global Infrastructure',
            description: 'Global infrastructure footprint and data centers.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: '3hLmDS179YE',
            videoUrl: 'https://www.youtube.com/watch?v=3hLmDS179YE',
            durationMinutes: 18,
            order: 3,
          },
          {
            title: '4. AWS Regions and Availability Zones',
            description: 'Designing fault-tolerant multi-AZ architectures.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'rxa2i_Fm5yM',
            videoUrl: 'https://www.youtube.com/watch?v=rxa2i_Fm5yM',
            durationMinutes: 22,
            order: 4,
          },
          {
            title: '5. AWS Shared Responsibility Model',
            description: 'Security OF the cloud vs Security IN the cloud.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'Z4b3a4G7m4Y',
            videoUrl: 'https://www.youtube.com/watch?v=Z4b3a4G7m4Y',
            durationMinutes: 25,
            order: 5,
          },
        ],
      },
    },
  });

  // Module 2: AWS Core Services
  const c1m2 = await prisma.module.create({
    data: {
      courseId: course1.id,
      title: 'Module 2 — AWS Core Services',
      order: 2,
      lessons: {
        create: [
          {
            title: '1. Amazon EC2',
            description: 'Elastic compute cloud virtual servers.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'iBD-3g01J_k',
            videoUrl: 'https://www.youtube.com/watch?v=iBD-3g01J_k',
            durationMinutes: 25,
            order: 1,
          },
          {
            title: '2. Amazon S3',
            description: 'Simple storage service bucket configuration.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'v33f9T6c_90',
            videoUrl: 'https://www.youtube.com/watch?v=v33f9T6c_90',
            durationMinutes: 20,
            order: 2,
          },
          {
            title: '3. Amazon VPC',
            description: 'Virtual private cloud subnets and route tables.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'hiKXPv6Qh0s',
            videoUrl: 'https://www.youtube.com/watch?v=hiKXPv6Qh0s',
            durationMinutes: 30,
            order: 3,
          },
          {
            title: '4. AWS IAM',
            description: 'Identity and access policies and roles.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: '_r8u6QO0h94',
            videoUrl: 'https://www.youtube.com/watch?v=_r8u6QO0h94',
            durationMinutes: 25,
            order: 4,
          },
          {
            title: '5. AWS Lambda',
            description: 'Event-driven serverless functions.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'eOBq__hVUBE',
            videoUrl: 'https://www.youtube.com/watch?v=eOBq__hVUBE',
            durationMinutes: 20,
            order: 5,
          },
        ],
      },
    },
  });

  // Add Quiz & Assignment to Course 1
  await prisma.quiz.create({
    data: {
      title: 'AWS Cloud Fundamentals Knowledge Assessment',
      passingScore: 70,
      timeLimitMinutes: 20,
      maxAttempts: 3,
      moduleId: c1m1.id,
      courseId: course1.id,
      questions: {
        create: [
          {
            questionText: 'Which AWS service is designed for serverless execution?',
            points: 1,
            order: 1,
            options: {
              create: [
                { optionText: 'AWS Lambda', isCorrect: true, explanation: 'AWS Lambda runs serverless functions in response to events.' },
                { optionText: 'Amazon EC2', isCorrect: false },
                { optionText: 'Amazon RDS', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.assignment.create({
    data: {
      title: 'AWS VPC Architecture Assignment',
      instructions: 'Submit a text or PDF blueprint showing a VPC configuration with Public/Private subnets.',
      maxScore: 100,
      moduleId: c1m2.id,
      courseId: course1.id,
    },
  });

  // 5. Course 2: Docker & Kubernetes Fundamentals
  const course2 = await prisma.course.upsert({
    where: { slug: 'docker-kubernetes-fundamentals' },
    update: { isFree: false, price: 20.00 },
    create: {
      title: 'Docker & Kubernetes Fundamentals',
      slug: 'docker-kubernetes-fundamentals',
      description: 'Master containerization and container orchestration with Docker Compose, Networking, Pods, and Deployments.',
      thumbnail: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=800&q=80',
      instructorId: instructor.id,
      categoryId: categoriesMap.get('kubernetes').id,
      level: Level.INTERMEDIATE,
      isFree: false,
      price: 20.00,
      currency: 'USD',
      durationHours: 3.5,
      learningObjectives: [
        'Understand containerization vs virtual machines',
        'Build Docker images using multi-stage builds',
        'Orchestrate microservices with Docker Compose & Kubernetes',
      ],
      requirements: ['Basic Linux command line experience.'],
      targetAudience: ['DevOps Engineers, SysAdmins, and Developers.'],
      status: CourseStatus.PUBLISHED,
    },
  });

  const c2m1 = await prisma.module.create({
    data: {
      courseId: course2.id,
      title: 'Module 1 — Docker',
      order: 1,
      lessons: {
        create: [
          {
            title: '1. What is Docker?',
            description: 'Containers vs Virtual Machines explained.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'Gjnup-PuquQ',
            videoUrl: 'https://www.youtube.com/watch?v=Gjnup-PuquQ',
            durationMinutes: 15,
            order: 1,
            isPreview: true, // Free preview
          },
          {
            title: '2. Docker Images',
            description: 'Layers, Dockerfile instructions, and registry storage.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'i7ABlHngi1Q',
            videoUrl: 'https://www.youtube.com/watch?v=i7ABlHngi1Q',
            durationMinutes: 20,
            order: 2,
          },
          {
            title: '3. Docker Containers',
            description: 'Lifecycle management: run, stop, start, exec.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'fqMOX6JJhGo',
            videoUrl: 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
            durationMinutes: 18,
            order: 3,
          },
          {
            title: '4. Docker Compose',
            description: 'Defining multi-container applications via YAML.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'HG6yIjZapSA',
            videoUrl: 'https://www.youtube.com/watch?v=HG6yIjZapSA',
            durationMinutes: 25,
            order: 4,
          },
          {
            title: '5. Docker Networking',
            description: 'Bridge, host, overlay, and container port mapping.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'bKFMS5C4CG0',
            videoUrl: 'https://www.youtube.com/watch?v=bKFMS5C4CG0',
            durationMinutes: 22,
            order: 5,
          },
        ],
      },
    },
  });

  await prisma.quiz.create({
    data: {
      title: 'Docker Assessment Quiz',
      passingScore: 70,
      timeLimitMinutes: 15,
      maxAttempts: 3,
      moduleId: c2m1.id,
      courseId: course2.id,
      questions: {
        create: [
          {
            questionText: 'Which command constructs a Docker image from a Dockerfile?',
            points: 1,
            order: 1,
            options: {
              create: [
                { optionText: 'docker build', isCorrect: true, explanation: 'docker build compiles a container image.' },
                { optionText: 'docker run', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  });

  // 6. Course 3: DevOps CI/CD Fundamentals
  const course3 = await prisma.course.upsert({
    where: { slug: 'devops-cicd-fundamentals' },
    update: { isFree: true, price: 0.0 },
    create: {
      title: 'DevOps CI/CD Fundamentals',
      slug: 'devops-cicd-fundamentals',
      description: 'Master continuous integration and deployment pipelines using Git, GitHub Actions, and deployment automation.',
      thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
      instructorId: instructor.id,
      categoryId: categoriesMap.get('devops').id,
      level: Level.BEGINNER,
      isFree: true,
      price: 0.0,
      currency: 'USD',
      durationHours: 3.0,
      learningObjectives: [
        'Understand DevOps culture and continuous integration',
        'Version control workflows with Git & GitHub',
        'Build automated pipelines with GitHub Actions',
      ],
      requirements: ['Basic computer literacy.'],
      targetAudience: ['Beginners aspiring to become DevOps Engineers.'],
      status: CourseStatus.PUBLISHED,
    },
  });

  const c3m1 = await prisma.module.create({
    data: {
      courseId: course3.id,
      title: 'Module 1 — CI/CD',
      order: 1,
      lessons: {
        create: [
          {
            title: '1. Introduction to DevOps',
            description: 'DevOps methodology, automation, and continuous delivery.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'Xrgk023l4lI',
            videoUrl: 'https://www.youtube.com/watch?v=Xrgk023l4lI',
            durationMinutes: 15,
            order: 1,
            isPreview: true, // Free preview
          },
          {
            title: '2. Git and GitHub',
            description: 'Version control basics, branching, and pull requests.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'RGOj5yH7evE',
            videoUrl: 'https://www.youtube.com/watch?v=RGOj5yH7evE',
            durationMinutes: 20,
            order: 2,
          },
          {
            title: '3. CI/CD Concepts',
            description: 'Automated testing, build stages, and release pipelines.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: '42UP1f274y0',
            videoUrl: 'https://www.youtube.com/watch?v=42UP1f274y0',
            durationMinutes: 18,
            order: 3,
          },
          {
            title: '4. GitHub Actions',
            description: 'Writing workflow YAML files, triggers, and secrets.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'R8_veQiYBjU',
            videoUrl: 'https://www.youtube.com/watch?v=R8_veQiYBjU',
            durationMinutes: 25,
            order: 4,
          },
          {
            title: '5. Deployment Pipelines',
            description: 'Continuous deployment to cloud staging and production environments.',
            contentType: ContentType.VIDEO,
            videoSource: VideoSource.YOUTUBE,
            youtubeVideoId: 'scEDHsr3APg',
            videoUrl: 'https://www.youtube.com/watch?v=scEDHsr3APg',
            durationMinutes: 22,
            order: 5,
          },
        ],
      },
    },
  });

  await prisma.quiz.create({
    data: {
      title: 'DevOps CI/CD Quiz',
      passingScore: 80,
      timeLimitMinutes: 15,
      maxAttempts: 3,
      moduleId: c3m1.id,
      courseId: course3.id,
      questions: {
        create: [
          {
            questionText: 'What is the main goal of Continuous Integration (CI)?',
            points: 1,
            order: 1,
            options: {
              create: [
                { optionText: 'Automatically integrate and test code changes frequently', isCorrect: true, explanation: 'CI automates building and testing code on repository updates.' },
              ],
            },
          },
        ],
      },
    },
  });

  // 6. Seed Demo Certificate
  await prisma.certificate.upsert({
    where: { certificateNumber: 'KHA-AWS-2026-000001' },
    update: {},
    create: {
      certificateNumber: 'KHA-AWS-2026-000001',
      userId: student.id,
      courseId: course1.id,
      studentName: student.name,
      courseTitle: course1.title,
      instructorName: instructor.name,
      issueDate: new Date('2026-08-16'),
      isRevoked: false,
    },
  });

  console.log('--- Upgraded 3 Complete Demo Courses with 15 Video Lessons and Verified Certificate Seeded Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
