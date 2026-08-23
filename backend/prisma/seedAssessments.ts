import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Comprehensive 15-Question Final Course Assessments ---');

  const courses = await prisma.course.findMany({
    include: {
      modules: {
        orderBy: { order: 'asc' },
      },
      quizzes: true,
    },
  });

  console.log(`Found ${courses.length} courses in database.`);

  const devopsQuestions = [
    {
      questionText: '1. What is the primary difference between a Docker Container and a Virtual Machine (VM)?',
      points: 1,
      order: 1,
      options: [
        { optionText: 'Containers share the host OS kernel and are lightweight, while VMs run full guest operating systems on a hypervisor.', isCorrect: true, explanation: 'Containers virtualize at the operating system level, sharing the host kernel for near-instant boot and minimal resource overhead.' },
        { optionText: 'VMs do not require an operating system to run applications.', isCorrect: false },
        { optionText: 'Containers have larger disk footprints and slower boot times than VMs.', isCorrect: false },
        { optionText: 'VMs share the host kernel directly without hypervisor isolation.', isCorrect: false },
      ],
    },
    {
      questionText: '2. In Docker, which instruction is used to set the working directory for subsequent instructions like RUN, CMD, and COPY?',
      points: 1,
      order: 2,
      options: [
        { optionText: 'WORKDIR', isCorrect: true, explanation: 'WORKDIR sets the active working directory for any subsequent RUN, CMD, ENTRYPOINT, COPY, and ADD instructions.' },
        { optionText: 'CD', isCorrect: false },
        { optionText: 'SETDIR', isCorrect: false },
        { optionText: 'DIR', isCorrect: false },
      ],
    },
    {
      questionText: '3. Which Kubernetes component is responsible for maintaining the desired state of Pods across worker nodes and scheduling unassigned pods?',
      points: 1,
      order: 3,
      options: [
        { optionText: 'kube-scheduler & kube-controller-manager', isCorrect: true, explanation: 'The kube-scheduler assigns pods to nodes based on resource availability, while controller-manager runs controller loops to maintain desired state.' },
        { optionText: 'kubelet only', isCorrect: false },
        { optionText: 'kube-proxy only', isCorrect: false },
        { optionText: 'containerd runtime', isCorrect: false },
      ],
    },
    {
      questionText: '4. What is the purpose of a Multi-Stage Dockerfile build?',
      points: 1,
      order: 4,
      options: [
        { optionText: 'To separate build-time dependencies from the final lightweight production runtime image.', isCorrect: true, explanation: 'Multi-stage builds allow compiling code with heavy SDKs in stage 1, and copying only the compiled artifacts into a tiny scratch/alpine image in stage 2.' },
        { optionText: 'To run multiple containers simultaneously from a single Dockerfile.', isCorrect: false },
        { optionText: 'To bypass security scanning during CI pipeline execution.', isCorrect: false },
        { optionText: 'To automatically deploy containers to Amazon ECS.', isCorrect: false },
      ],
    },
    {
      questionText: '5. In Continuous Integration (CI), what is the best practice regarding commit frequency and automated testing?',
      points: 1,
      order: 5,
      options: [
        { optionText: 'Commit code changes frequently to main/feature branches and trigger automated unit, integration, and security tests on every commit.', isCorrect: true, explanation: 'CI advocates frequent small commits verified by automated build and test suites to catch bugs immediately.' },
        { optionText: 'Only run automated tests once a month before production releases.', isCorrect: false },
        { optionText: 'Merge code without automated tests to speed up feature delivery.', isCorrect: false },
        { optionText: 'Manually test code on developer workstations without automated pipelines.', isCorrect: false },
      ],
    },
    {
      questionText: '6. In Terraform Infrastructure as Code (IaC), what is stored in the `terraform.tfstate` file?',
      points: 1,
      order: 6,
      options: [
        { optionText: 'The current state of provisioned infrastructure resources and their mapped configuration attributes.', isCorrect: true, explanation: 'Terraform state records the exact real-world IDs and attributes of managed infrastructure to determine necessary delta changes.' },
        { optionText: 'The source code of the backend application.', isCorrect: false },
        { optionText: 'User passwords and SSH private keys in plaintext.', isCorrect: false },
        { optionText: 'Temporary log files generated during `terraform plan`.', isCorrect: false },
      ],
    },
    {
      questionText: '7. Which Kubernetes Service type exposes the service externally using a cloud provider\'s native Layer 4 load balancer?',
      points: 1,
      order: 7,
      options: [
        { optionText: 'LoadBalancer', isCorrect: true, explanation: 'Service type: LoadBalancer automatically provisions a cloud provider load balancer (e.g. AWS NLB/ALB) and routes traffic to NodePorts.' },
        { optionText: 'ClusterIP', isCorrect: false },
        { optionText: 'NodePort', isCorrect: false },
        { optionText: 'ExternalName', isCorrect: false },
      ],
    },
    {
      questionText: '8. What is the primary function of a reverse proxy like NGINX in microservices architecture?',
      points: 1,
      order: 8,
      options: [
        { optionText: 'To sit between clients and backend servers to handle load balancing, SSL termination, caching, and rate limiting.', isCorrect: true, explanation: 'Reverse proxies intercept incoming client requests and distribute them to upstream application instances securely.' },
        { optionText: 'To execute database SQL migrations directly on PostgreSQL.', isCorrect: false },
        { optionText: 'To compile frontend TypeScript code into JavaScript.', isCorrect: false },
        { optionText: 'To store Docker image layers permanently on disk.', isCorrect: false },
      ],
    },
    {
      questionText: '9. In Linux system administration, which command displays real-time system resource usage, including CPU, memory, and running processes?',
      points: 1,
      order: 9,
      options: [
        { optionText: 'top / htop', isCorrect: true, explanation: 'top and htop provide dynamic real-time monitoring of CPU usage, RAM utilization, load average, and active process threads.' },
        { optionText: 'ls -la', isCorrect: false },
        { optionText: 'cat /etc/passwd', isCorrect: false },
        { optionText: 'chmod +x', isCorrect: false },
      ],
    },
    {
      questionText: '10. Which AWS compute service automatically runs code in response to events (HTTP requests, S3 uploads, DynamoDB streams) without managing servers?',
      points: 1,
      order: 10,
      options: [
        { optionText: 'AWS Lambda', isCorrect: true, explanation: 'AWS Lambda is a serverless compute service that executes event-driven code functions with sub-second scaling.' },
        { optionText: 'Amazon EC2', isCorrect: false },
        { optionText: 'Amazon RDS', isCorrect: false },
        { optionText: 'Amazon EBS', isCorrect: false },
      ],
    },
    {
      questionText: '11. What is the purpose of Git Branching Strategies like GitHub Flow or Trunk-Based Development?',
      points: 1,
      order: 11,
      options: [
        { optionText: 'To enable collaborative development with short-lived feature branches, peer pull request reviews, and continuous integration into main.', isCorrect: true, explanation: 'Modern branching strategies prioritize small, tested pull requests integrated frequently to minimize merge conflicts.' },
        { optionText: 'To prevent developers from ever merging code to the main branch.', isCorrect: false },
        { optionText: 'To store production database backups in Git history.', isCorrect: false },
        { optionText: 'To replace automated unit testing.', isCorrect: false },
      ],
    },
    {
      questionText: '12. In PostgreSQL and relational databases, what is an ACID transaction designed to guarantee?',
      points: 1,
      order: 12,
      options: [
        { optionText: 'Atomicity, Consistency, Isolation, and Durability of database operations.', isCorrect: true, explanation: 'ACID guarantees that database transactions are processed reliably, completely succeeding or rolling back safely on errors.' },
        { optionText: 'Asynchronous Cloud Infrastructure Deployment.', isCorrect: false },
        { optionText: 'Automatic Compression of Indexed Data.', isCorrect: false },
        { optionText: 'Application Container Integration and Delivery.', isCorrect: false },
      ],
    },
    {
      questionText: '13. What is the purpose of an Ingress Controller in Kubernetes?',
      points: 1,
      order: 13,
      options: [
        { optionText: 'To manage external HTTP/HTTPS routing, host-based and path-based routing, and SSL termination into cluster services.', isCorrect: true, explanation: 'Ingress controllers act as Layer 7 routers directing external HTTP/S requests to internal cluster services.' },
        { optionText: 'To encrypt hard drive disks on physical worker nodes.', isCorrect: false },
        { optionText: 'To generate SSH key pairs for cluster administrators.', isCorrect: false },
        { optionText: 'To format Linux disk partitions.', isCorrect: false },
      ],
    },
    {
      questionText: '14. What is the fundamental principle of DevSecOps (Shift-Left Security)?',
      points: 1,
      order: 14,
      options: [
        { optionText: 'Integrating automated security checks, vulnerability scanning (SAST/DAST), and compliance policies early in the development lifecycle.', isCorrect: true, explanation: 'Shift-Left security embeds vulnerability scanning, secrets detection, and dependency checks into CI/CD pipelines.' },
        { optionText: 'Only testing security after software has been deployed to production for 6 months.', isCorrect: false },
        { optionText: 'Disabling all firewalls to increase network throughput.', isCorrect: false },
        { optionText: 'Storing secrets directly in plaintext in public Git repositories.', isCorrect: false },
      ],
    },
    {
      questionText: '15. When configuring AWS Virtual Private Cloud (VPC), how should database servers in a Private Subnet access outbound software updates securely without public IP addresses?',
      points: 1,
      order: 15,
      options: [
        { optionText: 'Via a NAT Gateway deployed in a Public Subnet with routes configured in the private route table.', isCorrect: true, explanation: 'A NAT Gateway enables outbound internet access for private subnet instances while blocking inbound connections from the public internet.' },
        { optionText: 'By attaching an Internet Gateway directly to the private subnet.', isCorrect: false },
        { optionText: 'By assigning public IPv4 addresses to all database instances.', isCorrect: false },
        { optionText: 'By disabling VPC route tables entirely.', isCorrect: false },
      ],
    },
  ];

  for (const course of courses) {
    const targetModule = course.modules[course.modules.length - 1] || course.modules[0];
    if (!targetModule) continue;

    console.log(`Configuring Final Assessment for course: ${course.title} (Module: ${targetModule.title})`);

    // Find existing final assessment or create new
    let finalQuiz = await prisma.quiz.findFirst({
      where: {
        courseId: course.id,
        isFinalAssessment: true,
      },
    });

    if (finalQuiz) {
      // Update parameters: 80% passing score, 40 minutes, 3 max attempts
      await prisma.quiz.update({
        where: { id: finalQuiz.id },
        data: {
          title: `${course.title} — Official Final Course Assessment & Certification Exam`,
          description: 'Comprehensive 15-Question Final Certification Assessment. You have 40 minutes to complete this exam with a minimum passing score of 80%. A maximum of 3 attempts are allowed. Passing this assessment is mandatory to unlock and issue your official Khalil Academy Certificate.',
          passingScore: 80.0,
          timeLimitMinutes: 40,
          maxAttempts: 3,
          isRequired: true,
          isFinalAssessment: true,
          moduleId: targetModule.id,
        },
      });

      // Clear old questions to replace with full 15 questions
      await prisma.quizQuestion.deleteMany({
        where: { quizId: finalQuiz.id },
      });
    } else {
      finalQuiz = await prisma.quiz.create({
        data: {
          title: `${course.title} — Official Final Course Assessment & Certification Exam`,
          description: 'Comprehensive 15-Question Final Certification Assessment. You have 40 minutes to complete this exam with a minimum passing score of 80%. A maximum of 3 attempts are allowed. Passing this assessment is mandatory to unlock and issue your official Khalil Academy Certificate.',
          passingScore: 80.0,
          timeLimitMinutes: 40,
          maxAttempts: 3,
          isRequired: true,
          isFinalAssessment: true,
          moduleId: targetModule.id,
          courseId: course.id,
        },
      });
    }

    // Insert 15 Questions
    for (const q of devopsQuestions) {
      await prisma.quizQuestion.create({
        data: {
          quizId: finalQuiz.id,
          questionText: q.questionText,
          points: q.points,
          order: q.order,
          options: {
            create: q.options.map((opt) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              explanation: opt.explanation || null,
            })),
          },
        },
      });
    }

    console.log(`✓ Attached 15 Comprehensive Multiple-Choice Questions to Final Assessment for ${course.title}.`);
  }

  console.log('--- All Courses Seeded with 15-Question 40-Minute 80% Threshold Final Assessments ---');
}

main()
  .catch((e) => {
    console.error('Error seeding assessments:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
