# Sistema de Formulários - Documentação Completa

> **IMPORTANTE**: Esta documentação é exaustiva e contém TODAS as informações necessárias para reconstruir e entender o sistema de formulários sem depender do histórico de chat. Ela garante a preservação completa do conhecimento sobre o sistema.

> **ÚLTIMA ATUALIZAÇÃO**: Dezembro 2025 - Documentação da correção do bug de paginação de formulários

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Schema do Banco de Dados](#3-schema-do-banco-de-dados)
4. [API Endpoints](#4-api-endpoints)
5. [Fluxo de Criação de Formulários](#5-fluxo-de-criação-de-formulários)
6. [Fluxo de Preenchimento e Submissão](#6-fluxo-de-preenchimento-e-submissão)
7. [Sincronização com Supabase](#7-sincronização-com-supabase)
8. [Sistema de Leads](#8-sistema-de-leads)
9. [Exportação e Visualização](#9-exportação-e-visualização)
10. [Multi-Tenant Security](#10-multi-tenant-security)
11. [Configuração e Setup](#11-configuração-e-setup)
12. [Troubleshooting](#12-troubleshooting)
13. [CRÍTICO: Sistema de Paginação de Formulários](#13-crítico-sistema-de-paginação-de-formulários)

---

## 1. Visão Geral

O sistema de formulários é uma plataforma completa para:

- **Criação** de formulários personalizáveis com editor visual
- **Preenchimento** público por leads/clientes
- **Armazenamento** dual (PostgreSQL local + Supabase opcional)
- **Qualificação** automática baseada em pontuação
- **Sincronização** em tempo real entre sistemas
- **Visualização** de todas as respostas e estatísticas

### Tecnologias Utilizadas

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express.js + TypeScript |
| ORM | Drizzle ORM |
| Database Principal | PostgreSQL (Replit) |
| Database Secundário | Supabase (opcional) |
| State Management | Zustand |
| UI Components | Radix UI + Tailwind CSS |

---

## 2. Arquitetura do Sistema

### 2.1 Estrutura de Diretórios

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
│   ├── features/formularios-platform/
│   │   ├── components/
│   │   │   └── SimplifiedFormWizard.tsx   # Editor de formulários
│   │   ├── pages/
│   │   │   ├── EditarFormulario.tsx       # Página de edição
│   │   │   ├── PublicForm.tsx             # Formulário público (react-router)
│   │   │   ├── FormularioPublico.tsx      # Formulário público (wouter)
│   │   │   └── TrackedPublicForm.tsx      # Formulário com tracking
│   │   └── types/
│   │       └── form.ts                    # Tipos TypeScript
│   ├── stores/
│   │   └── formularioStore.ts    # Estado global Zustand
│   └── types/
│       └── formulario.ts         # Tipos TypeScript
```

### 2.2 Fluxo de Dados

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

## 3. Schema do Banco de Dados

> **NOTA TÉCNICA:** O sistema possui dois arquivos de schema:
> - `shared/db-schema.ts` - Schema principal usado em produção (com slug, multi-tenant)
> - `shared/formularios/schema.ts` - Schema simplificado (backup/referência)
> 
> O storage (`server/formularios/storage.ts`) importa de `db-schema.ts`.

### 3.1 Tabela `forms` (Formulários)

```typescript
// shared/db-schema.ts (SCHEMA PRINCIPAL)
export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug"),
  description: text("description"),
  welcomeTitle: text("welcome_title"),
  welcomeMessage: text("welcome_message"),
  welcomeConfig: jsonb("welcome_config"),
  questions: jsonb("questions").notNull(),      // IMPORTANTE: elementos são salvos aqui!
  elements: jsonb("elements"),                   // Coluna legada (geralmente vazia)
  passingScore: integer("passing_score").notNull().default(0),
  scoreTiers: jsonb("score_tiers"),
  designConfig: jsonb("design_config").default(sql`'{...}'::jsonb`),
  completionPageId: uuid("completion_page_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  tenantId: text("tenant_id").notNull(),
  isPublic: boolean("is_public").default(false),
});
```

### 3.2 CRÍTICO: Estrutura de Dados de Perguntas

O sistema suporta **DOIS FORMATOS** de dados no campo `questions`:

#### Formato Legado (Antigo)

```typescript
// Usado em formulários criados antes da atualização do editor
// Tipos: 'text', 'radio', 'checkbox', 'select', 'multiple-choice', 'textarea'
interface LegacyQuestion {
  id: string;
  type: 'text' | 'radio' | 'checkbox' | 'select' | 'multiple-choice' | 'textarea';
  text: string;                    // Texto da pergunta
  options?: string[];              // Opções para radio/checkbox/select
  points?: number;                 // Pontuação
  required?: boolean;              // Se é obrigatória
}

// Exemplo de dados legados no banco:
[
  { "id": "q1", "type": "radio", "text": "Qual sua idade?", "options": ["18-25", "26-35", "36+"] },
  { "id": "q2", "type": "text", "text": "Seu nome?" }
]
```

#### Formato Moderno (Novo)

```typescript
// Usado em formulários criados/editados com o novo editor
// Tipos de elementos: 'question', 'heading', 'text', 'pageBreak'
type FormElement = QuestionElement | HeadingElement | TextElement | PageBreakElement;

interface QuestionElement {
  type: 'question';
  id: string;
  text: string;
  questionType: 'text' | 'multiple-choice';   // NOTA: Tipos normalizados!
  options?: QuestionOption[];
  points?: number;
  required?: boolean;
  elementTypeVersion: number;
}

interface PageBreakElement {
  type: 'pageBreak';
  id: string;
  elementTypeVersion: number;
}

// Exemplo de dados modernos no banco:
[
  { "type": "heading", "id": "h1", "text": "Bem-vindo!" },
  { "type": "text", "id": "t1", "content": "Preencha o formulário" },
  { "type": "pageBreak", "id": "pb1" },
  { "type": "question", "id": "q1", "questionType": "multiple-choice", "text": "Qual sua idade?" },
  { "type": "pageBreak", "id": "pb2" },
  { "type": "question", "id": "q2", "questionType": "text", "text": "Seu nome?" }
]
```

---

## 13. CRÍTICO: Sistema de Paginação de Formulários

### 13.1 O Problema Histórico

**Bug anterior:** Formulários com perguntas criadas mostravam todas as perguntas na mesma página, ou mostravam mais perguntas do que o esperado.

**Causa raiz:** A função `groupQuestionsByPages` não reconhecia tipos legados de perguntas como `radio`, `checkbox`, `select`, e `textarea`.

### 13.2 Arquivos Críticos (NÃO MODIFICAR SEM ENTENDER)

Os 3 arquivos abaixo contêm a função `groupQuestionsByPages` que DEVE estar sincronizada:

1. **`src/features/formularios-platform/pages/PublicForm.tsx`** (linhas 21-108)
2. **`src/features/formularios-platform/pages/FormularioPublico.tsx`** (linhas 30-115)
3. **`src/features/formularios-platform/pages/TrackedPublicForm.tsx`** (linhas 19-104)

### 13.3 Código CORRETO da Função `groupQuestionsByPages`

```typescript
interface QuestionPage {
  questions: any[];
}

function groupQuestionsByPages(form: Form): QuestionPage[] {
  // Priority: form.questions (onde elementos são salvos via API) > form.elements (coluna legada)
  const formData = (form.questions as any[] | null) || (form.elements as any[] | null);
  
  if (!formData || formData.length === 0) {
    return [];
  }
  
  // Verifica se está no formato moderno (tem type: 'question' com questionType)
  // ou formato legado (tem type: 'text'/'multiple-choice'/'radio' diretamente)
  const isNewFormat = formData.some((item: any) => {
    if (!item.type) return false;
    // Indicadores de formato moderno:
    if (item.type === 'question' && 'questionType' in item) return true;
    if (item.type === 'heading' || item.type === 'pageBreak' || item.type === 'text') return true;
    return false;
  });
  
  if (!isNewFormat) {
    // FORMATO LEGADO: cada pergunta na sua própria página (1 pergunta = 1 página)
    // IMPORTANTE: Incluir TODOS os tipos legados!
    const legacyTypes = ['text', 'multiple-choice', 'radio', 'checkbox', 'select', 'textarea'];
    const questions = formData.filter((q: any) => q.text && (legacyTypes.includes(q.type) || q.questionType));
    
    if (questions.length > 0) {
      return questions.map((q: any) => {
        // Normalizar tipos legados para questionType padrão
        let normalizedType = q.type || q.questionType;
        if (normalizedType === 'radio' || normalizedType === 'select' || normalizedType === 'checkbox') {
          normalizedType = 'multiple-choice';
        }
        return {
          questions: [{
            id: q.id,
            text: q.text,
            questionType: normalizedType,
            type: normalizedType,
            options: q.options,
            points: q.points || 0,
            required: q.required || false
          }]
        };
      });
    }
    return [];
  }
  
  // FORMATO MODERNO: usar pageBreaks para dividir páginas
  const pages: QuestionPage[] = [];
  let currentPageQuestions: any[] = [];
  let foundFirstQuestion = false;
  let lastWasPageBreak = false;
  
  for (const element of formData) {
    if (element.type === 'question') {
      foundFirstQuestion = true;
      lastWasPageBreak = false;
      currentPageQuestions.push({
        id: element.id,
        text: element.text,
        questionType: element.questionType,
        type: element.questionType,
        options: element.options,
        points: element.points || 0,
        required: element.required || false
      });
    } else if (element.type === 'pageBreak') {
      // Só criar página se:
      // 1. Já encontrou pelo menos uma pergunta
      // 2. Página atual tem perguntas
      // 3. Não é pageBreak duplicado/consecutivo
      if (foundFirstQuestion && currentPageQuestions.length > 0 && !lastWasPageBreak) {
        pages.push({ questions: currentPageQuestions });
        currentPageQuestions = [];
      }
      lastWasPageBreak = true;
    }
    // Ignorar outros tipos (heading, text) para paginação
  }
  
  // Não esquecer a última página
  if (currentPageQuestions.length > 0) {
    pages.push({ questions: currentPageQuestions });
  }
  
  return pages;
}
```

### 13.4 Regras de Negócio CRÍTICAS

| Regra | Descrição |
|-------|-----------|
| **1 pergunta = 1 página** | No formato legado, cada pergunta aparece em sua própria página |
| **pageBreak divide páginas** | No formato moderno, elementos `pageBreak` controlam a paginação |
| **Tipos legados** | `radio`, `checkbox`, `select`, `textarea`, `text`, `multiple-choice` |
| **Tipos modernos** | `question` (com `questionType`), `heading`, `text`, `pageBreak` |
| **Prioridade de leitura** | `form.questions` primeiro, depois `form.elements` |
| **Normalização de tipos** | `radio`, `select`, `checkbox` → `multiple-choice` |

### 13.5 Fluxo de Conversão no Editor

Quando um formulário legado é carregado no editor (`EditarFormulario.tsx`):

```typescript
// EditarFormulario.tsx - linhas 102-194
useEffect(() => {
  if (form) {
    const formQuestions = form.questions as any[];
    if (formQuestions && formQuestions.length > 0) {
      // Detectar formato
      const isNewFormat = formQuestions.some((item: any) => {
        if (!item.type) return false;
        if (item.type === 'question' && 'questionType' in item) return true;
        if (item.type === 'heading' || item.type === 'pageBreak') return true;
        if (item.type === 'text' && 'content' in item) return true;
        return false;
      });
      
      if (isNewFormat) {
        // Já é formato moderno - usar diretamente
        setElements(formQuestions as FormElement[]);
      } else {
        // CONVERSÃO: Formato legado → Formato moderno
        const convertedElements: FormElement[] = [];
        
        // 1. Adicionar elementos da página de boas-vindas
        convertedElements.push({ type: 'heading', id: 'welcome-heading', text: welcomeTitle });
        convertedElements.push({ type: 'text', id: 'welcome-text', content: welcomeDesc });
        convertedElements.push({ type: 'pageBreak', id: 'pagebreak-welcome' });
        
        // 2. Adicionar cada pergunta com pageBreaks entre elas
        formQuestions.forEach((q: any, index: number) => {
          // Normalizar tipo
          let questionType = q.type;
          if (['radio', 'select', 'checkbox'].includes(questionType)) {
            questionType = 'multiple-choice';
          }
          
          convertedElements.push({
            type: 'question',
            id: q.id,
            text: q.text,
            questionType: questionType,
            options: q.options,
            points: q.points,
            required: q.required || false
          });
          
          // PageBreak após cada pergunta (exceto última)
          if (index < formQuestions.length - 1) {
            convertedElements.push({ type: 'pageBreak', id: `pagebreak-after-${q.id}` });
          }
        });
        
        setElements(convertedElements);
      }
    }
  }
}, [form]);
```

### 13.6 Onde os Dados São Salvos

**CRÍTICO:** O editor salva elementos em `form.questions`, NÃO em `form.elements`!

```typescript
// EditarFormulario.tsx - handleUpdateForm (linha 219+)
const handleUpdateForm = () => {
  const formData = {
    title,
    description,
    welcomeConfig: { ... },
    // IMPORTANTE: elementos são enviados como 'questions'!
    questions: elements,  // Send as 'questions' for backend API compatibility
    passingScore,
    scoreTiers,
    designConfig,
    completionPageConfig
  };
  updateMutation.mutate(formData);
};
```

### 13.7 Checklist de Verificação

Antes de fazer qualquer mudança no sistema de formulários:

- [ ] Verificar se os 3 arquivos públicos (`PublicForm.tsx`, `FormularioPublico.tsx`, `TrackedPublicForm.tsx`) têm a mesma lógica `groupQuestionsByPages`
- [ ] Verificar se `legacyTypes` inclui: `text`, `multiple-choice`, `radio`, `checkbox`, `select`, `textarea`
- [ ] Verificar se tipos legados são normalizados para `multiple-choice`
- [ ] Verificar se cada pergunta gera uma página separada no formato legado
- [ ] Verificar se `form.questions` é lido antes de `form.elements`

---

## 4. API Endpoints

### 4.1 Formulários (CRUD)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/forms` | Listar todos os formulários do tenant | ✅ |
| GET | `/api/forms/:id` | Buscar formulário por ID | ✅ |
| GET | `/api/forms/public/:id` | Buscar formulário público (por ID ou slug) | ❌ |
| GET | `/api/forms/public/by-slug/:companySlug/:formSlug` | Buscar por slug | ❌ |
| POST | `/api/forms` | Criar novo formulário | ✅ |
| PATCH | `/api/forms/:id` | Atualizar formulário | ✅ |
| DELETE | `/api/forms/:id` | Deletar formulário | ✅ |

### 4.2 Submissões

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/submissions` | Listar todas as submissões | ✅ |
| GET | `/api/forms/:id/submissions` | Submissões de um formulário | ✅ |
| POST | `/api/submissions` | Criar submissão (responder) | ❌ |

### 4.3 Templates e Páginas de Conclusão

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/templates` | Listar templates |
| POST | `/api/templates` | Criar template |
| GET | `/api/completion-pages` | Listar páginas de conclusão |
| POST | `/api/completion-pages` | Criar página de conclusão |
| PATCH | `/api/completion-pages/:id` | Atualizar página |

### 4.4 Leads e Tracking

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/leads` | Listar todos os leads |
| GET | `/api/leads/:id` | Detalhes de um lead |
| POST | `/api/leads/track/open` | Registrar abertura de form |
| POST | `/api/leads/track/start` | Registrar início de preenchimento |
| POST | `/api/leads/track/progress` | Registrar progresso |
| POST | `/api/leads/validar-token` | Validar token de sessão |

---

## 5. Fluxo de Criação de Formulários

### 5.1 Passo a Passo

1. **Usuário acessa o Editor** → `/formularios/editor` ou `/formularios/editar/:id`
2. **Cria novo formulário** → `POST /api/forms`
3. **Adiciona campos** → Via interface do `SimplifiedFormWizard`
4. **Configura design** → Cores, logo, tipografia
5. **Define pontuação** → Scoring por pergunta
6. **Salva formulário** → `PATCH /api/forms/:id`
7. **Publica** → Define `isPublic: true`

### 5.2 Componentes do Editor

```
SimplifiedFormWizard
├── Step 1: Perguntas
│   ├── Página de Boas-vindas (título, descrição, logo)
│   └── Lista de Perguntas (drag-and-drop)
├── Step 2: Pontuação
│   ├── Pontuação mínima
│   └── Tiers de qualificação
└── Step 3: Design & Conclusão
    ├── Cores e Tipografia
    └── Página de Conclusão
```

---

## 6. Fluxo de Preenchimento e Submissão

### 6.1 URLs de Acesso Público

```
/formulario/:id                              # Por UUID
/formulario/:companySlug/form/:formSlug      # Por slugs
/formulario/tracked/:token                   # Com tracking via token
```

### 6.2 Componentes de Renderização

| Componente | Roteador | Descrição |
|------------|----------|-----------|
| `PublicForm.tsx` | react-router | Formulário básico com ID na URL |
| `FormularioPublico.tsx` | wouter | Formulário com slugs company/form |
| `TrackedPublicForm.tsx` | wouter | Formulário com tracking via token |

### 6.3 Tracking de Eventos

O sistema rastreia automaticamente:

| Evento | Endpoint | Quando |
|--------|----------|--------|
| Abertura | `/api/leads/track/open` | Formulário é carregado |
| Início | `/api/leads/track/start` | Primeiro campo preenchido |
| Progresso | `/api/leads/track/progress` | Campos são preenchidos |
| Conclusão | `POST /api/submissions` | Formulário enviado |

---

## 7. Sincronização com Supabase

### 7.1 Arquitetura Dual-Storage

O sistema suporta armazenamento dual:

1. **PostgreSQL Local (Principal)**: Sempre disponível
2. **Supabase (Opcional)**: Quando configurado pelo tenant

### 7.2 Configuração do Supabase

```typescript
// Tabela supabase_config no PostgreSQL local
export const supabaseConfig = pgTable("supabase_config", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().unique(),
  supabaseUrl: text("supabase_url").notNull(),
  supabaseAnonKey: text("supabase_anon_key").notNull(),
  supabaseBucket: text("supabase_bucket").default('receipts'),
});
```

### 7.3 Headers para Supabase

Para usar Supabase como storage, envie os headers:
```
X-Supabase-URL: https://your-project.supabase.co
X-Supabase-Key: your-anon-key
```

---

## 8. Sistema de Leads

### 8.1 Estrutura de Leads

```typescript
interface Lead {
  id: string;
  telefone: string;
  telefoneNormalizado: string;  // Único
  nome: string | null;
  email: string | null;
  
  // Status do formulário
  formStatus: 'not_sent' | 'sent' | 'opened' | 'incomplete' | 'completed';
  formularioAberto: boolean;
  formularioConcluido: boolean;
  
  // Qualificação
  pontuacao: number | null;
  statusQualificacao: 'pending' | 'approved' | 'rejected';
  
  // Referências
  formularioId: string | null;
  submissionId: string | null;
}
```

### 8.2 Sincronização Automática

Quando uma submissão é criada, o sistema automaticamente:

1. Procura lead existente pelo telefone normalizado
2. Cria ou atualiza lead com os dados da submissão
3. Atualiza status de qualificação baseado na pontuação

---

## 9. Exportação e Visualização

### 9.1 Exportação de Dados

| Formato | Endpoint | Descrição |
|---------|----------|-----------|
| CSV | `/api/export/submissions/csv` | Exportar submissões |
| Excel | `/api/export/submissions/xlsx` | Exportar submissões |
| PDF | `/api/export/submissions/pdf` | Relatório visual |

### 9.2 Dashboard de Estatísticas

- Total de submissões
- Taxa de aprovação
- Pontuação média
- Gráfico de submissões por dia

---

## 10. Multi-Tenant Security

### 10.1 Isolamento de Dados

Cada tenant tem acesso apenas aos seus próprios dados:

- Formulários
- Submissões
- Leads
- Configurações

### 10.2 Mapeamento de Formulários Públicos

```typescript
// form_tenant_mapping permite URLs públicas sem expor tenant_id
export const formTenantMapping = pgTable("form_tenant_mapping", {
  formId: uuid("form_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  slug: text("slug"),
  companySlug: text("company_slug"),
  isPublic: boolean("is_public").notNull().default(false),
});
```

---

## 11. Configuração e Setup

### 11.1 Secrets Necessários

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `JWT_SECRET` | ✅ Sim | Chave para tokens JWT |
| `SESSION_SECRET` | Auto | Chave para sessões |
| `DATABASE_URL` | Auto | URL do PostgreSQL |
| `REACT_APP_SUPABASE_URL` | Opcional | URL do Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | Opcional | Chave do Supabase |

### 11.2 Comandos de Setup

```bash
# Iniciar desenvolvimento
npm run dev

# Sincronizar banco de dados
npm run db:push

# Build de produção
npm run build
npm start
```

---

## 12. Troubleshooting

### 12.1 Formulário Mostra Perguntas Erradas

**Sintoma:** Número de perguntas diferente do esperado no formulário público.

**Causa provável:** A função `groupQuestionsByPages` não está processando corretamente os tipos de perguntas.

**Solução:**
1. Verificar se `legacyTypes` inclui todos os tipos: `text`, `multiple-choice`, `radio`, `checkbox`, `select`, `textarea`
2. Verificar se os 3 arquivos públicos estão sincronizados
3. Verificar se `form.questions` é lido (não `form.elements`)

### 12.2 Perguntas Aparecem Todas na Mesma Página

**Sintoma:** Todas as perguntas aparecem juntas em vez de paginadas.

**Causa provável:** A função retorna `[{ questions: allQuestions }]` em vez de `questions.map(q => ({ questions: [q] }))`.

**Solução:** Garantir que no formato legado, cada pergunta gera sua própria página:
```typescript
return questions.map(q => ({ questions: [q] }));  // CORRETO
// NÃO: return [{ questions: questions }];        // ERRADO
```

### 12.3 Formulário Não Salva

**Sintoma:** Alterações no editor não aparecem no formulário público.

**Verificar:**
1. Network tab - verificar se PATCH retorna 200
2. Verificar se `questions` está sendo enviado (não `elements`)
3. Verificar console por erros

### 12.4 Labels do WhatsApp Não Aparecem

```bash
# Recriar labels padrão
npm run db:push
# O sistema cria automaticamente as 9 labels no startup
```

---

## Changelog

### Dezembro 2025

- **FIX:** Corrigido bug de paginação onde tipos legados (`radio`, `checkbox`, `select`, `textarea`) não eram reconhecidos
- **FIX:** Corrigido bug onde todas as perguntas apareciam na mesma página
- **DOC:** Adicionada seção 13 com documentação detalhada do sistema de paginação
- **DOC:** Adicionados exemplos de código para `groupQuestionsByPages`

---

## Arquivos Críticos para Referência

| Arquivo | Função Principal |
|---------|------------------|
| `src/features/formularios-platform/pages/PublicForm.tsx` | Renderização pública (react-router) |
| `src/features/formularios-platform/pages/FormularioPublico.tsx` | Renderização pública (wouter) |
| `src/features/formularios-platform/pages/TrackedPublicForm.tsx` | Renderização com tracking |
| `src/features/formularios-platform/pages/EditarFormulario.tsx` | Carregamento e salvamento |
| `src/features/formularios-platform/components/SimplifiedFormWizard.tsx` | Editor visual |
| `server/lib/databaseSeed.ts` | Seed do formulário demo |
| `shared/db-schema.ts` | Schema do banco de dados |

---

> **NOTA FINAL:** Esta documentação deve ser atualizada sempre que houver mudanças no sistema de formulários. O histórico de chat é perdido ao exportar, então TODA informação crítica deve estar aqui.
