# Preservação Completa do Estado - ExecutiveAI Pro

## 📋 Visão Geral

Este documento garante **ZERO PERDA DE INFORMAÇÃO** ao exportar/importar o projeto entre Replits.

---

## 🔐 Secrets Obrigatórios

### 1. JWT_SECRET (OBRIGATÓRIO)

**O que é:** Chave para assinatura de tokens JWT de autenticação.

**Como gerar:**
```bash
openssl rand -base64 32
```

**Exemplo:** `K7x9mPqR2sT5vW8yZ1aB4cD6eF0gH3iJ`

---

### 2. SESSION_SECRET (Auto-gerado)

**O que é:** Chave para sessões Express.

**Comportamento:** Se não configurado, o sistema gera automaticamente.

---

## 🔐 Secrets Opcionais

### Supabase do Cliente

| Secret | Descrição | Onde Obter |
|--------|-----------|------------|
| `REACT_APP_SUPABASE_URL` | URL do projeto | Supabase → Settings → API → Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Chave anônima | Supabase → Settings → API → anon/public |

### BigDataCorp (CPF Compliance)

| Secret | Descrição |
|--------|-----------|
| `TOKEN_ID` | ID do token da API |
| `CHAVE_TOKEN` | Chave de acesso |

### Supabase Master (Cache Global)

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_MASTER_URL` | URL do projeto Master |
| `SUPABASE_MASTER_SERVICE_ROLE_KEY` | Service role key |

### Redis (Cache)

| Secret | Descrição |
|--------|-----------|
| `REDIS_URL` | URL de conexão Redis |
| `REDIS_TOKEN` | Token de autenticação (Upstash) |

### Evolution API (WhatsApp)

| Secret | Descrição |
|--------|-----------|
| `EVOLUTION_API_URL` | URL da instância Evolution |
| `EVOLUTION_API_KEY` | Chave de API |
| `EVOLUTION_INSTANCE` | Nome da instância |

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas Automaticamente (46+)

O sistema cria automaticamente as tabelas via Drizzle ORM:

#### Autenticação
- `users` - Usuários do sistema
- `tenants` - Multi-tenancy
- `sessions` - Sessões ativas

#### WhatsApp Labels
- `whatsapp_labels` - Etiquetas (9 criadas automaticamente)

**Labels Padrão:**
| Nome | Cor | Descrição |
|------|-----|-----------|
| Contato inicial | Cinza | Novo contato |
| Formulário incompleto | Amarelo | Formulário iniciado |
| Aprovado formulário | Verde | Formulário aprovado |
| Reprovado formulário | Vermelho | Formulário reprovado |
| CPF aprovado | Rosa | CPF validado |
| CPF reprovado | Ciano | CPF com problemas |
| Marcação de reunião pendente | Laranja | Aguardando reunião |
| Marcação de reunião completo | Azul | Reunião agendada |
| Consultor | Roxo | Lead qualificado |

#### Leads e Pipeline
- `leads` - Pipeline de vendas
- `lead_activities` - Histórico de atividades
- `lead_labels` - Labels atribuídas

#### Formulários
- `forms` - Definições de formulários (dados em `questions`, NÃO em `elements`)
- `form_fields` - Campos dos formulários
- `form_submissions` - Respostas submetidas
- `form_tenant_mapping` - Mapeamento para URLs públicas

> **VER:** `FORMULARIOS_SYSTEM.md` para documentação completa do sistema de formulários, incluindo a seção 13 sobre paginação.

#### Configurações
- `app_settings` - Configurações gerais
- `supabase_config` - Credenciais Supabase por tenant
- `integration_configs` - Integrações externas

#### Produtos e Inventário
- `products` - Catálogo de produtos
- `inventory` - Estoque
- `orders` - Pedidos

---

## 🔄 Fluxos de Automação

### FormPoller (2 minutos)
1. Monitora `form_submissions` no Supabase
2. Sincroniza novas submissions
3. Cria leads automaticamente

### CPFPoller (3 minutos)
1. Monitora resultados de compliance
2. Atualiza leads com status CPF
3. Sincroniza etiquetas no pipeline

### FormMappingSync (5 minutos)
1. Sincroniza formulários do Supabase
2. Mapeia company_slug → tenant_id
3. Atualiza cache local

---

## 📊 APIs BigDataCorp

### Endpoints e Custos

| API | Custo | Função |
|-----|-------|--------|
| Processos Judiciais | R$ 0,070 | `consultarProcessosJudiciais(cpf)` |
| Dados Cadastrais | R$ 0,030 | `consultarDadosCadastrais(cpf)` |
| Presença em Cobrança | R$ 0,070 | `consultarPresencaCobranca(cpf)` |
| Consulta Completa | R$ 0,170 | `consultarCandidatoCompleto(cpf)` |

### Rate Limiting
- 2 requisições por segundo
- Implementado em `server/lib/bigdatacorpClient.ts`

---

## 🌐 Rotas Principais

### Autenticação
| Rota | Descrição |
|------|-----------|
| `/` | Login |
| `/login` | Página de login |
| `/api/auth/login` | API de login |
| `/api/auth/check-session` | Verificar sessão |

### Formulários
| Rota | Descrição |
|------|-----------|
| `/formulario` | Dashboard de formulários |
| `/formulario/:company/form/:slug` | Formulário público |
| `/formulario/admin/formularios` | Administração |

### Pipeline
| Rota | Descrição |
|------|-----------|
| `/clientes` | Lista de leads |
| `/kanban` | Pipeline Kanban |
| `/consultar-cpf` | Consulta manual CPF |

### Configurações
| Rota | Descrição |
|------|-----------|
| `/configuracoes` | Configurações gerais |
| `/api/config/supabase/credentials` | API credenciais |

---

## 🏗️ Estrutura de Diretórios

```
/
├── src/                          # Frontend React
│   ├── components/               # Componentes UI
│   ├── features/                 # Funcionalidades
│   │   └── formularios-platform/ # Plataforma de formulários
│   ├── contexts/                 # React Contexts
│   ├── hooks/                    # Custom hooks
│   └── lib/                      # Utilitários
├── server/                       # Backend Express
│   ├── lib/                      # Bibliotecas
│   │   ├── bigdatacorpClient.ts  # Cliente BigDataCorp
│   │   ├── supabaseMaster.ts     # Supabase Master
│   │   ├── clienteSupabase.ts    # Supabase por tenant
│   │   └── formsAutomation.ts    # Automação
│   ├── routes/                   # Rotas da API
│   └── middleware/               # Middlewares
├── shared/                       # Código compartilhado
│   └── db-schema.ts              # Schema Drizzle
├── scripts/                      # Scripts de utilidade
│   ├── limpar-antes-exportar.sh  # Limpeza pré-export
│   └── restaurar-apos-importar.sh# Restauração pós-import
└── public/                       # Arquivos estáticos
```

---

## ✅ Checklist Completo

### Antes de Exportar

- [ ] Salvar todos os secrets em local seguro
- [ ] Executar `bash scripts/limpar-antes-exportar.sh`
- [ ] Verificar tamanho do projeto (~40-60MB)
- [ ] Commit e push para GitHub

### Após Importar

- [ ] Executar `bash scripts/restaurar-apos-importar.sh`
- [ ] Configurar `JWT_SECRET` nos Secrets
- [ ] Configurar secrets opcionais (se necessário)
- [ ] Executar `npm run dev`
- [ ] Testar login: admin@example.com
- [ ] Verificar logs para senha gerada
- [ ] Testar formulários (se Supabase configurado)
- [ ] Verificar automação de CPF (se BigDataCorp configurado)

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor

# Banco de dados
npm run db:push          # Sincronizar schema
npm run db:push --force  # Forçar sincronização

# Build
npm run build            # Build de produção
npm start                # Iniciar produção

# Limpeza
bash scripts/limpar-antes-exportar.sh    # Antes de exportar
bash scripts/restaurar-apos-importar.sh  # Após importar
```

---

## 🐛 Troubleshooting

### "Cannot find module"
```bash
rm -rf node_modules && npm install
```

### "relation does not exist"
```bash
npm run db:push
```

### "JWT_SECRET not set"
Configure na aba Secrets do Replit.

### "Supabase não configurado"
Configure `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY`.

### Servidor não inicia
Verifique se porta 5000 não está em uso.

---

## 💰 Economia de Créditos

| Ação | Créditos Gastos |
|------|-----------------|
| Exportar SEM limpar | ~500 |
| Exportar COM limpar | ~25 |
| **Economia** | **95%** |

Sempre execute `bash scripts/limpar-antes-exportar.sh` antes de exportar!

---

## 📞 Informações de Contato

**Login padrão:** admin@example.com

**Senha:** Gerada automaticamente (verifique logs do servidor)

**Documentação técnica:** `DOCUMENTATION.md`

**Guia de exportação:** `GUIA_EXPORT_OTIMIZADO.md`
