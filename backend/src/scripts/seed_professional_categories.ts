import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PROFESSIONAL_CATEGORIES = [
  // 1. Operating Systems
  {
    name: 'Windows Administration',
    slug: 'windows-administration',
    description: 'Windows 10/11, Windows Server, Active Directory & PowerShell automation',
    icon: 'Monitor',
  },
  {
    name: 'Linux Administration',
    slug: 'linux-administration',
    description: 'Enterprise Linux (RHEL, Ubuntu, Debian), Bash scripting & system administration',
    icon: 'Terminal',
  },

  // 2. DevOps & Infrastructure as Code
  {
    name: 'DevOps Engineering',
    slug: 'devops',
    description: 'CI/CD pipelines, automated testing, deployment strategies & monitoring',
    icon: 'GitBranch',
  },
  {
    name: 'Terraform & IaC',
    slug: 'terraform-iac',
    description: 'HashiCorp Terraform, declarative infrastructure & multi-cloud provisioning',
    icon: 'Cpu',
  },
  {
    name: 'Docker & Containers',
    slug: 'docker-containers',
    description: 'Dockerfiles, containerization, microservices & multi-stage builds',
    icon: 'Box',
  },
  {
    name: 'Kubernetes & Cloud Native',
    slug: 'kubernetes',
    description: 'Container orchestration, Pods, Deployments, Services, Helm & ingress controllers',
    icon: 'Layers',
  },
  {
    name: 'Git & Version Control',
    slug: 'git-version-control',
    description: 'Git workflows, branching models, GitHub, GitLab & team collaboration',
    icon: 'GitPullRequest',
  },

  // 3. Cloud Computing
  {
    name: 'Cloud Computing',
    slug: 'cloud-computing',
    description: 'Core cloud architecture, virtualization, serverless & cloud strategy',
    icon: 'Cloud',
  },
  {
    name: 'Amazon Web Services (AWS)',
    slug: 'aws',
    description: 'AWS Solutions Architect, EC2, S3, Lambda, IAM, VPC & CloudFormation',
    icon: 'CloudRain',
  },
  {
    name: 'Microsoft Azure',
    slug: 'azure',
    description: 'Azure Administrator, Azure VMs, Entra ID, Virtual Networks & Blob Storage',
    icon: 'CloudLightning',
  },
  {
    name: 'Google Cloud Platform (GCP)',
    slug: 'google-cloud',
    description: 'GCP Compute Engine, GKE, BigQuery, Cloud IAM & Anthos',
    icon: 'CloudSun',
  },

  // 4. Programming & Software Development
  {
    name: 'Programming & Software Engineering',
    slug: 'programming',
    description: 'Algorithms, data structures, object-oriented design & software architecture',
    icon: 'Code',
  },
  {
    name: 'Web Development & Full Stack',
    slug: 'web-development',
    description: 'Modern web applications, React, Node.js, Next.js, Tailwind CSS & APIs',
    icon: 'Globe',
  },
  {
    name: 'Python Development',
    slug: 'python-development',
    description: 'Python 3, scripting, backend APIs (FastAPI/Django) & automation',
    icon: 'FileCode',
  },
  {
    name: 'JavaScript & TypeScript',
    slug: 'javascript-typescript',
    description: 'Modern TypeScript, asynchronous architecture, Node.js & runtime mastery',
    icon: 'FileText',
  },
  {
    name: 'Databases & SQL',
    slug: 'databases-sql',
    description: 'PostgreSQL, MySQL, Redis, MongoDB, schema design & query optimization',
    icon: 'Database',
  },

  // 5. Cybersecurity & Networking
  {
    name: 'Cybersecurity & Ethical Hacking',
    slug: 'cybersecurity',
    description: 'Network defense, ethical hacking, vulnerability assessments & security policies',
    icon: 'ShieldCheck',
  },
  {
    name: 'Network Engineering',
    slug: 'networking',
    description: 'TCP/IP, routing, switching, DNS, VPNs, subnets & network troubleshooting',
    icon: 'Radio',
  },
  {
    name: 'DevSecOps & Security Automation',
    slug: 'devsecops',
    description: 'Pipeline security scanning, SAST/DAST, secrets management & compliance',
    icon: 'Lock',
  },

  // 6. Artificial Intelligence & Data
  {
    name: 'Artificial Intelligence & Machine Learning',
    slug: 'artificial-intelligence',
    description: 'Generative AI, Large Language Models, prompt engineering & machine learning',
    icon: 'Sparkles',
  },

  // 7. Productivity & Office
  {
    name: 'Microsoft Office & Productivity',
    slug: 'microsoft-office',
    description: 'Microsoft Word, Excel, PowerPoint, Outlook & workplace productivity tools',
    icon: 'BookOpen',
  },
];

