# ExecutiveAI Pro - Documentação Completa

## Visão Geral

ExecutiveAI Pro é uma plataforma multi-tenant para gestão de leads, formulários e compliance de CPF, com integração ao BigDataCorp para consultas de processos judiciais, dados cadastrais e presença em cobrança.

## Arquitetura

### Stack Tecnológico

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express.js + TypeScript |
| Database Local | PostgreSQL (Replit) |
| Database Cliente | Supabase (por tenant) |
| Cache Global | Supabase Master (multi-tenant) |
| Estilização | TailwindCSS + shadcn/ui |
| State Management | TanStack Query + Zustand |

### Estrutura de Diretórios

```
/
├── src/                          # Frontend React
│   ├── components/               # Componentes reutilizáveis
│   ├── features/                 # Funcionalidades por domínio
│   │   └── formularios-platform/ # Plataforma de formulários
│   ├── contexts/                 # React Contexts
│   ├── hooks/                    # Custom hooks
│   └── lib/                      # Utilitários e configurações
├── server/                       # Backend Express
│   ├── lib/                      # Bibliotecas do servidor
│   │   ├── bigdatacorpClient.ts  # Cliente BigDataCorp API
│   │   ├── supabaseMaster.ts     # Cliente Supabase Master
│   │   ├── clienteSupabase.ts    # Cliente Supabase por tenant
│   │   ├── datacorpCompliance.ts # Lógica de compliance
│   │   └── formsAutomation.ts    # Automação de formulários
│   └── routes.ts                 # Rotas da API
└── shared/                       # Código compartilhado
    └── schema.ts                 # Schema Drizzle ORM
```

## Credenciais e Secrets

### Secrets Obrigatórios

| Secret | Descrição |
|--------|-----------|
| `JWT_SECRET` | Chave para assinatura de tokens JWT |
| `SESSION_SECRET` | Chave para sessões Express |
| `TOKEN_ID` | ID do token BigDataCorp |
| `CHAVE_TOKEN` | Chave de acesso BigDataCorp |
| `REACT_APP_SUPABASE_URL` | URL do Supabase do cliente |
| `REACT_APP_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_MASTER_URL` | URL do Supabase Master (cache global) |
| `SUPABASE_MASTER_SERVICE_ROLE_KEY` | Service role key do Supabase Master |

### Configuração no Replit

1. Acesse a aba "Secrets" no painel lateral
2. Adicione cada secret com seu respectivo valor
3. O servidor lê automaticamente via `process.env`

## APIs BigDataCorp

### Endpoints Implementados

#### 1. Processos Judiciais (`processes`)
- **Custo**: R$ 0,070 por consulta
- **Função**: `consultarProcessosJudiciais(cpf)`
- **Retorna**: Lista de processos, partes envolvidas, atualizações

#### 2. Dados Cadastrais (`basic_data`)
- **Custo**: R$ 0,030 por consulta
- **Função**: `consultarDadosCadastrais(cpf, nome?, dataNascimento?)`
- **Retorna**: Nome, CPF status, data nascimento, nome da mãe

#### 3. Presença em Cobrança (`collections`)
- **Custo**: R$ 0,070 por consulta
- **Função**: `consultarPresencaCobranca(cpf, dataNascimento?)`
- **Retorna**: Ocorrências de cobrança, valores, credores

#### 4. Consulta Completa
- **Custo**: R$ 0,170 por consulta (soma das 3 APIs)
- **Função**: `consultarCandidatoCompleto(cpf, nome?, dataNascimento?)`
- **Retorna**: Todas as informações consolidadas

### Rate Limiting

O cliente BigDataCorp implementa rate limiting de 2 requisições por segundo para evitar bloqueios.

## Fluxo de Automação

### 1. FormPoller
- Monitora `form_submissions` no Supabase do cliente
- Intervalo: 2 minutos
- Sincroniza novas submissions para processamento

### 2. CPFPoller
- Monitora resultados de compliance no Supabase Master
- Intervalo: 3 minutos
- Atualiza leads com status de CPF (approved/rejected)
- Sincroniza etiquetas no pipeline (cpf-aprovado/cpf-reprovado)

