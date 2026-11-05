-- ============================================================================
-- NEXCARGA — Pupa Labs | LogTech SaaS B2B
-- Migration: 20261105000001_nexcarga_initial_schema.sql
-- Banco de Dados Principal: Supabase PostgreSQL com Row Level Security (RLS)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLES & PERMISSIONS (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL CHECK (code IN ('COMPANY', 'DRIVER', 'CARRIER', 'SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'VERIFICATION')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(64) UNIQUE NOT NULL,
  module VARCHAR(64) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 2. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role_code VARCHAR(32) NOT NULL REFERENCES roles(code),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  job_title VARCHAR(100),
  cpf VARCHAR(14),
  phone VARCHAR(20),
  avatar_url TEXT,
  city VARCHAR(100) DEFAULT 'Manhuaçu',
  uf CHAR(2) DEFAULT 'MG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ORGANIZATIONS & MULTI-TENANT MEMBERS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(200),
  type VARCHAR(32) NOT NULL CHECK (type IN ('COMPANY', 'CARRIER', 'DRIVER_INDIVIDUAL', 'PLATFORM')),
  cnpj VARCHAR(18),
  cpf VARCHAR(14),
  rntrc VARCHAR(20),
  cep VARCHAR(10),
  uf CHAR(2) NOT NULL DEFAULT 'MG',
  city VARCHAR(100) NOT NULL DEFAULT 'Manhuaçu',
  neighborhood VARCHAR(100),
  street VARCHAR(200),
  street_number VARCHAR(20),
  complement VARCHAR(100),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code VARCHAR(32) NOT NULL REFERENCES roles(code),
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- 4. PLANS & SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  cycle VARCHAR(20) NOT NULL CHECK (cycle IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
  price_brl NUMERIC(12, 2) NOT NULL,
  trial_days INTEGER NOT NULL DEFAULT 15,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(32) NOT NULL CHECK (status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  payment_provider_adapter VARCHAR(50) DEFAULT 'PENDING_PROVIDER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. VEHICLES, IMPLEMENTS, FLEETS & DRIVERS
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  axles INTEGER NOT NULL DEFAULT 3,
  max_weight_kg NUMERIC(10, 2) NOT NULL,
  avg_consumption_km_l NUMERIC(5, 2) NOT NULL DEFAULT 3.2
);

CREATE TABLE IF NOT EXISTS implements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS fleets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  active_vehicles_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  cnh_number VARCHAR(20) NOT NULL,
  cnh_category VARCHAR(5) NOT NULL DEFAULT 'E',
  rntrc VARCHAR(20) NOT NULL,
  phone VARCHAR(20),
  base_city VARCHAR(100) DEFAULT 'Manhuaçu',
  base_uf CHAR(2) DEFAULT 'MG',
  rating NUMERIC(3, 2) DEFAULT 4.90,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  fleet_id UUID REFERENCES fleets(id) ON DELETE SET NULL,
  plate VARCHAR(10) UNIQUE NOT NULL,
  brand_model VARCHAR(120) NOT NULL,
  year INTEGER NOT NULL,
  vehicle_type_name VARCHAR(80) NOT NULL,
  implement_name VARCHAR(80) NOT NULL,
  capacity_kg NUMERIC(10, 2) NOT NULL,
  rntrc VARCHAR(20),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. FREIGHTS & MARKETPLACE
CREATE TABLE IF NOT EXISTS freight_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS freights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(24) UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  origin_city VARCHAR(100) NOT NULL,
  origin_uf CHAR(2) NOT NULL,
  origin_cep VARCHAR(10),
  origin_lat NUMERIC(9, 6),
  origin_lng NUMERIC(9, 6),
  destination_city VARCHAR(100) NOT NULL,
  destination_uf CHAR(2) NOT NULL,
  destination_cep VARCHAR(10),
  destination_lat NUMERIC(9, 6),
  destination_lng NUMERIC(9, 6),
  distance_km INTEGER NOT NULL,
  cargo_type VARCHAR(100) NOT NULL,
  vehicle_required VARCHAR(80) NOT NULL,
  implement_required VARCHAR(80) NOT NULL,
  weight_kg NUMERIC(10, 2) NOT NULL,
  volume_m3 NUMERIC(8, 2),
  offered_value_brl NUMERIC(12, 2) NOT NULL,
  pickup_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PUBLISHED', 'IN_NEGOTIATION', 'CONTRACTED', 'IN_OPERATION', 'DELIVERED', 'CANCELED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS freight_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  freight_id UUID NOT NULL REFERENCES freights(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL,
  city VARCHAR(100) NOT NULL,
  uf CHAR(2) NOT NULL,
  stop_type VARCHAR(32) NOT NULL CHECK (stop_type IN ('PICKUP', 'WAYPOINT', 'DELIVERY')),
  scheduled_at TIMESTAMPTZ
);

-- 7. PROPOSALS & EVENTS
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  freight_id UUID NOT NULL REFERENCES freights(id) ON DELETE CASCADE,
  proposer_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  driver_name VARCHAR(150) NOT NULL,
  vehicle_description VARCHAR(120) NOT NULL,
  proposed_value_brl NUMERIC(12, 2) NOT NULL,
  counter_value_brl NUMERIC(12, 2),
  estimated_delivery_days INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED', 'REJECTED', 'CANCELED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  previous_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  value_brl NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CONTRACTS & OPERATIONS
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(24) UNIQUE NOT NULL,
  freight_id UUID UNIQUE NOT NULL REFERENCES freights(id),
  proposal_id UUID UNIQUE NOT NULL REFERENCES proposals(id),
  company_organization_id UUID NOT NULL REFERENCES organizations(id),
  provider_organization_id UUID NOT NULL REFERENCES organizations(id),
  agreed_freight_value_brl NUMERIC(12, 2) NOT NULL,
  company_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.75,
  provider_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.75,
  total_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.50,
  company_fee_brl NUMERIC(12, 2) NOT NULL,
  provider_fee_brl NUMERIC(12, 2) NOT NULL,
  total_platform_fee_brl NUMERIC(12, 2) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELED')),
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  freight_id UUID NOT NULL REFERENCES freights(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  freight_code VARCHAR(24) NOT NULL,
  origin_city VARCHAR(100) NOT NULL,
  origin_uf CHAR(2) NOT NULL,
  destination_city VARCHAR(100) NOT NULL,
  destination_uf CHAR(2) NOT NULL,
  driver_name VARCHAR(150) NOT NULL,
  vehicle_plate VARCHAR(15) NOT NULL,
  status VARCHAR(40) NOT NULL CHECK (status IN (
    'Aguardando coleta',
    'Programada',
    'Em carregamento',
    'Em trânsito',
    'Em descarregamento',
    'Entregue',
    'Com ocorrência',
    'Cancelada'
  )),
  progress_percent INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  status VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  location_city VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. DOCUMENTS & NEXIA VERIFY (GCS METADATA)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id),
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('CNH', 'RNTRC', 'ANTT', 'CRLV', 'NF_E', 'CT_E', 'MDF_E', 'CONTRATO_SOCIAL', 'COMPROVANTE_ENTREGA')),
  gcs_bucket VARCHAR(120) NOT NULL DEFAULT 'nexcarga-docs-private',
  gcs_object_path TEXT NOT NULL,
  mime_type VARCHAR(80) NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  expires_at DATE,
  verification_status VARCHAR(32) NOT NULL CHECK (verification_status IN ('PENDING', 'AI_PRE_CHECKED', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ai_summary TEXT,
  ai_inconsistencies JSONB DEFAULT '[]'::jsonb,
  human_reviewer_id UUID REFERENCES users(id),
  human_decision VARCHAR(32) CHECK (human_decision IN ('PENDING_HUMAN', 'APPROVED', 'REJECTED')),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. FINANCIALS, FEES & PAYMENTS (INTERMEDIATION ONLY, NON-CUSTODIAL)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  contract_id UUID REFERENCES contracts(id),
  payment_type VARCHAR(32) NOT NULL CHECK (payment_type IN ('SUBSCRIPTION', 'PLATFORM_FEE')),
  amount_brl NUMERIC(12, 2) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  provider_adapter VARCHAR(50) NOT NULL DEFAULT 'DECOUPLED_PAYMENT_ADAPTER',
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  freight_value_brl NUMERIC(12, 2) NOT NULL,
  company_fee_percent NUMERIC(5, 2) NOT NULL,
  provider_fee_percent NUMERIC(5, 2) NOT NULL,
  company_fee_brl NUMERIC(12, 2) NOT NULL,
  provider_fee_brl NUMERIC(12, 2) NOT NULL,
  total_fee_brl NUMERIC(12, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'RECORDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PARTNERS, REFERRALS & COMMISSIONS
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  cnpj_cpf VARCHAR(18) NOT NULL,
  referral_code VARCHAR(32) UNIQUE NOT NULL,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  active_referrals INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referred_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL CHECK (status IN ('TRIAL', 'CONVERTED', 'CHURNED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  amount_brl NUMERIC(12, 2) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'PAID')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. NOTIFICATIONS, CONVERSATIONS, AUDIT LOGS & SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(40) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID,
  actor_name VARCHAR(150) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  organization_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by VARCHAR(150),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE freights ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for high-performance NEXGRID geospatial & status filtering
CREATE INDEX IF NOT EXISTS idx_freights_status_origin ON freights(status, origin_uf, origin_city);
CREATE INDEX IF NOT EXISTS idx_freights_destination ON freights(destination_uf, destination_city);
CREATE INDEX IF NOT EXISTS idx_proposals_freight ON proposals(freight_id, status);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
