# OnestaffOS - Comprehensive HR Management System

A full-stack Human Resources Management System built with modern web technologies, featuring employee management, recruitment, payroll, time tracking, performance reviews, and organizational structure management.

## 🖥️ Desktop Application

**NEW!** OneStaff OS is now available as a desktop application powered by Electron!

- ✅ **Native desktop experience** for macOS, Windows, and Linux
- ✅ **Automatic service management** - Backend, Frontend, and Chatbot start automatically
- ✅ **Production-ready** with built-in health checks and crash recovery
- ✅ **Secure architecture** following Electron best practices

**Quick Start:**
```bash
npm install
npm run build:all
npm run dev
```

📖 **Full Documentation:** See [README-ELECTRON.md](README-ELECTRON.md) | [QUICKSTART.md](QUICKSTART.md) | [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🌟 Features

### Core Modules

- **👤 Employee Profile Management**
  - Comprehensive employee profiles with personal, employment, and emergency contact information
  - Team member views with privacy controls for managers
  - Employee self-service portal for profile updates
  - Change request workflow for profile modifications

- **📋 Recruitment & Hiring**
  - Job requisition creation and approval workflow
  - Candidate application tracking system
  - Interview scheduling and feedback management
  - Offer letter generation and digital signing
  - Multi-stage recruitment pipeline

- **💰 Payroll Management**
  - Configurable salary components and deductions
  - Automated payroll execution with approval workflows
  - Employee payslip generation and access
  - Payroll dispute management
  - Integration with time management for accurate calculations

- **⏰ Time & Attendance**
  - Digital clock-in/clock-out with kiosk mode
  - Shift management and assignments
  - Attendance tracking and reporting
  - Overtime and lateness detection
  - Automatic payroll synchronization

- **🏖️ Leave Management**
  - Multiple leave types configuration
  - Leave balance tracking
  - Multi-level approval workflows
  - Leave request history and calendar views

- **📊 Performance Management**
  - Performance review cycles
  - Appraisal templates and evaluations
  - Goal setting and tracking
  - 360-degree feedback support

- **🏢 Organization Structure**
  - Department and position management
  - Hierarchical reporting structure
  - Position assignment tracking
  - Change request workflows

- **🔔 Notifications & Alerts**
  - Real-time system notifications
  - Email notifications for critical events
  - Role-based notification routing
  - Notification history tracking

### Security Features

- **🔐 Authentication & Authorization**
  - JWT-based authentication with httpOnly cookies
  - Multi-factor authentication (MFA) with WebAuthn/Passkeys
  - Role-based access control (RBAC)
  - Session management and automatic token refresh

- **🛡️ Security Hardening**
  - Helmet.js for security headers
  - CSRF protection
  - Rate limiting to prevent abuse
  - HTTP Parameter Pollution (HPP) protection
  - XSS prevention with input sanitization
  - SSRF protection for external requests
  - Secure cookie configuration
  - Password strength validation
  - File upload validation and virus scanning

## 🚀 Technology Stack

### Frontend

- **Framework**: Next.js 16.0.7 with App Router
- **React**: 19.2.0
- **TypeScript**: 5.x
- **Styling**: CSS Modules
- **HTTP Client**: Axios with interceptors
- **Authentication**: WebAuthn/SimpleWebAuthn
- **Form Handling**: React Hooks
- **Build Tool**: Turbopack

### Backend

- **Framework**: NestJS 11.x
- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (@nestjs/jwt)
- **Validation**: class-validator, class-transformer
- **Security**: Helmet, CSRF, bcrypt, HPP
- **File Handling**: Multer
- **Task Scheduling**: @nestjs/schedule
- **PDF Generation**: PDFKit

## 📋 Prerequisites

- Node.js 20.x or higher
- MongoDB 7.x or higher
- npm or yarn package manager
- Git

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/OneStaffOS/OnestaffOS.git
cd OnestaffOS
```

### 2. Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local file
nano .env.local
```

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `Backend` directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/onestaff

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=1d

# Server Configuration
PORT=3000
NODE_ENV=development

# Security
COOKIE_SECRET=your-super-secure-cookie-secret-key

# WebAuthn (Passkeys) Configuration
WEBAUTHN_RP_NAME=OneStaff OS
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3001

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=90
BACKUP_PATH=/path/to/backups

# Payroll Integration
PAYROLL_SYNC_URL=
PAYROLL_SYNC_HOUR=2
PAYROLL_ESCALATION_HOUR=23
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## 🏃‍♂️ Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd Backend
npm run start:dev
```

The backend API will be available at `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3001`

### Production Mode

**Backend:**
```bash
cd Backend
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## 📚 API Documentation

Once the backend is running, access the interactive API documentation at:

**Swagger UI**: `http://localhost:3000/api/docs`

The Swagger documentation provides:
- Complete API endpoint listing
- Request/response schemas
- Authentication requirements
- Interactive API testing
- Example requests and responses

## 🧪 Testing

### Backend Tests

```bash
cd Backend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend E2E Tests

```bash
cd frontend

# Install Playwright (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/smoke-test.spec.ts
```

## 🏗️ Project Structure

```
OnestaffOS/
├── Backend/
│   ├── src/
│   │   ├── auth/              # Authentication & authorization
│   │   ├── employee-profile/  # Employee management
│   │   ├── recruitment/       # Hiring workflows
│   │   ├── payroll-*/        # Payroll modules
│   │   ├── time-management/  # Time & attendance
│   │   ├── leaves/           # Leave management
│   │   ├── performance/      # Performance reviews
│   │   ├── organization-structure/ # Org hierarchy
│   │   ├── notifications/    # Notification system
│   │   ├── passkeys/         # WebAuthn/MFA
│   │   └── main.ts          # Application entry point
│   ├── uploads/             # File uploads directory
│   └── test/               # Test files
│
├── frontend/
│   ├── app/
│   │   ├── components/      # Reusable components
│   │   ├── context/        # React context providers
│   │   ├── dashboard/      # Dashboard views
│   │   ├── login/          # Authentication pages
│   │   ├── profile/        # Profile management
│   │   ├── job-offers/     # Public job board
│   │   └── ...            # Other feature modules
│   ├── lib/
│   │   ├── axios-config.ts # API client configuration
│   │   ├── roles.ts        # Role definitions
│   │   ├── safe-array.ts   # Array utility functions
│   │   └── types/         # TypeScript type definitions
│   ├── e2e/               # Playwright E2E tests
│   └── public/            # Static assets
│
└── README.md              # This file
```

## 👥 User Roles

The system supports the following roles with different access levels:

- **System Admin**: Full system access and configuration
- **HR Manager**: Complete HR operations management
- **HR Admin**: HR administrative tasks
- **Payroll Manager**: Payroll processing and configuration
- **Department Head**: Department-specific management
- **Manager**: Team management capabilities
- **Employee**: Self-service access

## 🔒 Security Considerations

### Production Deployment Checklist

- [ ] Change all default secrets in `.env` files
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS certificates
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure rate limiting thresholds
- [ ] Enable audit logging
- [ ] Set up monitoring and alerting
- [ ] Review and update CSP headers
- [ ] Implement proper session management
- [ ] Enable security headers (HSTS, etc.)

## 🐛 Known Issues

- E2E tests for authenticated routes require valid credentials
- File uploads limited to 10MB per file
- Passkey/WebAuthn requires HTTPS in production

## 📝 Development Guidelines

### Adding New Features

1. Create feature branch from `main`
2. Implement backend API with NestJS
3. Add API documentation with Swagger decorators
4. Create frontend components with TypeScript
5. Add E2E tests for critical paths
6. Update this README if needed
7. Submit pull request with description

### Code Style

- Follow existing TypeScript conventions
- Use ESLint and Prettier for formatting
- Write descriptive commit messages
- Add comments for complex logic
- Use type safety - avoid `any` types

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your fork
5. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED license.

## 📞 Support

For issues, questions, or contributions:

- GitHub Issues: https://github.com/OneStaffOS/OnestaffOS/issues
- Documentation: http://localhost:3000/api/docs

## 🙏 Acknowledgments

Built with modern technologies and best practices:
- NestJS for robust backend architecture
- Next.js for performant frontend
- MongoDB for flexible data modeling
- WebAuthn for secure authentication
- And many other open-source libraries

---