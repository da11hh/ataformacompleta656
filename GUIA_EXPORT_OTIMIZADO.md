# Guia de Exportação Otimizada - ExecutiveAI Pro

## 🎯 Objetivo

Este guia ensina como exportar o projeto para GitHub gastando **apenas ~25 créditos** em vez de ~500 créditos (economia de 95%).

---

## 📊 Por Que Otimizar?

| Métrica | Sem Otimização | Com Otimização | Economia |
|---------|---------------|----------------|----------|
| **Tamanho** | 800-1000MB | 40-60MB | **95%** |
| **Créditos** | ~500 | ~25 | **95%** |
| **Tempo de Import** | 30-40min | ~10min | **75%** |

O maior vilão é a pasta `node_modules` (~700-900MB) que é 100% regenerável com `npm install`.

---

## 📦 Passo a Passo: Exportar

### PASSO 1: Limpar Antes de Exportar

No Replit **atual**, execute:

```bash
bash scripts/limpar-antes-exportar.sh
```

Este script remove:
- `node_modules/` (~800MB)
- `package-lock.json` (regenerável)
- `dist/` (regenerável no build)
- `.vite/` cache
- Arquivos temporários

### PASSO 2: Commit e Push para GitHub

```bash
git add .
git commit -m "Otimizado para export - $(date +%Y-%m-%d)"
git push origin main
```

### PASSO 3: Importar no Novo Replit

1. Crie um novo Repl → Import from GitHub
2. Cole a URL do repositório
3. **IMPORTANTE:** Clique em "Skip" (não use o Agent para importação inicial)

### PASSO 4: Restaurar no Novo Replit

Após importar, execute:

```bash
bash scripts/restaurar-apos-importar.sh
```

### PASSO 5: Configurar Secrets

Na aba "Secrets" do Replit, configure:

**Obrigatórios:**
- `JWT_SECRET` - Qualquer string longa aleatória

**Opcionais (para funcionalidades avançadas):**
- `REACT_APP_SUPABASE_URL` - URL do Supabase do cliente
- `REACT_APP_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `TOKEN_ID` - ID do token BigDataCorp
- `CHAVE_TOKEN` - Chave do token BigDataCorp
- `SUPABASE_MASTER_URL` - URL do Supabase Master
- `SUPABASE_MASTER_SERVICE_ROLE_KEY` - Service role key

### PASSO 6: Iniciar

```bash
npm run dev
```

---

## 🔑 Secrets Detalhados

### JWT_SECRET (Obrigatório)

Usado para assinar tokens de autenticação.

**Como gerar:**
```bash
openssl rand -base64 32
```

Ou use qualquer string longa (32+ caracteres).

### Supabase do Cliente (Opcional)

Para formulários externos e sincronização de dados.

1. Crie projeto em https://app.supabase.com
2. Vá em Settings → API
3. Copie:
   - `REACT_APP_SUPABASE_URL` = Project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = anon/public key

### BigDataCorp (Opcional)

Para consultas de CPF, processos judiciais e compliance.

1. Contrate em https://bigdatacorp.com.br
2. Obtenha:
   - `TOKEN_ID` = ID do token
   - `CHAVE_TOKEN` = Chave de acesso

### Supabase Master (Opcional)

Cache global multi-tenant para resultados de CPF.

1. Crie um segundo projeto Supabase (separado do cliente)
2. Vá em Settings → API
3. Copie:
   - `SUPABASE_MASTER_URL` = Project URL
   - `SUPABASE_MASTER_SERVICE_ROLE_KEY` = service_role key

---

## 🗄️ Banco de Dados

O banco PostgreSQL do Replit é local e **não é exportado** para GitHub.

### Após Importar

As migrações são executadas automaticamente pelo script de restauração:

```bash
npm run db:push
```

Isso cria todas as tabelas necessárias (46+ tabelas).

### Tabelas Principais

- `users` - Usuários do sistema
- `tenants` - Multi-tenancy
- `whatsapp_labels` - Etiquetas (criadas automaticamente)
- `leads` - Pipeline de vendas
- `supabase_config` - Credenciais por tenant

---

## 📋 Checklist de Exportação

### Antes de Exportar

- [ ] Executar `bash scripts/limpar-antes-exportar.sh`
- [ ] Verificar tamanho: `du -sh .` (deve ser ~40-60MB)
- [ ] Fazer commit das mudanças
- [ ] Push para GitHub

### Após Importar

- [ ] Executar `bash scripts/restaurar-apos-importar.sh`
- [ ] Configurar `JWT_SECRET` nos Secrets
- [ ] Configurar secrets opcionais (se necessário)
- [ ] Testar `npm run dev`
- [ ] Verificar login funciona
- [ ] Verificar formulários (se Supabase configurado)

---

## 🐛 Troubleshooting

### Erro: "Cannot find module"

```bash
rm -rf node_modules
npm install
```

### Erro: "relation does not exist"

```bash
npm run db:push
```

### Erro: "JWT_SECRET not set"

Configure o secret na aba Secrets do Replit.

### Erro: "Port 5000 already in use"

Pare outros workflows ou reinicie o Replit.

---

## 💡 Dicas

1. **Sempre limpe antes de exportar** - Economiza créditos e tempo
2. **Use Skip no import** - Não deixe o Agent processar na importação
3. **Documente seus secrets** - Mantenha uma cópia segura das credenciais
4. **Teste após importar** - Verifique se tudo funciona antes de continuar

---

## 📞 Suporte

**Login padrão:** admin@example.com (senha gerada nos logs do servidor)

**Comandos úteis:**
```bash
npm run dev          # Iniciar servidor
npm run db:push      # Sincronizar banco
npm run build        # Build de produção
npm start            # Iniciar produção
```
