# ExecutiveAI Pro - Replit Guide

## Overview
ExecutiveAI Pro is a multi-tenant SaaS platform designed for comprehensive lead management, form processing, CPF compliance, and WhatsApp Business integration. It features an executive dashboard, a Canva-style label designer, and a public-facing form system. The platform aims to streamline customer acquisition and management processes, offering robust tools for businesses to track and engage with leads efficiently.

## User Preferences
- I prefer simple and direct explanations.
- I want iterative development with clear, small steps.
- Ask for my approval before making any major architectural changes or adding new external dependencies.
- Ensure that the Kanban board remains in a read-only, visual mode. Lead movements should only occur via system automations, not drag-and-drop.
- Prioritize robust data matching across different sources (phone, CPF, name) for lead and form submission correlation.
- Focus on displaying all accumulated lead information comprehensively in the lead details modal.

## System Architecture
ExecutiveAI Pro is built as a full-stack application using a modern JavaScript ecosystem.

### UI/UX Decisions
- **Design System:** Utilizes TailwindCSS, shadcn/ui, and Radix UI for a consistent and modern user interface.
- **Label Designer:** Incorporates a Canva-style label designer for intuitive customization.
- **Form System:** Features a public-facing form system with customizable design elements, ensuring brand consistency. Color logic for forms is critical and consistently applied across `FormPreview.tsx`, `FormularioPublico.tsx`, `PublicForm.tsx`, and `TrackedPublicForm.tsx` using `deriveDesignColors`.

### Technical Implementations
- **Frontend:** React 18 with Vite and TypeScript for a fast and type-safe development experience. State management is handled by TanStack Query and Zustand.
- **Backend:** Express.js with TypeScript, providing a robust API layer.
- **Database:** PostgreSQL (Replit/Neon) managed with Drizzle ORM. The schema includes over 46 tables covering authentication, lead pipelines, forms, WhatsApp configurations, and product management.
- **Multi-tenancy:** Core design principle, ensuring data isolation and customized experiences for each tenant.
- **Background Jobs:** Automated tasks (FormPoller, CPFPoller, FormMappingSync) run at regular intervals to synchronize data and update lead statuses.
- **Authentication:** JWT-based authentication system.
- **Lead Journey Aggregation:** A sophisticated system `(server/lib/leadJourneyAggregator.ts)` aggregates lead data from various sources (form submissions, CPF compliance, chat messages, formulario_envios) to build a comprehensive lead profile.
- **Data Matching:** Multi-key indexing for form submissions (phone, CPF, name) ensures accurate matching even with inconsistent data formats.
- **Kanban Board:** Designed as a visualization tool, with lead status changes driven purely by backend automations, not user drag-and-drop interactions. The LeadCard modal displays extensive lead details including personal info, contact history, meeting info, form responses, activity statistics, data availability, CPF/compliance history, and full conversation logs.
- **Formulário Não Preenchido:** Leads in the `formulario_envios` Supabase table (forms sent but not filled) are displayed in a dedicated Kanban column with yellow highlighting, showing send date, retry attempts, and form URL. Data flows from Supabase (snake_case) → aggregator (converts to camelCase) → routes (ensures camelCase with fallbacks) → frontend.

### Feature Specifications
- **Lead Management:** Comprehensive pipeline with activities and labels.
- **Form Management:** Creation, deployment, and submission tracking for public forms.
- **CPF Compliance:** Integration for real-time CPF validation and risk assessment.
- **WhatsApp Integration:** Tools for managing WhatsApp Business communications.
- **Executive Dashboard:** High-level overview of key metrics.

### System Design Choices
- **Development Environment:** Configured for Replit with specific Vite and Express settings for seamless integration (`host: "0.0.0.0"`, `port: 5000`, `allowedHosts: ['all']`).
- **Deployment:** Autoscale configured with `npm run build` and `npm run start` for production.
- **Code Structure:** Clear separation of concerns with dedicated directories for server, client, shared code, and utility scripts.

## External Dependencies
- **PostgreSQL:** Primary database (Replit/Neon).
- **Drizzle ORM:** Used for database interaction.
- **BigDataCorp (Optional):** External API for data enrichment and compliance checks (`TOKEN_ID`, `CHAVE_TOKEN`).
- **Supabase (Optional):** Used for advanced features and possibly as a backend for form submissions (`SUPABASE_MASTER_URL`, `SUPABASE_MASTER_SERVICE_ROLE_KEY`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`).
- **Upstash (Optional):** Provides Redis for caching (`REDIS_URL`).
- **Evolution API (Optional):** For WhatsApp Business integration (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`).
- **Sentry (Optional):** For error monitoring and performance tracking (`SENTRY_DSN`).

## Recent Changes

### December 16, 2025
- **Fixed Lead Name Resolution Chain:** Added `formularioEnvio?.nome` to the name resolution chain in `leadJourneyAggregator.ts` (line 1443). The priority order is now: `cliente?.nome` → `submission?.contact_name` → `formularioEnvio?.nome` → `cpfResult?.nome` → `dashboardRecord?.nome` → fallback to "Sem nome".
- **Added Orphan formulario_envios Handling:** Records in the `formulario_envios` table that don't exist in other tables (dados_cliente, form_submissions, etc.) now correctly appear in the Kanban board's "Formulário Não Preenchido" column with proper names instead of being silently ignored.