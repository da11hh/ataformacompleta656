# Sistema de Criação de Formulários - Referência Completa para Reuniões

> **OBJETIVO**: Este documento captura EXAUSTIVAMENTE toda a estrutura, código, automações e configurações do sistema de CRIAÇÃO de formulários. Use como base para criar o sistema de REUNIÕES com a mesma arquitetura.

---

## 📋 Índice

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Schema do Banco de Dados](#2-schema-do-banco-de-dados)
3. [Tipos TypeScript Frontend](#3-tipos-typescript-frontend)
4. [Store Zustand (Gerenciamento de Estado)](#4-store-zustand-gerenciamento-de-estado)
5. [Camada de Persistência (Storage)](#5-camada-de-persistência-storage)
6. [API Endpoints](#6-api-endpoints)
7. [Sistema de Templates](#7-sistema-de-templates)
8. [Campos Padrão](#8-campos-padrão)
9. [Sistema de Slugs (URLs Amigáveis)](#9-sistema-de-slugs-urls-amigáveis)
10. [Design Config (Personalização Visual)](#10-design-config-personalização-visual)
11. [Páginas de Conclusão](#11-páginas-de-conclusão)
12. [Sincronização com Supabase](#12-sincronização-com-supabase)
13. [Sistema de Leads](#13-sistema-de-leads)
14. [Multi-Tenant Security](#14-multi-tenant-security)
15. [Automações e Pollers](#15-automações-e-pollers)
16. [Adaptação para Reuniões](#16-adaptação-para-reuniões)

---

## 1. Arquitetura Geral

### 1.1 Estrutura de Diretórios (Formulários)

```
├── shared/
│   ├── db-schema.ts              # Schema principal Drizzle (PostgreSQL)
│   └── formularios/
│       └── schema.ts             # Schema específico de formulários
│
├── server/
│   ├── formularios/
│   │   ├── db.ts                 # Conexão com banco de dados
│   │   ├── storage.ts            # Camada de persistência (CRUD)
│   │   ├── routes.ts             # Rotas API básicas
│   │   ├── services/
│   │   │   ├── leadService.ts    # Serviço de gerenciamento de leads
│   │   │   ├── leadSync.ts       # Sincronização submission → lead
│   │   │   ├── leadTracking.ts   # Tracking de eventos de leads
│   │   │   ├── standardFields.ts # Campos padrão do sistema
│   │   │   └── templateSeeder.ts # Seeder de templates
│   │   └── utils/
│   │       ├── caseConverter.ts  # Conversão snake_case ↔ camelCase
│   │       ├── formEnrichment.ts # Enriquecimento de dados
│   │       ├── phoneNormalizer.ts# Normalização de telefones
│   │       ├── slugGenerator.ts  # Geração de slugs únicos
│   │       └── supabaseClient.ts # Cliente Supabase dinâmico
│   │
│   └── routes/
│       ├── formularios.ts             # Rotas básicas
│       ├── formularios-platform.ts    # Rotas da plataforma
│       └── formularios-complete.ts    # Rotas completas (PRINCIPAL)
│
├── src/
│   ├── stores/
│   │   └── formularioStore.ts    # Estado global Zustand
│   └── types/
│       └── formulario.ts         # Tipos TypeScript
```

### 1.2 Estrutura Proposta para Reuniões

```
├── shared/
│   ├── db-schema.ts              # Adicionar tabelas de reuniões
│   └── reunioes/
│       └── schema.ts             # Schema específico de reuniões
│
├── server/
│   ├── reunioes/
│   │   ├── db.ts                 # Conexão com banco de dados
│   │   ├── storage.ts            # Camada de persistência (CRUD)
│   │   ├── routes.ts             # Rotas API básicas
│   │   ├── services/
│   │   │   ├── meetingService.ts    # Serviço de gerenciamento de reuniões
│   │   │   ├── meetingSync.ts       # Sincronização booking → lead
│   │   │   ├── meetingTracking.ts   # Tracking de eventos
│   │   │   ├── standardSlots.ts     # Horários padrão do sistema
│   │   │   └── templateSeeder.ts    # Seeder de templates de reunião
│   │   └── utils/
│   │       ├── caseConverter.ts     # Conversão snake_case ↔ camelCase
│   │       ├── meetingEnrichment.ts # Enriquecimento de dados
│   │       ├── timeZoneHandler.ts   # Handler de fusos horários
│   │       ├── slugGenerator.ts     # Geração de slugs únicos
│   │       └── calendarClient.ts    # Cliente Google Calendar
│   │
│   └── routes/
│       ├── reunioes.ts               # Rotas básicas
│       ├── reunioes-platform.ts      # Rotas da plataforma
│       └── reunioes-complete.ts      # Rotas completas (PRINCIPAL)
│
├── src/
│   ├── stores/
│   │   └── reuniaoStore.ts       # Estado global Zustand
│   └── types/
│       └── reuniao.ts            # Tipos TypeScript
```

### 1.3 Fluxo de Dados

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │   Editor    │    │  Formulário │    │   Dashboard │       │
│  │ de Forms    │    │   Público   │    │  de Leads   │       │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│                         API LAYER                             │
│  POST/PATCH /api/forms  │  POST /api/submissions  │  GET...  │
└─────────┬──────────────────────┬──────────────────┬──────────┘
          │                      │                  │
          ▼                      ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                            │
│  ┌─────────────────┐      ┌─────────────────┐                │
│  │   PostgreSQL    │◄────►│    Supabase     │                │
│  │   (Principal)   │      │   (Opcional)    │                │
│  └─────────────────┘      └─────────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Schema do Banco de Dados

### 2.1 Tabela `forms` (Formulários)

```typescript
// shared/db-schema.ts - linhas 619-658
export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug"),
  description: text("description"),
  welcomeTitle: text("welcome_title"),
  welcomeMessage: text("welcome_message"),
  welcomeConfig: jsonb("welcome_config"),
  questions: jsonb("questions").notNull(),
  elements: jsonb("elements"),
  passingScore: integer("passing_score").notNull().default(0),
  scoreTiers: jsonb("score_tiers"),
  designConfig: jsonb("design_config").default(sql`'{
    "colors": {
      "primary": "hsl(221, 83%, 53%)",
      "secondary": "hsl(210, 40%, 96%)",
      "background": "hsl(0, 0%, 100%)",
      "text": "hsl(222, 47%, 11%)"
    },
    "typography": {
      "fontFamily": "Inter",
      "titleSize": "2xl",
      "textSize": "base"
    },
    "logo": null,
    "spacing": "comfortable"
  }'::jsonb`),
  completionPageId: uuid("completion_page_id").references(() => completionPages.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  tenantId: text("tenant_id").notNull(),
  isPublic: boolean("is_public").default(false),
}, (table) => ({
  createdAtIdx: index("idx_forms_created_at").on(table.createdAt.desc()),
  completionPageIdx: index("idx_forms_completion_page").on(table.completionPageId),
  tenantIdIdx: index("idx_forms_tenant_id").on(table.tenantId),
  slugTenantIdx: index("idx_forms_slug_tenant").on(table.slug, table.tenantId),
}));
```

### 2.2 Tabela Equivalente para Reuniões (`meetings`)

```typescript
// PROPOSTA: shared/db-schema.ts
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug"),
  description: text("description"),
  
  // Configurações da reunião
  duration: integer("duration").notNull().default(30), // minutos
  bufferBefore: integer("buffer_before").default(0),   // minutos antes
  bufferAfter: integer("buffer_after").default(0),     // minutos depois
  
  // Disponibilidade
  availabilityConfig: jsonb("availability_config").notNull(),
  // Estrutura: { weekdays: [1,2,3,4,5], timeSlots: [{start: "09:00", end: "17:00"}], timezone: "America/Sao_Paulo" }
  
  // Localização
  locationType: text("location_type").default("video"), // video, phone, in_person, custom
  locationConfig: jsonb("location_config"),
  // Estrutura: { provider: "google_meet", customUrl: "", address: "" }
  
  // Página de agendamento
  welcomeTitle: text("welcome_title"),
  welcomeMessage: text("welcome_message"),
  welcomeConfig: jsonb("welcome_config"),
  
  // Campos do formulário de agendamento
  bookingFields: jsonb("booking_fields").notNull(), // Similar a questions
  
  // Design
  designConfig: jsonb("design_config").default(sql`'{
    "colors": {
      "primary": "hsl(221, 83%, 53%)",
      "secondary": "hsl(210, 40%, 96%)",
      "background": "hsl(0, 0%, 100%)",
      "text": "hsl(222, 47%, 11%)"
    },
    "typography": {
      "fontFamily": "Inter",
      "titleSize": "2xl",
      "textSize": "base"
    },
    "logo": null,
    "spacing": "comfortable"
  }'::jsonb`),
  
  // Página de confirmação
  confirmationPageId: uuid("confirmation_page_id").references(() => meetingConfirmationPages.id, { onDelete: "set null" }),
  
  // Integrações
  googleCalendarId: text("google_calendar_id"),
  
  // Metadados
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  tenantId: text("tenant_id").notNull(),
  isPublic: boolean("is_public").default(false),
}, (table) => ({
  createdAtIdx: index("idx_meetings_created_at").on(table.createdAt.desc()),
  confirmationPageIdx: index("idx_meetings_confirmation_page").on(table.confirmationPageId),
  tenantIdIdx: index("idx_meetings_tenant_id").on(table.tenantId),
  slugTenantIdx: index("idx_meetings_slug_tenant").on(table.slug, table.tenantId),
}));
```

### 2.3 Tabela `form_submissions` (Respostas)

```typescript
// shared/db-schema.ts - linhas 680-713
export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id"),
  formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  totalScore: integer("total_score").notNull(),
  passed: boolean("passed").notNull(),
  
  // Dados de contato
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactCpf: text("contact_cpf"),
  instagramHandle: text("instagram_handle"),
  birthDate: date("birth_date"),
  
  // Dados de endereço
  addressCep: text("address_cep"),
  addressStreet: text("address_street"),
  addressNumber: text("address_number"),
  addressComplement: text("address_complement"),
  addressNeighborhood: text("address_neighborhood"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  formIdIdx: index("idx_submissions_form_id").on(table.formId),
  createdAtIdx: index("idx_submissions_created_at").on(table.createdAt.desc()),
  tenantIdx: index("idx_submissions_tenant").on(table.tenantId),
  cpfIdx: index("idx_submissions_cpf").on(table.contactCpf),
  phoneIdx: index("idx_submissions_phone").on(table.contactPhone),
}));
```

### 2.4 Tabela Equivalente para Reuniões (`meeting_bookings`)

```typescript
// PROPOSTA: shared/db-schema.ts
export const meetingBookings = pgTable("meeting_bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id"),
  meetingId: uuid("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  
  // Dados do agendamento
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(), // "14:30"
  scheduledDateTime: timestamp("scheduled_date_time", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull(), // minutos
  timezone: text("timezone").default("America/Sao_Paulo"),
  
  // Status do agendamento
  status: text("status").default("pending"), // pending, confirmed, cancelled, completed, no_show
  
  // Dados do formulário de agendamento
  answers: jsonb("answers").notNull(),
  
  // Dados de contato
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactCpf: text("contact_cpf"),
  
  // Localização
  locationUrl: text("location_url"), // Link do Google Meet, Zoom, etc.
  locationDetails: text("location_details"),
  
  // Integrações
  googleEventId: text("google_event_id"),
  calendarLink: text("calendar_link"),
  
  // Lembretes
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  
  // Observações
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  meetingIdIdx: index("idx_bookings_meeting_id").on(table.meetingId),
  createdAtIdx: index("idx_bookings_created_at").on(table.createdAt.desc()),
  tenantIdx: index("idx_bookings_tenant").on(table.tenantId),
  phoneIdx: index("idx_bookings_phone").on(table.contactPhone),
  scheduledIdx: index("idx_bookings_scheduled").on(table.scheduledDateTime),
  statusIdx: index("idx_bookings_status").on(table.status),
}));
```

### 2.5 Tabela `form_tenant_mapping` (Mapeamento Multi-Tenant)

```typescript
// shared/db-schema.ts - linhas 663-676
export const formTenantMapping = pgTable("form_tenant_mapping", {
  formId: uuid("form_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  slug: text("slug"),
  companySlug: text("company_slug"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  tenantIdIdx: index("idx_form_mapping_tenant").on(table.tenantId),
  isPublicIdx: index("idx_form_mapping_public").on(table.isPublic),
  slugIdx: index("idx_form_mapping_slug").on(table.slug),
  companySlugIdx: index("idx_form_mapping_company_slug").on(table.companySlug)
}));
```

### 2.6 Tabela Equivalente para Reuniões (`meeting_tenant_mapping`)

```typescript
// PROPOSTA: shared/db-schema.ts
export const meetingTenantMapping = pgTable("meeting_tenant_mapping", {
  meetingId: uuid("meeting_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  slug: text("slug"),
  companySlug: text("company_slug"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  tenantIdIdx: index("idx_meeting_mapping_tenant").on(table.tenantId),
  isPublicIdx: index("idx_meeting_mapping_public").on(table.isPublic),
  slugIdx: index("idx_meeting_mapping_slug").on(table.slug),
  companySlugIdx: index("idx_meeting_mapping_company_slug").on(table.companySlug)
}));
```

### 2.7 Tabela `form_templates` (Templates)

```typescript
// shared/db-schema.ts - linhas 715-729
export const formTemplates = pgTable("form_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  designConfig: jsonb("design_config").notNull(),
  questions: jsonb("questions").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_form_templates_tenant").on(table.tenantId),
}));
```

### 2.8 Tabela Equivalente para Reuniões (`meeting_templates`)

```typescript
// PROPOSTA: shared/db-schema.ts
export const meetingTemplates = pgTable("meeting_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration").notNull().default(30),
  designConfig: jsonb("design_config").notNull(),
  bookingFields: jsonb("booking_fields").notNull(),
  availabilityConfig: jsonb("availability_config").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_meeting_templates_tenant").on(table.tenantId),
}));
```

### 2.9 Tabela `completion_pages` (Páginas de Conclusão)

```typescript
// shared/db-schema.ts - linhas 577-617
export const completionPages = pgTable("completion_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  title: text("title").notNull().default("Obrigado!"),
  subtitle: text("subtitle"),
  successMessage: text("success_message").notNull().default("Parabéns! Você está qualificado. Entraremos em contato em breve."),
  failureMessage: text("failure_message").notNull().default("Obrigado pela sua participação. Infelizmente você não atingiu a pontuação mínima."),
  showScore: boolean("show_score").default(true),
  showTierBadge: boolean("show_tier_badge").default(true),
  logo: text("logo"),
  logoAlign: text("logo_align").default("center"),
  successIconColor: text("success_icon_color").default("hsl(142, 71%, 45%)"),
  failureIconColor: text("failure_icon_color").default("hsl(0, 84%, 60%)"),
  successIconImage: text("success_icon_image"),
  failureIconImage: text("failure_icon_image"),
  successIconType: text("success_icon_type").default("check-circle"),
  failureIconType: text("failure_icon_type").default("x-circle"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  customContent: text("custom_content"),
  designConfig: jsonb("design_config").default(sql`'{...}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  createdAtIdx: index("idx_completion_pages_created_at").on(table.createdAt.desc()),
  tenantIdx: index("idx_completion_pages_tenant").on(table.tenantId),
}));
```

### 2.10 Tabela Equivalente para Reuniões (`meeting_confirmation_pages`)

```typescript
// PROPOSTA: shared/db-schema.ts
export const meetingConfirmationPages = pgTable("meeting_confirmation_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  title: text("title").notNull().default("Reunião Agendada!"),
  subtitle: text("subtitle"),
  confirmationMessage: text("confirmation_message").notNull().default("Sua reunião foi agendada com sucesso. Você receberá um e-mail de confirmação em breve."),
  
  // Exibição de detalhes
  showDateTime: boolean("show_date_time").default(true),
  showLocation: boolean("show_location").default(true),
  showAddToCalendar: boolean("show_add_to_calendar").default(true),
  
  // Design
  logo: text("logo"),
  logoAlign: text("logo_align").default("center"),
  iconColor: text("icon_color").default("hsl(142, 71%, 45%)"),
  iconImage: text("icon_image"),
  iconType: text("icon_type").default("calendar-check"),
  
  // CTA
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  customContent: text("custom_content"),
  
  designConfig: jsonb("design_config").default(sql`'{...}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  createdAtIdx: index("idx_meeting_confirmation_pages_created_at").on(table.createdAt.desc()),
  tenantIdx: index("idx_meeting_confirmation_pages_tenant").on(table.tenantId),
}));
```

---

## 3. Tipos TypeScript Frontend

### 3.1 Tipos de Formulários (Completo)

```typescript
// src/types/formulario.ts

/**
 * Tipos de campos disponíveis no formulário
 */
export type TipoCampo =
  | 'texto'
  | 'texto_longo'
  | 'email'
  | 'telefone'
  | 'numero'
  | 'data'
  | 'hora'
  | 'data_hora'
  | 'select'
  | 'select_multiplo'
  | 'radio'
  | 'checkbox'
  | 'arquivo'
  | 'url'
  | 'cpf'
  | 'cnpj'
  | 'cep'
  | 'moeda'
  | 'avaliacao'
  | 'escala'
  | 'assinatura';

/**
 * Regras de validação para campos
 */
export interface RegrasValidacao {
  obrigatorio?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidation?: string;
}

/**
 * Campo individual do formulário
 */
export interface CampoFormulario {
  id: string;
  tipo: TipoCampo;
  label: string;
  placeholder?: string;
  descricao?: string;
  validacao: RegrasValidacao;
  opcoes?: string[]; // Para select, radio, checkbox
  condicional?: {
    campoId: string;
    valor: any;
    operador: 'igual' | 'diferente' | 'contem' | 'maior' | 'menor';
  };
  largura?: 'completa' | 'metade' | 'terco' | 'dois_tercos';
  ordem: number;
}

/**
 * Configurações de estilo do formulário
 */
export interface EstiloFormulario {
  tema?: 'claro' | 'escuro' | 'auto';
  corPrimaria?: string;
  corFundo?: string;
  corTexto?: string;
  corBotao?: string;
  fonte?: string;
  logoUrl?: string;
  logo?: string;
  logoSize?: number;
  logoAlignment?: 'left' | 'center' | 'right';
  extractedColors?: string[];
}

/**
 * Configurações de notificação
 */
export interface ConfiguracoesNotificacao {
  notificarPorEmail?: boolean;
  emailsNotificacao?: string[];
  mensagemSucesso?: string;
  redirecionarAposEnvio?: boolean;
  urlRedirecionamento?: string;
}

/**
 * Formulário completo
 */
export interface Formulario {
  id: string;
  userId: string;
  titulo: string;
  descricao?: string;
  campos: CampoFormulario[];
  estilo: EstiloFormulario;
  notificacoes: ConfiguracoesNotificacao;
  ativo: boolean;
  publico: boolean;
  linkPublico?: string;
  permitirEdicao?: boolean;
  permitirMultiplasSubmissoes?: boolean;
  dataExpiracao?: Date;
  limiteTentativas?: number;
  criadoEm: Date;
  atualizadoEm: Date;
  totalSubmissoes: number;
}

/**
 * Resposta de um campo
 */
export interface RespostaCampo {
  campoId: string;
  valor: any;
  label: string;
  tipo: TipoCampo;
}

/**
 * Submissão do formulário
 */
export interface SubmissaoFormulario {
  id: string;
  formularioId: string;
  respostas: RespostaCampo[];
  ip?: string;
  userAgent?: string;
  localizacao?: {
    cidade?: string;
    estado?: string;
    pais?: string;
  };
  enviadoEm: Date;
  editadoEm?: Date;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'arquivado';
  notas?: string;
}

/**
 * Estatísticas do formulário
 */
export interface EstatisticasFormulario {
  formularioId: string;
  totalSubmissoes: number;
  totalVisitas: number;
  taxaConversao: number;
  tempoMedioPreenchimento: number;
  submissoesPorDia: { data: string; quantidade: number; }[];
  camposPopulares: { campoId: string; label: string; taxaPreenchimento: number; }[];
  dispositivosUsados: { tipo: 'desktop' | 'mobile' | 'tablet'; quantidade: number; porcentagem: number; }[];
}

/**
 * Template de formulário
 */
export interface TemplateFormulario {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  campos: Omit<CampoFormulario, 'id'>[];
  icone?: string;
  popular?: boolean;
}
```

### 3.2 Tipos Propostos para Reuniões

```typescript
// PROPOSTA: src/types/reuniao.ts

/**
 * Tipos de localização da reunião
 */
export type TipoLocalizacao = 'video' | 'telefone' | 'presencial' | 'personalizado';

/**
 * Provedor de videoconferência
 */
export type ProvedorVideo = 'google_meet' | 'zoom' | 'teams' | 'custom';

/**
 * Dia da semana (1 = Segunda, 7 = Domingo)
 */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Slot de horário
 */
export interface SlotHorario {
  inicio: string; // "09:00"
  fim: string;    // "17:00"
}

/**
 * Configuração de disponibilidade
 */
export interface ConfiguracaoDisponibilidade {
  diasSemana: DiaSemana[];
  slots: SlotHorario[];
  timezone: string;
  excecoes?: {
    data: string; // "2024-12-25"
    disponivel: boolean;
    slots?: SlotHorario[];
  }[];
}

/**
 * Configuração de localização
 */
export interface ConfiguracaoLocalizacao {
  tipo: TipoLocalizacao;
  provedor?: ProvedorVideo;
  urlPersonalizada?: string;
  endereco?: string;
  instrucoes?: string;
}

/**
 * Campo do formulário de agendamento
 */
export interface CampoAgendamento {
  id: string;
  tipo: 'texto' | 'email' | 'telefone' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  descricao?: string;
  obrigatorio: boolean;
  opcoes?: string[];
  ordem: number;
}

/**
 * Configurações de estilo da reunião
 */
export interface EstiloReuniao {
  tema?: 'claro' | 'escuro' | 'auto';
  corPrimaria?: string;
  corFundo?: string;
  corTexto?: string;
  corBotao?: string;
  fonte?: string;
  logoUrl?: string;
  logo?: string;
  logoSize?: number;
  logoAlignment?: 'left' | 'center' | 'right';
}

/**
 * Configurações de lembretes
 */
export interface ConfiguracoesLembrete {
  enviarEmail?: boolean;
  enviarWhatsApp?: boolean;
  antecedencia?: number[]; // [24, 1] = 24h e 1h antes
}

/**
 * Reunião completa
 */
export interface Reuniao {
  id: string;
  userId: string;
  titulo: string;
  descricao?: string;
  duracao: number; // minutos
  bufferAntes: number;
  bufferDepois: number;
  disponibilidade: ConfiguracaoDisponibilidade;
  localizacao: ConfiguracaoLocalizacao;
  campos: CampoAgendamento[];
  estilo: EstiloReuniao;
  lembretes: ConfiguracoesLembrete;
  ativo: boolean;
  publico: boolean;
  linkPublico?: string;
  googleCalendarId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  totalAgendamentos: number;
}

/**
 * Agendamento de reunião
 */
export interface Agendamento {
  id: string;
  reuniaoId: string;
  dataAgendada: Date;
  horaAgendada: string;
  duracao: number;
  timezone: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido' | 'nao_compareceu';
  respostas: Record<string, any>;
  contatoNome: string;
  contatoEmail: string;
  contatoTelefone?: string;
  urlLocalizacao?: string;
  googleEventId?: string;
  linkCalendario?: string;
  lembretesEnviados?: Date[];
  observacoes?: string;
  motivoCancelamento?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Estatísticas de reuniões
 */
export interface EstatisticasReuniao {
  reuniaoId: string;
  totalAgendamentos: number;
  totalConcluidos: number;
  totalCancelados: number;
  totalNaoCompareceu: number;
  taxaConversao: number;
  taxaCancelamento: number;
  horariosMaisPopulares: { hora: string; quantidade: number; }[];
  diasMaisPopulares: { dia: string; quantidade: number; }[];
}

/**
 * Template de reunião
 */
export interface TemplateReuniao {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  duracao: number;
  campos: Omit<CampoAgendamento, 'id'>[];
  disponibilidade: ConfiguracaoDisponibilidade;
  icone?: string;
  popular?: boolean;
}
```

---

## 4. Store Zustand (Gerenciamento de Estado)

### 4.1 Store de Formulários

```typescript
// src/stores/formularioStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Formulario,
  CampoFormulario,
  SubmissaoFormulario,
  EstatisticasFormulario,
  FiltrosFormulario,
} from '@/types/formulario';

interface FormularioStore {
  // Estado
  formularios: Formulario[];
  formularioAtual: Formulario | null;
  submissoes: SubmissaoFormulario[];
  estatisticas: Record<string, EstatisticasFormulario>;
  filtros: FiltrosFormulario;
  loading: boolean;
  error: string | null;

  // Ações - Formulários
  setFormularios: (formularios: Formulario[]) => void;
  addFormulario: (formulario: Formulario) => void;
  updateFormulario: (id: string, updates: Partial<Formulario>) => void;
  deleteFormulario: (id: string) => void;
  setFormularioAtual: (formulario: Formulario | null) => void;
  duplicarFormulario: (id: string) => void;

  // Ações - Campos
  addCampo: (formularioId: string, campo: CampoFormulario) => void;
  updateCampo: (formularioId: string, campoId: string, updates: Partial<CampoFormulario>) => void;
  deleteCampo: (formularioId: string, campoId: string) => void;
  reordenarCampos: (formularioId: string, campoIds: string[]) => void;

  // Ações - Submissões
  setSubmissoes: (submissoes: SubmissaoFormulario[]) => void;
  addSubmissao: (submissao: SubmissaoFormulario) => void;
  updateSubmissao: (id: string, updates: Partial<SubmissaoFormulario>) => void;
  deleteSubmissao: (id: string) => void;
  aprovarSubmissao: (id: string) => void;
  rejeitarSubmissao: (id: string) => void;

  // Ações - Estatísticas
  setEstatisticas: (formularioId: string, stats: EstatisticasFormulario) => void;
  incrementarVisita: (formularioId: string) => void;
  incrementarSubmissao: (formularioId: string) => void;

  // Ações - Utilitários
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  limparDados: () => void;
}

const estadoInicial = {
  formularios: [],
  formularioAtual: null,
  submissoes: [],
  estatisticas: {},
  filtros: {
    ordenarPor: 'atualizado_em' as const,
    ordem: 'desc' as const,
    pagina: 1,
    limite: 10,
  },
  loading: false,
  error: null,
};

export const useFormularioStore = create<FormularioStore>()(
  persist(
    (set, get) => ({
      ...estadoInicial,

      // Ações - Formulários
      setFormularios: (formularios) => set({ formularios }),

      addFormulario: (formulario) =>
        set((state) => ({
          formularios: [formulario, ...state.formularios],
        })),

      updateFormulario: (id, updates) =>
        set((state) => ({
          formularios: state.formularios.map((f) =>
            f.id === id
              ? { ...f, ...updates, atualizadoEm: new Date() }
              : f
          ),
          formularioAtual:
            state.formularioAtual?.id === id
              ? { ...state.formularioAtual, ...updates, atualizadoEm: new Date() }
              : state.formularioAtual,
        })),

      deleteFormulario: (id) =>
        set((state) => ({
          formularios: state.formularios.filter((f) => f.id !== id),
          formularioAtual:
            state.formularioAtual?.id === id ? null : state.formularioAtual,
        })),

      // ... demais ações implementadas
    }),
    {
      name: 'formulario-store',
    }
  )
);
```

### 4.2 Store Proposta para Reuniões

```typescript
// PROPOSTA: src/stores/reuniaoStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Reuniao,
  CampoAgendamento,
  Agendamento,
  EstatisticasReuniao,
} from '@/types/reuniao';

interface FiltrosReuniao {
  busca?: string;
  ativo?: boolean;
  publico?: boolean;
  dataInicio?: Date;
  dataFim?: Date;
  ordenarPor?: 'titulo' | 'criado_em' | 'atualizado_em' | 'total_agendamentos';
  ordem?: 'asc' | 'desc';
  pagina?: number;
  limite?: number;
}

interface ReuniaoStore {
  // Estado
  reunioes: Reuniao[];
  reuniaoAtual: Reuniao | null;
  agendamentos: Agendamento[];
  estatisticas: Record<string, EstatisticasReuniao>;
  filtros: FiltrosReuniao;
  loading: boolean;
  error: string | null;

  // Ações - Reuniões
  setReunioes: (reunioes: Reuniao[]) => void;
  addReuniao: (reuniao: Reuniao) => void;
  updateReuniao: (id: string, updates: Partial<Reuniao>) => void;
  deleteReuniao: (id: string) => void;
  setReuniaoAtual: (reuniao: Reuniao | null) => void;
  duplicarReuniao: (id: string) => void;

  // Ações - Campos
  addCampo: (reuniaoId: string, campo: CampoAgendamento) => void;
  updateCampo: (reuniaoId: string, campoId: string, updates: Partial<CampoAgendamento>) => void;
  deleteCampo: (reuniaoId: string, campoId: string) => void;
  reordenarCampos: (reuniaoId: string, campoIds: string[]) => void;

  // Ações - Agendamentos
  setAgendamentos: (agendamentos: Agendamento[]) => void;
  addAgendamento: (agendamento: Agendamento) => void;
  updateAgendamento: (id: string, updates: Partial<Agendamento>) => void;
  cancelarAgendamento: (id: string, motivo?: string) => void;
  confirmarAgendamento: (id: string) => void;
  marcarConcluido: (id: string) => void;
  marcarNaoCompareceu: (id: string) => void;

  // Ações - Estatísticas
  setEstatisticas: (reuniaoId: string, stats: EstatisticasReuniao) => void;

  // Ações - Utilitários
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  limparDados: () => void;
}

const estadoInicial = {
  reunioes: [],
  reuniaoAtual: null,
  agendamentos: [],
  estatisticas: {},
  filtros: {
    ordenarPor: 'atualizado_em' as const,
    ordem: 'desc' as const,
    pagina: 1,
    limite: 10,
  },
  loading: false,
  error: null,
};

export const useReuniaoStore = create<ReuniaoStore>()(
  persist(
    (set, get) => ({
      ...estadoInicial,

      // Implementar todas as ações seguindo o padrão do formularioStore
      setReunioes: (reunioes) => set({ reunioes }),

      addReuniao: (reuniao) =>
        set((state) => ({
          reunioes: [reuniao, ...state.reunioes],
        })),

      updateReuniao: (id, updates) =>
        set((state) => ({
          reunioes: state.reunioes.map((r) =>
            r.id === id
              ? { ...r, ...updates, atualizadoEm: new Date() }
              : r
          ),
          reuniaoAtual:
            state.reuniaoAtual?.id === id
              ? { ...state.reuniaoAtual, ...updates, atualizadoEm: new Date() }
              : state.reuniaoAtual,
        })),

      // ... demais ações
    }),
    {
      name: 'reuniao-store',
    }
  )
);
```

---

## 5. Camada de Persistência (Storage)

### 5.1 Interface IStorage (Formulários)

```typescript
// server/formularios/storage.ts

export interface IStorage {
  // Forms
  getForms(): Promise<Form[]>;
  getFormById(id: string): Promise<Form | null>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, form: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: string): Promise<void>;
  
  // Form Submissions
  getAllSubmissions(): Promise<FormSubmission[]>;
  getFormSubmissions(formId: string): Promise<FormSubmission[]>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  
  // Form Templates
  getFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplateById(id: string): Promise<FormTemplate | null>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  
  // Completion Pages
  getCompletionPages(): Promise<CompletionPage[]>;
  getCompletionPageById(id: string): Promise<CompletionPage | null>;
  createCompletionPage(page: InsertCompletionPage): Promise<CompletionPage>;
  updateCompletionPage(id: string, page: Partial<InsertCompletionPage>): Promise<CompletionPage>;
  deleteCompletionPage(id: string): Promise<void>;
  
  // App Settings
  getAppSettings(): Promise<AppSettings | null>;
  saveAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
  
  // Leads
  getLeads(): Promise<Lead[]>;
  getLeadByTelefone(telefoneNormalizado: string): Promise<Lead | null>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead>;
}
```

### 5.2 Interface Proposta para Reuniões

```typescript
// PROPOSTA: server/reunioes/storage.ts

export interface IMeetingStorage {
  // Meetings
  getMeetings(): Promise<Meeting[]>;
  getMeetingById(id: string): Promise<Meeting | null>;
  getMeetingBySlug(slug: string): Promise<Meeting | null>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting>;
  deleteMeeting(id: string): Promise<void>;
  
  // Bookings
  getAllBookings(): Promise<MeetingBooking[]>;
  getMeetingBookings(meetingId: string): Promise<MeetingBooking[]>;
  getBookingsByDateRange(start: Date, end: Date): Promise<MeetingBooking[]>;
  getBookingById(id: string): Promise<MeetingBooking | null>;
  createBooking(booking: InsertMeetingBooking): Promise<MeetingBooking>;
  updateBooking(id: string, booking: Partial<InsertMeetingBooking>): Promise<MeetingBooking>;
  cancelBooking(id: string, reason?: string): Promise<MeetingBooking>;
  
  // Availability
  getAvailableSlots(meetingId: string, date: Date): Promise<TimeSlot[]>;
  blockTimeSlot(meetingId: string, date: Date, time: string): Promise<void>;
  
  // Templates
  getMeetingTemplates(): Promise<MeetingTemplate[]>;
  getMeetingTemplateById(id: string): Promise<MeetingTemplate | null>;
  createMeetingTemplate(template: InsertMeetingTemplate): Promise<MeetingTemplate>;
  
  // Confirmation Pages
  getConfirmationPages(): Promise<MeetingConfirmationPage[]>;
  getConfirmationPageById(id: string): Promise<MeetingConfirmationPage | null>;
  createConfirmationPage(page: InsertMeetingConfirmationPage): Promise<MeetingConfirmationPage>;
  updateConfirmationPage(id: string, page: Partial<InsertMeetingConfirmationPage>): Promise<MeetingConfirmationPage>;
  deleteConfirmationPage(id: string): Promise<void>;
}
```

### 5.3 Implementação DatabaseStorage (Formulários)

```typescript
// server/formularios/storage.ts

export class DatabaseStorage implements IStorage {
  async getForms(): Promise<Form[]> {
    return await db.select().from(forms).orderBy(desc(forms.createdAt));
  }

  async getFormById(id: string): Promise<Form | null> {
    const result = await db.select().from(forms).where(eq(forms.id, id));
    return result[0] || null;
  }

  async createForm(form: InsertForm): Promise<Form> {
    const result = await db.insert(forms).values(form).returning();
    return result[0];
  }

  async updateForm(id: string, form: Partial<InsertForm>): Promise<Form> {
    const result = await db.update(forms)
      .set({ ...form, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return result[0];
  }

  async deleteForm(id: string): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  async getAllSubmissions(): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
  }

  async getFormSubmissions(formId: string): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.createdAt));
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const result = await db.insert(formSubmissions).values(submission).returning();
    return result[0];
  }

  // ... demais métodos
}

export const storage = new DatabaseStorage();
```

---

## 6. API Endpoints

### 6.1 Endpoints de Formulários

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/forms` | Listar todos os formulários do tenant | ✅ |
| GET | `/api/forms/:id` | Buscar formulário por ID | ✅ |
| GET | `/api/forms/public/:id` | Buscar formulário público | ❌ |
| GET | `/api/forms/public/by-slug/:company/:slug` | Buscar por slug | ❌ |
| POST | `/api/forms` | Criar novo formulário | ✅ |
| PATCH | `/api/forms/:id` | Atualizar formulário | ✅ |
| DELETE | `/api/forms/:id` | Deletar formulário | ✅ |
| GET | `/api/submissions` | Listar todas as submissões | ✅ |
| GET | `/api/forms/:id/submissions` | Submissões de um formulário | ✅ |
| POST | `/api/submissions` | Criar submissão (responder) | ❌ |
| GET | `/api/templates` | Listar templates | ✅ |
| POST | `/api/templates` | Criar template | ✅ |
| GET | `/api/completion-pages` | Listar páginas de conclusão | ✅ |
| POST | `/api/completion-pages` | Criar página de conclusão | ✅ |
| PATCH | `/api/completion-pages/:id` | Atualizar página | ✅ |

### 6.2 Endpoints Propostos para Reuniões

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/meetings` | Listar todas as reuniões do tenant | ✅ |
| GET | `/api/meetings/:id` | Buscar reunião por ID | ✅ |
| GET | `/api/meetings/public/:id` | Buscar reunião pública | ❌ |
| GET | `/api/meetings/public/by-slug/:company/:slug` | Buscar por slug | ❌ |
| POST | `/api/meetings` | Criar nova reunião | ✅ |
| PATCH | `/api/meetings/:id` | Atualizar reunião | ✅ |
| DELETE | `/api/meetings/:id` | Deletar reunião | ✅ |
| GET | `/api/meetings/:id/availability` | Obter slots disponíveis | ❌ |
| GET | `/api/meetings/:id/availability/:date` | Slots disponíveis para data | ❌ |
| GET | `/api/bookings` | Listar todos os agendamentos | ✅ |
| GET | `/api/meetings/:id/bookings` | Agendamentos de uma reunião | ✅ |
| POST | `/api/bookings` | Criar agendamento | ❌ |
| PATCH | `/api/bookings/:id` | Atualizar agendamento | ✅ |
| POST | `/api/bookings/:id/cancel` | Cancelar agendamento | ✅/❌ |
| POST | `/api/bookings/:id/confirm` | Confirmar agendamento | ✅ |
| GET | `/api/meeting-templates` | Listar templates | ✅ |
| POST | `/api/meeting-templates` | Criar template | ✅ |
| GET | `/api/confirmation-pages` | Listar páginas de confirmação | ✅ |
| POST | `/api/confirmation-pages` | Criar página de confirmação | ✅ |
| PATCH | `/api/confirmation-pages/:id` | Atualizar página | ✅ |

---

## 7. Sistema de Templates

### 7.1 Template Seeder (Formulários)

```typescript
// server/formularios/services/templateSeeder.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { STANDARD_REGISTRATION_FIELDS, DEFAULT_REGISTRATION_DESIGN_CONFIG } from "./standardFields.js";
import { db } from "../db.js";
import { formTemplates, forms } from "../../../shared/db-schema.js";

/**
 * 🔐 SECURITY: Ensures a complete registration template exists for a tenant
 */
export async function ensureCompleteRegistrationTemplate(
  tenantId: string,
  supabase?: SupabaseClient | null
): Promise<any> {
  if (!tenantId) {
    throw new Error("🔐 SECURITY: tenantId is required");
  }
  
  const templateData = {
    name: "Formulário Completo de Cadastro",
    description: "Template completo com todos os campos essenciais...",
    thumbnailUrl: null,
    isDefault: true,
    designConfig: DEFAULT_REGISTRATION_DESIGN_CONFIG,
    questions: STANDARD_REGISTRATION_FIELDS
  };
  
  // Verificar se existe
  const existing = await db.select()
    .from(formTemplates)
    .where(and(
      eq(formTemplates.name, templateData.name),
      eq(formTemplates.tenantId, tenantId),
      eq(formTemplates.isDefault, true)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Criar novo
  const result = await db.insert(formTemplates).values({
    ...templateData,
    tenantId: tenantId
  }).returning();
  
  return result[0];
}

/**
 * Clone a form from a template
 */
export async function cloneFormFromTemplate(
  tenantId: string,
  templateId: string,
  formData: { title: string; description?: string; passingScore?: number; }
): Promise<any> {
  // Buscar template
  const template = await db.select()
    .from(formTemplates)
    .where(and(
      eq(formTemplates.id, templateId),
      eq(formTemplates.tenantId, tenantId)
    ))
    .limit(1);
  
  if (template.length === 0) {
    throw new Error("Template not found or access denied");
  }
  
  // Criar form
  const newForm = {
    title: formData.title,
    description: formData.description || template[0].description,
    questions: template[0].questions,
    designConfig: template[0].designConfig,
    passingScore: formData.passingScore || 0,
    tenantId: tenantId
  };
  
  const result = await db.insert(forms).values(newForm).returning();
  return result[0];
}
```

### 7.2 Template Seeder Proposto para Reuniões

```typescript
// PROPOSTA: server/reunioes/services/templateSeeder.ts

import { db } from "../db.js";
import { meetingTemplates, meetings } from "../../../shared/db-schema.js";
import { STANDARD_BOOKING_FIELDS, DEFAULT_MEETING_DESIGN_CONFIG, DEFAULT_AVAILABILITY_CONFIG } from "./standardSlots.js";

/**
 * 🔐 SECURITY: Ensures a complete meeting template exists for a tenant
 */
export async function ensureCompleteMeetingTemplate(
  tenantId: string
): Promise<any> {
  if (!tenantId) {
    throw new Error("🔐 SECURITY: tenantId is required");
  }
  
  const templateData = {
    name: "Reunião de Consultoria",
    description: "Template completo para agendamento de reuniões de consultoria",
    thumbnailUrl: null,
    isDefault: true,
    duration: 30,
    designConfig: DEFAULT_MEETING_DESIGN_CONFIG,
    bookingFields: STANDARD_BOOKING_FIELDS,
    availabilityConfig: DEFAULT_AVAILABILITY_CONFIG
  };
  
  // Verificar se existe
  const existing = await db.select()
    .from(meetingTemplates)
    .where(and(
      eq(meetingTemplates.name, templateData.name),
      eq(meetingTemplates.tenantId, tenantId),
      eq(meetingTemplates.isDefault, true)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  // Criar novo
  const result = await db.insert(meetingTemplates).values({
    ...templateData,
    tenantId: tenantId
  }).returning();
  
  return result[0];
}

/**
 * Clone a meeting from a template
 */
export async function cloneMeetingFromTemplate(
  tenantId: string,
  templateId: string,
  meetingData: { title: string; description?: string; duration?: number; }
): Promise<any> {
  // Buscar template
  const template = await db.select()
    .from(meetingTemplates)
    .where(and(
      eq(meetingTemplates.id, templateId),
      eq(meetingTemplates.tenantId, tenantId)
    ))
    .limit(1);
  
  if (template.length === 0) {
    throw new Error("Template not found or access denied");
  }
  
  // Criar meeting
  const newMeeting = {
    title: meetingData.title,
    description: meetingData.description || template[0].description,
    duration: meetingData.duration || template[0].duration,
    bookingFields: template[0].bookingFields,
    designConfig: template[0].designConfig,
    availabilityConfig: template[0].availabilityConfig,
    tenantId: tenantId
  };
  
  const result = await db.insert(meetings).values(newMeeting).returning();
  return result[0];
}
```

---

## 8. Campos Padrão

### 8.1 Campos Padrão de Formulários

```typescript
// server/formularios/services/standardFields.ts

export interface QuestionField {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  fieldType?: string;
  validation?: {
    type?: string;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: string[];
  score?: number;
}

/**
 * 11 campos padrão para cadastro completo
 */
export const STANDARD_REGISTRATION_FIELDS: QuestionField[] = [
  {
    id: "cpf_cnpj",
    type: "short_text",
    title: "CPF/CNPJ",
    description: "Informe seu CPF ou CNPJ",
    required: true,
    fieldType: "cpf_cnpj",
    validation: { type: "cpf_cnpj" },
    score: 0
  },
  {
    id: "nome_razao_social",
    type: "short_text",
    title: "Nome/Razão Social",
    description: "Nome completo ou razão social da empresa",
    required: true,
    validation: { minLength: 3, maxLength: 200 },
    score: 0
  },
  {
    id: "data_nascimento",
    type: "date",
    title: "Data de nascimento",
    required: false,
    score: 0
  },
  {
    id: "email",
    type: "email",
    title: "E-mail",
    description: "Seu melhor e-mail para contato",
    required: true,
    validation: { type: "email" },
    score: 0
  },
  {
    id: "contato",
    type: "phone_number",
    title: "Contato",
    description: "Telefone ou WhatsApp para contato",
    required: true,
    validation: { type: "phone" },
    score: 0
  },
  {
    id: "endereco",
    type: "short_text",
    title: "Endereço",
    required: false,
    validation: { maxLength: 200 },
    score: 0
  },
  {
    id: "numero",
    type: "short_text",
    title: "Número",
    required: false,
    validation: { maxLength: 20 },
    score: 0
  },
  {
    id: "bairro",
    type: "short_text",
    title: "Bairro",
    required: false,
    validation: { maxLength: 100 },
    score: 0
  },
  {
    id: "cidade",
    type: "short_text",
    title: "Cidade",
    description: "Cidade - UF (ex: São Paulo - SP)",
    required: false,
    validation: { maxLength: 100 },
    score: 0
  },
  {
    id: "cep",
    type: "short_text",
    title: "CEP",
    required: false,
    fieldType: "cep",
    validation: { type: "cep", pattern: "^[0-9]{5}-?[0-9]{3}$" },
    score: 0
  },
  {
    id: "redes_sociais",
    type: "short_text",
    title: "Redes sociais / Instagram",
    required: false,
    validation: { type: "url", maxLength: 200 },
    score: 0
  }
];

/**
 * Design config padrão
 */
export const DEFAULT_REGISTRATION_DESIGN_CONFIG = {
  colors: {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(210, 40%, 96%)",
    background: "hsl(0, 0%, 100%)",
    text: "hsl(222, 47%, 11%)"
  },
  typography: {
    fontFamily: "Inter",
    titleSize: "2xl",
    textSize: "base"
  },
  spacing: "comfortable"
};
```

### 8.2 Campos Padrão Propostos para Reuniões

```typescript
// PROPOSTA: server/reunioes/services/standardSlots.ts

export interface BookingField {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  fieldType?: string;
  validation?: {
    type?: string;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[];
}

/**
 * Campos padrão para agendamento
 */
export const STANDARD_BOOKING_FIELDS: BookingField[] = [
  {
    id: "nome",
    type: "short_text",
    title: "Nome completo",
    description: "Como você gostaria de ser chamado(a)?",
    required: true,
    validation: { minLength: 3, maxLength: 100 }
  },
  {
    id: "email",
    type: "email",
    title: "E-mail",
    description: "Enviaremos a confirmação para este e-mail",
    required: true,
    validation: { type: "email" }
  },
  {
    id: "telefone",
    type: "phone_number",
    title: "WhatsApp",
    description: "Telefone com DDD para contato",
    required: true,
    validation: { type: "phone" }
  },
  {
    id: "motivo",
    type: "textarea",
    title: "Motivo da reunião",
    description: "Descreva brevemente o assunto que deseja tratar",
    required: false,
    validation: { maxLength: 500 }
  }
];

/**
 * Configuração de disponibilidade padrão
 */
export const DEFAULT_AVAILABILITY_CONFIG = {
  weekdays: [1, 2, 3, 4, 5], // Segunda a Sexta
  timeSlots: [
    { start: "09:00", end: "12:00" },
    { start: "14:00", end: "18:00" }
  ],
  timezone: "America/Sao_Paulo",
  exceptions: []
};

/**
 * Design config padrão para reuniões
 */
export const DEFAULT_MEETING_DESIGN_CONFIG = {
  colors: {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(210, 40%, 96%)",
    background: "hsl(0, 0%, 100%)",
    text: "hsl(222, 47%, 11%)"
  },
  typography: {
    fontFamily: "Inter",
    titleSize: "2xl",
    textSize: "base"
  },
  spacing: "comfortable"
};

/**
 * Horários padrão disponíveis
 */
export const DEFAULT_TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"
];

/**
 * Durações padrão de reuniões
 */
export const DEFAULT_DURATIONS = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1 hora e 30 minutos" },
  { value: 120, label: "2 horas" }
];
```

---

## 9. Sistema de Slugs (URLs Amigáveis)

### 9.1 Gerador de Slugs (Formulários)

```typescript
// server/formularios/utils/slugGenerator.ts

/**
 * Gera um slug seguro para URL a partir do nome da empresa
 * 
 * Exemplos:
 * - "Sua Empresa" → "sua-empresa"
 * - "Café & Companhia" → "cafe-companhia"
 * - "Açaí do João" → "acai-do-joao"
 */
export function generateCompanySlug(companyName: string): string {
  if (!companyName || companyName.trim() === '') {
    return 'empresa';
  }

  return companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'empresa';
}

/**
 * Gera um slug seguro para URL a partir do título do formulário
 * 
 * Exemplos:
 * - "Cadastro de Clientes" → "cadastro-de-clientes"
 * - "Pesquisa de Satisfação 2024" → "pesquisa-de-satisfacao-2024"
 */
export function generateFormSlug(title: string): string {
  if (!title || title.trim() === '') {
    return 'formulario';
  }

  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'formulario';
}

/**
 * Gera um slug único adicionando sufixo numérico se necessário
 */
export function generateUniqueFormSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Valida se um slug é seguro para URL
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim() === '') {
    return false;
  }
  
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Sanitiza um slug para garantir que seja seguro para URL
 */
export function sanitizeSlug(slug: string): string {
  if (isValidSlug(slug)) {
    return slug;
  }
  
  return generateFormSlug(slug);
}
```

### 9.2 Gerador de Slugs para Reuniões (Mesma estrutura)

```typescript
// PROPOSTA: server/reunioes/utils/slugGenerator.ts

// Usar a mesma implementação do formulários
// Apenas renomear funções para clareza:

export function generateMeetingSlug(title: string): string {
  if (!title || title.trim() === '') {
    return 'reuniao';
  }

  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'reuniao';
}

export function generateUniqueMeetingSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

// Reutilizar generateCompanySlug, isValidSlug, sanitizeSlug
```

---

## 10. Design Config (Personalização Visual)

### 10.1 Estrutura do Design Config

```typescript
// Interface usada em formulários e reuniões

interface DesignConfig {
  colors: {
    primary: string;      // Cor principal (HSL)
    secondary: string;    // Cor secundária
    background: string;   // Cor de fundo
    text: string;         // Cor do texto
    button?: string;      // Cor do botão
    buttonText?: string;  // Cor do texto do botão
  };
  typography: {
    fontFamily: string;   // Família de fonte
    titleSize: string;    // Tamanho do título
    textSize: string;     // Tamanho do texto
  };
  logo?: string;          // URL do logo
  logoAlignment?: 'left' | 'center' | 'right';
  logoSize?: number;
  spacing: 'compact' | 'comfortable' | 'spacious';
  
  // Específico para welcome screen
  welcomeScreen?: {
    buttonText: string;
  };
  
  // Específico para completion page
  completionPage?: {
    title: string;
    subtitle: string;
    showScore: boolean;
    showTierBadge: boolean;
    successMessage: string;
    failureMessage: string;
    design: {
      colors: {
        successIcon: string;
        failureIcon: string;
      };
    };
  };
}
```

### 10.2 Design Config Default

```typescript
export const DEFAULT_DESIGN_CONFIG = {
  colors: {
    primary: "hsl(221, 83%, 53%)",
    secondary: "hsl(210, 40%, 96%)",
    background: "hsl(0, 0%, 100%)",
    text: "hsl(222, 47%, 11%)",
    button: "hsl(221, 19%, 16%)",
    buttonText: "hsl(0, 0%, 100%)"
  },
  typography: {
    fontFamily: "Inter",
    titleSize: "2xl",
    textSize: "base"
  },
  logo: null,
  logoAlignment: "center",
  spacing: "comfortable"
};
```

---

## 11. Páginas de Conclusão

### 11.1 Estrutura Completion Page (Formulários)

```typescript
interface CompletionPage {
  id: string;
  tenantId: string;
  name: string;
  title: string;           // "Obrigado!"
  subtitle?: string;
  successMessage: string;  // Mensagem quando passa
  failureMessage: string;  // Mensagem quando não passa
  showScore: boolean;
  showTierBadge: boolean;
  logo?: string;
  logoAlign: 'left' | 'center' | 'right';
  successIconColor: string;
  failureIconColor: string;
  successIconImage?: string;
  failureIconImage?: string;
  successIconType: string; // "check-circle"
  failureIconType: string; // "x-circle"
  ctaText?: string;        // Texto do botão
  ctaUrl?: string;         // URL do botão
  customContent?: string;
  designConfig: DesignConfig;
}
```

### 11.2 Estrutura Confirmation Page (Reuniões)

```typescript
interface MeetingConfirmationPage {
  id: string;
  tenantId: string;
  name: string;
  title: string;              // "Reunião Agendada!"
  subtitle?: string;
  confirmationMessage: string;
  
  // Exibição de detalhes
  showDateTime: boolean;
  showLocation: boolean;
  showAddToCalendar: boolean;
  
  // Design
  logo?: string;
  logoAlign: 'left' | 'center' | 'right';
  iconColor: string;
  iconImage?: string;
  iconType: string;           // "calendar-check"
  
  // CTA
  ctaText?: string;
  ctaUrl?: string;
  customContent?: string;
  
  designConfig: DesignConfig;
}
```

---

## 12. Sincronização com Supabase

### 12.1 Cliente Dinâmico

```typescript
// server/formularios/utils/supabaseClient.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export async function getDynamicSupabaseClient(
  url?: string, 
  key?: string
): Promise<SupabaseClient | null> {
  // Prioridade 1: Headers da requisição
  if (url && key) {
    return createClient(url, key);
  }
  
  // Prioridade 2: Buscar do banco por tenant
  // (implementado via getSupabaseClient no formularios-complete.ts)
  
  return null; // Usar PostgreSQL local
}
```

### 12.2 Conversão de Dados

```typescript
// server/formularios/utils/caseConverter.ts

// snake_case (Supabase) ↔ camelCase (Frontend)
export function convertKeysToCamelCase(obj: any): any {
  // design_config → designConfig
  // created_at → createdAt
}

export function convertKeysToSnakeCase(obj: any): any {
  // designConfig → design_config
  // createdAt → created_at
}

// Parse JSONB strings
export function parseJsonbFields(obj: any, fields: string[]): any {
  for (const field of fields) {
    if (typeof obj[field] === 'string') {
      obj[field] = JSON.parse(obj[field]);
    }
  }
  return obj;
}
```

---

## 13. Sistema de Leads

### 13.1 Sincronização Submission → Lead

```typescript
// server/formularios/services/leadSync.ts

function getPipelineStatus(formStatus: string, qualificationStatus: string): string {
  if (qualificationStatus === 'approved') return 'formulario-aprovado';
  if (qualificationStatus === 'rejected') return 'formulario-reprovado';
  
  switch (formStatus) {
    case 'not_sent': return 'contato-inicial';
    case 'sent': return 'formulario-enviado';
    case 'opened': return 'formulario-aberto';
    case 'started': return 'formulario-incompleto';
    case 'completed': return 'formulario-completo';
    default: return 'contato-inicial';
  }
}
```

### 13.2 Sincronização Booking → Lead (Proposta)

```typescript
// PROPOSTA: server/reunioes/services/meetingSync.ts

function getMeetingPipelineStatus(meetingStatus: string): string {
  switch (meetingStatus) {
    case 'pending': return 'reuniao-pendente';
    case 'confirmed': return 'reuniao-confirmada';
    case 'cancelled': return 'reuniao-cancelada';
    case 'completed': return 'reuniao-concluida';
    case 'no_show': return 'reuniao-nao-compareceu';
    default: return 'reuniao-pendente';
  }
}

async function syncBookingToLead(booking: MeetingBooking): Promise<void> {
  // 1. Normalizar telefone
  const telefoneNormalizado = normalizePhone(booking.contactPhone);
  
  // 2. Buscar lead existente
  let lead = await db.select()
    .from(leads)
    .where(eq(leads.telefoneNormalizado, telefoneNormalizado))
    .limit(1);
  
  // 3. Criar ou atualizar
  if (lead.length === 0) {
    await db.insert(leads).values({
      telefone: booking.contactPhone,
      telefoneNormalizado,
      nome: booking.contactName,
      email: booking.contactEmail,
      tenantId: booking.tenantId,
      meetingId: booking.id,
      meetingStatus: booking.status,
      meetingScheduledAt: booking.scheduledDateTime,
      pipelineStatus: getMeetingPipelineStatus(booking.status)
    });
  } else {
    await db.update(leads)
      .set({
        meetingId: booking.id,
        meetingStatus: booking.status,
        meetingScheduledAt: booking.scheduledDateTime,
        pipelineStatus: getMeetingPipelineStatus(booking.status),
        updatedAt: new Date()
      })
      .where(eq(leads.id, lead[0].id));
  }
}
```

---

## 14. Multi-Tenant Security

### 14.1 Isolamento de Dados

```typescript
// SEMPRE filtrar por tenant_id em queries
const forms = await db
  .select()
  .from(forms)
  .where(eq(forms.tenantId, session.tenantId));

// SEMPRE inserir tenant_id
await db.insert(forms).values({
  ...formData,
  tenantId: session.tenantId // 🔐 CRÍTICO
});
```

### 14.2 Acesso Público Seguro

```typescript
// Verificar se é público
if (!form.isPublic) {
  // Verificar se é o owner
  if (sessionTenantId !== form.tenantId) {
    return res.status(404).json({ error: 'Form not found' });
  }
}

// Detectar colisões de slug entre tenants
const allMatches = await db.select()
  .from(formTenantMapping)
  .where(eq(formTenantMapping.slug, formIdOrSlug));

if (allMatches.length > 1) {
  console.warn('Multiple tenants have same slug - refusing access');
  return res.status(404).json({ error: 'Form not found' });
}
```

---

## 15. Automações e Pollers

### 15.1 FormPoller (Formulários)

```typescript
// Intervalo: 2 minutos
// Função: Sincronizar form_submissions do Supabase

async function pollFormSubmissions() {
  const submissions = await supabase
    .from('form_submissions')
    .select('*')
    .gt('created_at', lastPollTime);
  
  for (const submission of submissions) {
    await syncSubmissionToLead(submission);
  }
}
```

### 15.2 MeetingPoller (Proposta)

```typescript
// PROPOSTA: Intervalo: 5 minutos
// Função: Sincronizar meeting_bookings e enviar lembretes

async function pollMeetingBookings() {
  // 1. Sincronizar novos agendamentos
  const bookings = await db.select()
    .from(meetingBookings)
    .where(gt(meetingBookings.createdAt, lastPollTime));
  
  for (const booking of bookings) {
    await syncBookingToLead(booking);
  }
  
  // 2. Verificar lembretes pendentes
  const upcomingMeetings = await db.select()
    .from(meetingBookings)
    .where(and(
      eq(meetingBookings.status, 'confirmed'),
      between(meetingBookings.scheduledDateTime, now(), addHours(now(), 24))
    ));
  
  for (const meeting of upcomingMeetings) {
    await sendMeetingReminder(meeting);
  }
}
```

---

## 16. Adaptação para Reuniões

### 16.1 Resumo das Mudanças Necessárias

| Componente Formulários | Componente Reuniões | Mudanças |
|------------------------|---------------------|----------|
| `forms` table | `meetings` table | + duration, availability, location |
| `form_submissions` | `meeting_bookings` | + scheduledDateTime, status, reminders |
| `form_templates` | `meeting_templates` | + availabilityConfig |
| `completion_pages` | `confirmation_pages` | + showAddToCalendar |
| `form_tenant_mapping` | `meeting_tenant_mapping` | Mesma estrutura |
| `formularioStore` | `reuniaoStore` | + agendamentos |
| `standardFields.ts` | `standardSlots.ts` | + disponibilidade |
| `leadSync.ts` | `meetingSync.ts` | + meetingStatus |
| `FormPoller` | `MeetingPoller` | + lembretes |

### 16.2 Fluxo de Criação de Reunião

1. **Usuário acessa o Editor** → `/reunioes/editor`
2. **Cria nova reunião** → `POST /api/meetings`
3. **Configura disponibilidade** → Dias/horários
4. **Configura campos** → Formulário de agendamento
5. **Configura design** → Cores, logo, tipografia
6. **Define localização** → Google Meet, Zoom, etc.
7. **Salva reunião** → `PATCH /api/meetings/:id`
8. **Publica** → Define `isPublic: true`

### 16.3 Fluxo de Agendamento

1. **Cliente acessa URL pública** → `/reuniao/{company}/{slug}`
2. **Seleciona data** → Calendário exibe dias disponíveis
3. **Seleciona horário** → Lista slots disponíveis
4. **Preenche dados** → Formulário de agendamento
5. **Confirma** → `POST /api/bookings`
6. **Recebe confirmação** → Página de confirmação + email
7. **Lead é criado/atualizado** → Pipeline atualizado

---

## 📌 Arquivos Críticos para Replicar

| Original (Formulários) | Novo (Reuniões) | Prioridade |
|------------------------|-----------------|------------|
| `shared/db-schema.ts` | Adicionar tabelas meetings | 1 |
| `server/formularios/storage.ts` | `server/reunioes/storage.ts` | 2 |
| `server/routes/formularios-complete.ts` | `server/routes/reunioes-complete.ts` | 3 |
| `server/formularios/services/standardFields.ts` | `server/reunioes/services/standardSlots.ts` | 4 |
| `server/formularios/services/templateSeeder.ts` | `server/reunioes/services/templateSeeder.ts` | 5 |
| `server/formularios/services/leadSync.ts` | `server/reunioes/services/meetingSync.ts` | 6 |
| `server/formularios/utils/slugGenerator.ts` | `server/reunioes/utils/slugGenerator.ts` | 7 |
| `src/types/formulario.ts` | `src/types/reuniao.ts` | 8 |
| `src/stores/formularioStore.ts` | `src/stores/reuniaoStore.ts` | 9 |

---

> **NOTA**: Este documento foi criado para servir como referência completa na criação do sistema de reuniões. Toda a estrutura, código e padrões foram preservados do sistema de formulários original.
