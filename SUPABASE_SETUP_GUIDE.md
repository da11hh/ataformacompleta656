# Guia de Configuração do Supabase - ExecutiveAI Pro

## Configuração Rápida (Para Novas Importações)

### 1. Secrets Necessários no Replit

Configure estes secrets no painel de Secrets do Replit:

```
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 2. Iniciar o Servidor

```bash
npm run dev
```

O sistema irá automaticamente:
- Detectar os secrets do Supabase
- Sincronizar com o banco de dados PostgreSQL local
- Conectar em todas as tabelas

### 3. Verificar Conexão

Após iniciar, verifique nos logs do console:
```
✅ Supabase configurado via: secrets
✅ Credenciais descriptografadas com sucesso
```

---

## Arquitetura de Tabelas

### Tabela `app_settings` (PostgreSQL Local - Replit)
Armazena credenciais do Supabase:
- `supabase_url` - URL do projeto Supabase
- `supabase_anon_key` - Chave anônima do Supabase
- `company_name` - Nome da empresa
- `company_slug` - Slug da empresa

### Tabela `app_settings` (Supabase Externo)
Armazena configurações de formulário ativo:
- `active_form_id` - ID do formulário ativo
- `active_form_url` - URL pública do formulário

### Tabela `supabase_config` (PostgreSQL Local - Replit)
Armazena credenciais criptografadas por tenant:
- `tenant_id` - ID do tenant (multi-tenant)
- `supabase_url` - URL criptografada
- `supabase_anon_key` - Chave criptografada

---

## Tabelas do Supabase (Externo)

### Workspace
- `workspace_pages` - Páginas do workspace Notion-style
- `workspace_databases` - Databases do workspace
- `workspace_boards` - Quadros Kanban

### Formulários
- `forms` - Definições de formulários
- `form_submissions` - Respostas dos formulários

### Produto
- `products` - Produtos
- `suppliers` - Fornecedores
- `resellers` - Revendedoras
- `categories` - Categorias
- `print_queue` - Fila de impressão

### Outros
- `files` - Arquivos do faturamento
- `dashboard_completo_v5_base` - Dashboard

---

## Fluxo de Seleção de Formulário Ativo

Quando você seleciona um formulário como ativo:

1. **Rota chamada**: `POST /api/formularios/config/ativo`
2. **Arquivo**: `server/routes/formularios.ts`
3. **Tabela atualizada**: `app_settings` no **Supabase externo**
4. **Campos atualizados**:
   - `active_form_id` → ID do formulário selecionado
   - `active_form_url` → URL pública do formulário

**IMPORTANTE**: A URL do Supabase (`supabase_url`) na tabela local NÃO é afetada.

---

## Rotas Principais

- `/login` - Página de login
- `/formulario` - Plataforma de formulários (requer login)
- `/dashboard` - Dashboard principal (requer login)
- `/form/:id` - Formulário público (não requer login)
- `/:companySlug/form/:id` - Formulário público com slug

---

## Prioridade de Credenciais

O sistema busca credenciais nesta ordem:
1. Secrets do Replit (REACT_APP_SUPABASE_URL)
2. Banco de dados PostgreSQL local (supabase_config)
3. Arquivo local (data/supabase-config.json)

---

## Troubleshooting

### Erro 401 ao carregar credenciais
- Faça login primeiro (credenciais são carregadas após autenticação)

### Formulários não aparecem
- Verifique se o Supabase está configurado nos secrets
- Verifique se as tabelas existem no Supabase

### URL do formulário muda incorretamente
- Isso é comportamento esperado: `active_form_url` muda ao selecionar outro formulário
- A URL do Supabase (`supabase_url`) NÃO muda

---

## Comandos Úteis

```bash
# Iniciar servidor
npm run dev

# Sincronizar banco de dados
npm run db:push

# Testar Supabase
npm run supabase:test
```
