# Loops.so Admin Panel

## Overview

This is a full-stack React application with an Express.js backend designed as an admin panel for Loops.so. The application provides two main features: bulk importing audience contacts and sending transactional emails. It's built with TypeScript, uses a modern React stack with shadcn/ui components, and includes a PostgreSQL database with Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful API with JSON responses
- **Data Layer**: Drizzle ORM with PostgreSQL
- **Session Management**: Express sessions with PostgreSQL store (connect-pg-simple)
- **Development**: Hot reload with tsx for TypeScript execution

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migration**: Drizzle Kit for database migrations
- **Tables**: 
  - `contacts` - stores email addresses with unique constraint
  - `email_logs` - tracks sent emails with recipient lists and content

## Key Components

### Core Pages
1. **Bulk Import Audience** (`/` and `/bulk-import-audience`)
   - Text area for manual email entry
   - File upload for CSV/TXT files
   - Email validation and duplicate handling
   - Success/error notifications

2. **Send Transactional Email** (`/send-transactional-email`)
   - Form for email composition (recipients, subject, HTML content)
   - Email preview modal
   - Test email functionality
   - File upload for recipient lists

### Shared Components
- **Layout**: Fixed navbar with navigation links and footer
- **UI Library**: Complete shadcn/ui component set (buttons, forms, dialogs, etc.)
- **File Upload**: Reusable component for CSV/TXT file processing
- **Notifications**: Custom toast notifications and modal alerts
- **Loading States**: Spinner components for async operations

### API Endpoints
- `POST /api/loops/import-contacts` - Bulk import email contacts
- `POST /api/loops/send-email` - Send transactional emails
- Error handling with structured JSON responses
- Request logging middleware

## Data Flow

1. **Contact Import Flow**:
   - User inputs emails via text area or file upload
   - Frontend validates email format using Zod schema
   - API processes emails, filters duplicates, stores in database
   - Returns import statistics (imported, skipped, total)

2. **Email Send Flow**:
   - User composes email with recipients, subject, and HTML content
   - Optional email preview before sending
   - API logs email data to database
   - Returns success confirmation with recipient count

3. **State Management**:
   - TanStack Query handles API calls, caching, and loading states
   - React Hook Form for form state management
   - Local state for UI interactions (modals, notifications)

## External Dependencies

### Core Framework Dependencies
- React 18 with TypeScript support
- Express.js for backend API
- Wouter for lightweight routing
- TanStack Query for server state

### Database & ORM
- Drizzle ORM with PostgreSQL dialect
- Neon serverless PostgreSQL driver
- Drizzle Kit for schema management and migrations

### UI & Styling
- Tailwind CSS for utility-first styling
- Radix UI primitives for accessible components
- shadcn/ui for pre-built component library
- Lucide React for icons

### Development Tools
- Vite for fast development and building
- tsx for TypeScript execution in development
- ESBuild for production builds
- PostCSS with Autoprefixer

## Deployment Strategy

### Development
- `npm run dev` - Starts development server with hot reload
- Frontend served by Vite dev server with HMR
- Backend runs with tsx for TypeScript execution
- Database migrations via `npm run db:push`

### Production Build
- `npm run build` - Creates optimized production build
- Frontend: Vite builds React app to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Static file serving handled by Express in production

### Environment Configuration
- `DATABASE_URL` required for PostgreSQL connection
- Development/production modes handled via `NODE_ENV`
- Replit-specific configurations for deployment environment

### Database Setup
- Drizzle schema defined in `shared/schema.ts`
- Migrations stored in `./migrations` directory
- Schema includes UUID primary keys with PostgreSQL defaults
- Email uniqueness enforced at database level