async function main() {
  console.log('=== Cleaning Up Junk / Test Categories & Seeding Professional Catalog ===');

  // 1. Find or create a default category for reassigning orphaned courses if needed
  let defaultCategory = await prisma.category.findUnique({ where: { slug: 'cloud-computing' } });
  if (!defaultCategory) {
    defaultCategory = await prisma.category.create({
      data: {
        name: 'Cloud Computing',
        slug: 'cloud-computing',
        description: 'Core Cloud Platforms & Infrastructure',
        icon: 'Cloud',
      },
    });
  }

  // 2. Identify all junk / timestamped categories
  const allCategories = await prisma.category.findMany({
    include: { _count: { select: { courses: true } } },
  });

  const junkCategories = allCategories.filter((cat) => {
    return /\d{10,}/.test(cat.name) || /\d{10,}/.test(cat.slug);
  });

  console.log(`Found ${junkCategories.length} timestamped / junk test categories.`);

  for (const junk of junkCategories) {
    if (junk._count.courses > 0) {
      await prisma.course.updateMany({
        where: { categoryId: junk.id },
        data: { categoryId: defaultCategory.id },
      });
      console.log(`Reassigned courses from junk category "${junk.name}" to "${defaultCategory.name}".`);
    }
    await prisma.category.delete({ where: { id: junk.id } });
    console.log(`Deleted junk category: "${junk.name}"`);
  }

  // 3. Upsert all professional categories
  console.log('\nUpserting Professional Categories...');
  for (const cat of PROFESSIONAL_CATEGORIES) {
    const upserted = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
      },
    });
    console.log(`✓ [${upserted.slug}] -> ${upserted.name}`);
  }

  // 4. Update specific courses to appropriate clean categories
  const linuxCat = await prisma.category.findUnique({ where: { slug: 'linux-administration' } });
  const windowsCat = await prisma.category.findUnique({ where: { slug: 'windows-administration' } });
  const officeCat = await prisma.category.findUnique({ where: { slug: 'microsoft-office' } });

  if (windowsCat) {
    await prisma.course.updateMany({
      where: { title: { contains: 'Window', mode: 'insensitive' } },
      data: { categoryId: windowsCat.id },
    });
  }

  if (officeCat) {
    await prisma.course.updateMany({
      where: {
        OR: [
          { title: { contains: 'PowerPoint', mode: 'insensitive' } },
          { title: { contains: 'Word', mode: 'insensitive' } },
          { title: { contains: 'Excel', mode: 'insensitive' } },
        ],
      },
      data: { categoryId: officeCat.id },
    });
  }

  if (linuxCat) {
    await prisma.course.updateMany({
      where: { title: { contains: 'Linux', mode: 'insensitive' } },
      data: { categoryId: linuxCat.id },
    });
  }

  const finalCategories = await prisma.category.findMany({
    include: { _count: { select: { courses: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`\n=== Seeding Complete. Total Clean Professional Categories: ${finalCategories.length} ===`);
}

main()
  .catch((e) => {
    console.error('Error seeding professional categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
