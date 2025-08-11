# Wallet from Fiscus Financial

A comprehensive personal finance management platform that provides real-time financial insights, goal tracking, and investment monitoring through secure bank account integration.

## Overview

Wallet is a modern financial dashboard that connects to your bank accounts via Plaid to provide:
- **Real-time account balances** across all your financial institutions
- **Transaction categorization and analysis** with intelligent spending insights
- **Goal setting and progress tracking** for savings and financial objectives
- **Investment portfolio monitoring** with account aggregation
- **Advanced analytics** including income source analysis and spending patterns
- **Secure multi-tenant architecture** with user authentication and data isolation

## Key Features

### 🏦 Account Management
- Connect multiple bank accounts, credit cards, and investment accounts via Plaid
- Real-time balance synchronization across all connected institutions
- Support for checking, savings, credit cards, loans, and investment accounts
- Visual account categorization with institution branding

### 💰 Transaction Tracking
- Automatic transaction categorization and merchant identification
- Advanced search and filtering capabilities
- Real-time transaction updates and pending transaction handling
- Income vs expense analysis with detailed breakdowns

### 🎯 Goal Setting
- Create and track multiple financial goals (savings, debt payoff, investment targets)
- Primary goal highlighting with progress visualization
- Automatic progress tracking based on account balances
- Goal prioritization and deadline management

### 📊 Analytics & Insights
- Monthly spending analysis with trend visualization
- Income source breakdown by employer/company
- Category-based expense tracking
- Interactive charts and data visualization
- Date range filtering for historical analysis

### 🔒 Security & Privacy
- Bank-level security with Plaid integration
- Multi-tenant architecture with data isolation
- JWT-based authentication with session management
- Comprehensive audit logging for user actions

## Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization and charting
- **React Hook Form** - Form management with validation

### Backend & Database
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database (Nile Database)
- **Plaid API** - Bank account and transaction data
- **JWT** - Authentication and session management

### Development & Testing
- **Vitest** - Fast unit testing framework
- **TypeScript** - Static type checking
- **ESLint** - Code linting and formatting
- **Bun** - Fast package manager and runtime

### Infrastructure
- **Nile Database** - Multi-tenant PostgreSQL hosting
- **Vercel** (deployment ready) - Serverless hosting platform
- **Edge Runtime** - Optimized middleware execution

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes and endpoints
│   ├── auth/              # Authentication pages
│   ├── analytics/         # Financial analytics dashboard
│   ├── goals/             # Goal management interface
│   ├── investments/       # Investment portfolio tracking
│   ├── settings/          # User preferences and account settings
│   └── transactions/      # Transaction management and search
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── auth-provider.tsx # Authentication context
│   └── dashboard-*.tsx   # Dashboard-specific components
├── contexts/             # React contexts for state management
├── hooks/                # Custom React hooks
│   └── use-api.ts        # API integration hooks
├── lib/                  # Utility functions and configurations
│   ├── api-client.ts     # API client functions
│   ├── auth/             # Authentication utilities
│   └── plaid/            # Plaid integration services
├── prisma/               # Database schema and migrations
├── types/                # TypeScript type definitions
└── middleware.ts         # Next.js middleware for auth
```

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database
- Plaid API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wallet-app
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL="your-postgresql-connection-string"
   
   # Plaid API
   PLAID_CLIENT_ID="your-plaid-client-id"
   PLAID_SECRET="your-plaid-secret"
   PLAID_ENV="sandbox" # or development/production
   
   # Authentication
   JWT_SECRET="your-jwt-secret"
   NEXTAUTH_SECRET="your-nextauth-secret"
   ```

4. **Set up the database**
   ```bash
   bun run db:setup
   # or
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   bun dev
   # or
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Available Scripts

- `bun dev` - Start development server
- `bun build` - Build for production
- `bun start` - Start production server
- `bun test` - Run test suite
- `bun test:watch` - Run tests in watch mode
- `bun db:setup` - Set up database schema
- `bun db:migrate` - Run database migrations
- `bun db:seed` - Seed database with sample data
- `bun db:reset` - Reset database

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User sign in
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signout` - User sign out

### Financial Data
- `GET /api/accounts` - Get user's connected accounts
- `GET /api/transactions` - Get transactions with filtering
- `GET /api/investments` - Get investment accounts and holdings
- `POST /api/plaid/link-token` - Generate Plaid Link token
- `POST /api/plaid/exchange-token` - Exchange public token

### Goals & Settings
- `GET /api/goals` - Get user's financial goals
- `POST /api/goals` - Create new financial goal
- `GET /api/settings` - Get user preferences
- `PUT /api/settings` - Update user preferences

## Database Schema

The application uses a multi-tenant PostgreSQL database with the following key entities:

- **Users** - User accounts and authentication
- **PlaidConnections** - Bank connection metadata
- **Accounts** - Individual bank accounts
- **Transactions** - Financial transactions
- **Goals** - User financial goals and progress
- **UserPreferences** - User settings and preferences

## Security Features

- **Multi-tenant data isolation** - Each user's data is completely isolated
- **JWT-based authentication** - Secure token-based auth with refresh tokens
- **Plaid integration** - Bank-level security for financial data
- **Input validation** - Comprehensive validation using Zod schemas
- **Audit logging** - Complete audit trail for user actions
- **Session management** - Configurable session timeouts and security

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Recent Updates

### Income Sources Enhancement
- Updated analytics to show income by company/employer instead of generic categories
- Enhanced transaction name parsing for better company identification
- Improved data visualization with real merchant data

### Plaid Investments Integration
- Added comprehensive investment account support
- Real-time investment portfolio tracking
- Holdings and transaction management infrastructure
- Enhanced investment analytics and reporting

## License

This project is proprietary software owned by Fiscus Financial.

## Support

For support and questions, please contact the development team or create an issue in the repository.