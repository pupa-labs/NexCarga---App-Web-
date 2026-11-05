# NEXCARGA — Documentação Técnica de Arquitetura, Segurança e Implantação (Hostinger)

**Pupa Labs | Sua carga. Nossa conexão.**

## 1. Arquitetura Oficial Implementada

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Design System Proprietário **NEXOS** + Radar Georreferenciado **NEXGRID** + PWA (`vite-plugin-pwa`).
- **Backend**: Node.js + Express (`server.ts`) com APIs REST, Rate Limiting, sanitização de entradas, validação de documentos brasileiros (CPF, CNPJ, CNH, RNTRC, CEP), controle de acesso **RBAC** no servidor, chaves de idempotência para contratos e registros de auditoria.
- **Banco de Dados Principal**: **Supabase PostgreSQL** (`/supabase/migrations/20261105000001_nexcarga_initial_schema.sql`) com **31 tabelas relacionais**, chaves estrangeiras, índices geoespaciais e **Row Level Security (RLS)**.
- **Armazenamento de Arquivos**: **Google Cloud Storage** (`NexCarga Docs` & `NexIA Verify`), mantendo metadados e caminhos `gs://` no PostgreSQL.
- **Inteligência Artificial**: **Gemini API** (`@google/genai`, modelo `gemini-3.8-flash`) executada exclusivamente no servidor (`/api/nexia/chat`).

## 2. Variáveis de Ambiente Necessárias (`.env`)

Configure no painel de variáveis da Hostinger / servidor Node.js:

```env
NODE_ENV="production"
APP_URL="https://app.nexcarga.com.br"
GEMINI_API_KEY="SUA_CHAVE_GEMINI_API"
SUPABASE_URL="https://SEU_PROJETO.supabase.co"
SUPABASE_ANON_KEY="SUA_CHAVE_ANON"
SUPABASE_SERVICE_ROLE_KEY="SUA_CHAVE_SERVICE_ROLE_PRIVADA"
GCS_PROJECT_ID="SEU_PROJETO_GCP"
GCS_BUCKET_NAME="nexcarga-docs-private"
GCS_CLIENT_EMAIL="service-account@projeto.iam.gserviceaccount.com"
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_MAPS_API_KEY="SUA_CHAVE_GOOGLE_MAPS"
```

## 3. Comandos de Execução, Build e Testes

- **Desenvolvimento**: `npm run dev` (inicia Express + Vite em `http://0.0.0.0:3000`)
- **Testes Unitários**: `npm test` (`npx --yes tsx --test src/utils/logisticsRules.test.ts`)
- **Verificação de Tipos**: `npm run lint` (`tsc --noEmit`)
- **Build de Produção**: `npm run build`
- **Inicialização em Produção (Hostinger VPS / Cloud / Node.js)**: `npm start`
