# Khalil Academy LMS Platform

[![CI/CD DevSecOps Pipeline](https://github.com/khalilacademy/lms/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/khalilacademy/lms/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-blue.svg)](docker-compose.yml)
[![Kubernetes Ready](https://img.shields.io/badge/Kubernetes-EKS%20Ready-purple.svg)](k8s/)

**Khalil Academy** is an enterprise-grade, full-stack **Learning Management System (LMS)** designed specifically for high-impact technical education in **Cloud Computing, DevOps, DevSecOps, AWS, Kubernetes, Docker, Linux, and Software Engineering**.

---

## 🌟 Key Platform Features

### 🔐 1. Authentication & Security (RBAC)
- **Role-Based Access Control**: 4 granular roles (`SUPER_ADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT`).
- **Security Protections**: Dual JWT token rotation (Short-lived Access Token + HTTP-Only Refresh Cookie), password hashing with bcrypt, account lockouts after 5 failed login attempts (15-min lockout), email verification, and password reset.
- **Role Scoping**: Admins cannot modify or demote Super Admin accounts. Instructors can only edit their own courses.

### 📚 2. Course Hierarchy & Learning Engine
- Structured as: `Course → Modules → Lessons → Quizzes → Assignments`.
- Lesson types: Video, Text, PDF, and Link resources.
- Real-time progress engine tracking lesson completion percentage and last watched video position.

### 💳 3. Pluggable Payment & Webhook Verification
- Pluggable `IPaymentProvider` abstraction (Mock Gateway included, easily switchable to Stripe or regional providers via environment variables).
- Cryptographic HMAC Webhook verification (`/api/payments/webhook`).
- Backend-enforced paid enrollment: Paid courses are never unlocked via frontend confirmation alone.
- Coupon engine supporting percentage and fixed value discounts with minimum order thresholds and expiration dates.

### 📜 4. Automated Certificate Engine & Public Verification
- Automatic certificate issuance upon meeting configurable course completion criteria (All lessons completed + All quizzes passed + Assignments graded).
- Unique ID generation (e.g. `KHA-2026-000001`).
- Public verification endpoint (`/certificates/verify/:id` and `/certificates/:id`).
- Real-time PDF certificate rendering and download.
- Administrative revocation capability with public revocation badges.

### 📊 5. Instructor & Admin Dashboards
- **Instructor Studio**: Create courses, build modules/lessons/quizzes/assignments, monitor student enrollments, grade submitted assignments.
- **Admin Console**: Platform analytics (Revenue, Enrollments, Users, Certificates), user role management, account suspension/activation, password reset, and full Audit Log viewer.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit, Axios, Lucide Icons, Canvas-Confetti |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Zod, JWT, Bcrypt, PDFKit, Winston, Prom-Client |
| **Database** | PostgreSQL with 23 interconnected relational Prisma models |
| **DevOps** | Docker, Docker Compose, Nginx, Kubernetes Manifests (`k8s/`), Helm-ready, Prometheus `/metrics` |
| **DevSecOps** | GitHub Actions CI/CD, Trivy container vulnerability scanner, Dependabot security scanning |

---

## 📁 Repository Structure

```
KhalilAcademy/
├── backend/
│   ├── src/
│   │   ├── config/          # Env validation, DB, Logger
│   │   ├── controllers/     # API Endpoints logic
│   │   ├── middlewares/     # Auth, RBAC, Rate Limiters, Error Handling
│   │   ├── routes/          # Express REST Routers
│   │   ├── services/        # Business logic, Payments, Certs, Quizzes
│   │   ├── tests/           # Jest & Supertest API tests
│   │   └── utils/           # JWT, Hash, PDF, Metrics
│   ├── prisma/
│   │   ├── schema.prisma    # Complete database schema
│   │   └── seed.ts          # Database seed script
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, Footer, CourseCard, ProtectedRoute
│   │   ├── pages/           # Landing, Catalog, Detail, Dashboards, Quizzes, Certs
│   │   ├── services/        # Axios API client with token refresh
│   │   ├── store/           # Redux Toolkit slices
│   │   └── types/           # TypeScript model contracts
│   ├── Dockerfile
│   └── nginx.conf
├── k8s/                     # Kubernetes manifests (Deployments, Services, Ingress, HPA)
├── .github/workflows/       # GitHub Actions CI/CD & Security scan
├── docker-compose.yml       # Production/Development container orchestrator
└── README.md
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Docker & Docker Compose (Optional for container setup)

### 1. Local Installation

```bash
# 1. Clone repository
git clone https://github.com/khalilacademy/lms.git
cd lms

# 2. Setup & Seed Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npx prisma db seed

# Start backend dev server
npm run dev

# 3. Setup & Start Frontend (in a new terminal)
cd ../frontend
npm install
npm run dev
```

The application will be accessible at:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`
- **API Health Check**: `http://localhost:5000/health`
- **Prometheus Metrics**: `http://localhost:5000/metrics`

---

## 🔑 Default Seed Development Accounts

*(Password for all default seed accounts: `Password123!`)*

| Role | Email | Access Permissions |
|---|---|---|
| **SUPER_ADMIN** | `superadmin@khalilacademy.com` | Full platform control, manage admins, audit logs |
| **ADMIN** | `admin@khalilacademy.com` | User management, course review, payment review, cert revocation |
| **INSTRUCTOR** | `alex.cloud@khalilacademy.com` | Create courses, modules, quizzes, grade student submissions |
| **INSTRUCTOR** | `elena.sec@khalilacademy.com` | Security track course author |
| **STUDENT** | `john.student@example.com` | Enrolled student account for testing learning flow |

---

## 🐳 Docker Setup

Run the entire full-stack platform (PostgreSQL, Backend API, Frontend Nginx) with a single command:

```bash
docker compose up -d
```

Verify container health:
```bash
docker compose ps
```

---

## ☸️ Kubernetes & AWS EKS Readiness

Deploy to any standard Kubernetes cluster (Minikube / EKS / GKE):

```bash
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 🧪 Testing & Verification

Run automated backend API integration and unit tests:

```bash
cd backend
npm test
```

### End-to-End Verification Workflow
1. Log in as **Student** (`john.student@example.com` / `Password123!`).
2. Browse courses or checkout paid course using Coupon `WELCOME20`.
3. Simulate payment webhook success.
4. Access course player, watch lessons, mark completed.
5. Take the module quiz, verify immediate score & rationale feedback.
6. Submit assignment work.
7. Log in as **Instructor** (`alex.cloud@khalilacademy.com`), grade the student's submission.
8. Log back in as **Student**, verify 100% course completion and automatic certificate generation.
9. Verify certificate publicly via `/certificates/verify/KHA-2026-000001`.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