### 3. FormMappingSync
- Sincroniza formulários do Supabase para cache local
- Intervalo: 5 minutos
- Mapeia company_slug para tenant_id

## Rotas da API

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login com email/senha |
| POST | `/api/auth/register` | Registro de usuário |
| GET | `/api/auth/check-session` | Verificar sessão ativa |
| POST | `/api/auth/logout` | Logout |

### Formulários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/forms` | Listar formulários |
| GET | `/api/forms/:id` | Obter formulário por ID |
| GET | `/api/forms/slug/:slug` | Obter formulário por slug |
| POST | `/api/forms/:id/submit` | Submeter resposta |

### Compliance CPF

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/compliance/check` | Consultar CPF |
| GET | `/api/compliance/history` | Histórico de consultas |
| GET | `/api/compliance/check/:id` | Detalhes de consulta |

### Supabase Config

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/config/supabase/credentials` | Obter credenciais |
| POST | `/api/config/supabase/credentials` | Salvar credenciais |

## URLs do Sistema

| Rota | Descrição |
|------|-----------|
| `/` | Página de login |
| `/formulario` | Dashboard de formulários |
| `/formulario/admin/formularios` | Administração de formulários |
| `/formulario/:companySlug/form/:formSlug` | Formulário público |
| `/consultar-cpf` | Consulta manual de CPF |
| `/clientes` | Gestão de leads/clientes |
| `/kanban` | Pipeline de vendas |

## Supabase Master - Tabelas

### `datacorp_checks`
Armazena resultados de consultas BigDataCorp.

```sql
CREATE TABLE datacorp_checks (
  id UUID PRIMARY KEY,
  cpf_hash TEXT NOT NULL,
  cpf_encrypted TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  lead_id UUID,
  submission_id UUID,
  status TEXT CHECK (status IN ('approved', 'rejected', 'manual_review', 'error', 'pending')),
  risk_score INTEGER,
  payload JSONB,
  consulted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  source TEXT,
  api_cost DECIMAL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `form_submissions_compliance_tracking`
Rastreia processamento de submissions.

```sql
CREATE TABLE form_submissions_compliance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  check_id UUID REFERENCES datacorp_checks(id),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  last_attempt_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Segurança

### Práticas Implementadas

1. **CPF nunca em texto pleno**: Armazenado como hash SHA-256 + AES-256 encrypted
2. **Row Level Security (RLS)**: Habilitado no Supabase Master
3. **Service Role Key**: Nunca exposta ao frontend
4. **Validação de tenant_id**: Em todas as operações de dados
5. **Rate Limiting**: 2 req/s para BigDataCorp

### Validação de CPF

```typescript
function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '');
  
  // Verifica tamanho e dígitos repetidos
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) {
    return false;
  }
  
  // Calcula dígitos verificadores
  // ... implementação completa em server/lib/crypto.ts
}
```

## Deployment

### Workflow Configurado

```json
{
  "name": "Start application",
  "command": "npm run dev"
}
```

### Variáveis de Ambiente para Produção

Todas as secrets devem ser configuradas no ambiente de produção:
- Use a aba "Secrets" do Replit para desenvolvimento
- Para produção, configure no painel de deployment

## Troubleshooting

### Problema: Credenciais Supabase não carregam

1. Verifique se os secrets estão configurados
2. Verifique logs: `[SUPABASE-CHECK]` e `[SUPABASE-AUTO]`
3. O sistema tenta: secrets → env vars → banco de dados

### Problema: BigDataCorp retorna erro

1. Verifique `TOKEN_ID` e `CHAVE_TOKEN`
2. Verifique rate limiting (máx 2 req/s)
3. Logs disponíveis com prefixo `[bigdatacorp]`

### Problema: Formulário não carrega

1. Verifique se o formulário existe e está público
2. URL correta: `/formulario/{companySlug}/form/{formSlug}`
3. Logs: `📝 Carregando formulário por slug`

## Contato e Suporte

Para questões técnicas sobre o código, consulte:
- `replit.md` - Documentação do projeto
- Logs do servidor - Prefixos indicam módulo
- Este documento - Referência completa

---

*Última atualização: Dezembro 2025*
