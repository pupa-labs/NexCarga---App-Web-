-- ============================================================================
-- NEXCARGA — LOGTECH SAAS B2B (PUPA LABS)
-- Migration: 20261105000003_auth_profiles_and_nexcarga_trust.sql
-- Escopo: Correção de relacionamento Supabase Auth (auth.users <-> profiles),
--         Buckets Oficiais do Supabase Storage, Módulo NEXCARGA TRUST (8 estados),
--         Histórico Auditável de Verificação e Políticas RLS Multi-Tenant.
-- ============================================================================

-- 1. Reconciliação da tabela profiles com auth.users e correção de colunas referenciadas em RLS
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'COMPANY'
    CHECK (role IN ('COMPANY', 'DRIVER', 'CARRIER', 'SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'VERIFICATION')),
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION')),
  ADD COLUMN IF NOT EXISTS trust_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SUBMITTED'
    CHECK (trust_status IN ('NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED')),
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"emailAlerts": true, "pushNotifications": true, "whatsappOperational": true, "securityAlerts": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;

-- 2. Evolução da tabela organizations com status oficial do NEXCARGA TRUST
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trust_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SUBMITTED'
    CHECK (trust_status IN ('NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED')),
  ADD COLUMN IF NOT EXISTS trust_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trust_verified_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS trust_Badge_eligible BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Tabela principal de Verificação Cadastral — NEXCARGA TRUST
CREATE TABLE IF NOT EXISTS nexcarga_trust_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_category VARCHAR(32) NOT NULL
    CHECK (entity_category IN ('DRIVER', 'CARRIER', 'COMPANY_SHIPPER', 'COMPANY_PROVIDER', 'COMMERCIAL_PARTNER')),
  trust_status VARCHAR(32) NOT NULL DEFAULT 'NOT_SUBMITTED'
    CHECK (trust_status IN (
      'NOT_SUBMITTED',
      'PENDING',
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'VERIFIED',
      'REJECTED',
      'EXPIRED',
      'SUSPENDED'
    )),
  badge_verified BOOLEAN NOT NULL DEFAULT FALSE,
  pending_requirements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  regularization_instructions TEXT,
  rejection_reason TEXT,
  suspension_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_profile_id UUID REFERENCES profiles(id),
  reviewed_by_name VARCHAR(150),
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_verified_badge_consistency CHECK (
    (trust_status = 'VERIFIED' AND badge_verified = TRUE) OR
    (trust_status <> 'VERIFIED' AND badge_verified = FALSE)
  )
);

-- 4. Evolução da tabela documents para suportar os 6 buckets oficiais e ciclo NEXCARGA TRUST
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS trust_verification_id UUID REFERENCES nexcarga_trust_verifications(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS storage_bucket VARCHAR(80) NOT NULL DEFAULT 'nexcarga-private'
    CHECK (storage_bucket IN (
      'driver-documents',
      'company-documents',
      'vehicle-images',
      'freight-attachments',
      'profile-images',
      'nexcarga-private'
    )),
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_profile_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(150);

-- 5. Histórico Imutável de Análise e Aprovação do NEXCARGA TRUST
CREATE TABLE IF NOT EXISTS nexcarga_trust_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trust_verification_id UUID NOT NULL REFERENCES nexcarga_trust_verifications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  actor_profile_id UUID REFERENCES profiles(id),
  actor_name VARCHAR(150) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  previous_status VARCHAR(32) NOT NULL,
  new_status VARCHAR(32) NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Registro declarativo dos 6 Buckets Oficiais do Supabase Storage (quando executado no Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES
      ('driver-documents', 'driver-documents', FALSE),
      ('company-documents', 'company-documents', FALSE),
      ('vehicle-images', 'vehicle-images', FALSE),
      ('freight-attachments', 'freight-attachments', FALSE),
      ('profile-images', 'profile-images', TRUE),
      ('nexcarga-private', 'nexcarga-private', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 7. Habilitação e Correção das Políticas RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexcarga_trust_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexcarga_trust_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Somente administradores gerenciam fee_rules" ON fee_rules;
CREATE POLICY "Somente administradores gerenciam fee_rules"
  ON fee_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE')
    )
  );

DROP POLICY IF EXISTS "Somente administradores gerenciam delinquency_policies" ON delinquency_policies;
CREATE POLICY "Somente administradores gerenciam delinquency_policies"
  ON delinquency_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE')
    )
  );

CREATE POLICY "Usuário lê e edita seu próprio perfil ou administradores visualizam"
  ON profiles FOR SELECT
  USING (
    auth_user_id = auth.uid()
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles adm
      WHERE (adm.auth_user_id = auth.uid() OR adm.id = auth.uid())
        AND adm.role IN ('SUPER_ADMIN', 'ADMIN', 'VERIFICATION', 'SUPPORT')
    )
  );

CREATE POLICY "Isolamento por organização no NEXCARGA TRUST"
  ON nexcarga_trust_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND (
          p.organization_id = nexcarga_trust_verifications.organization_id
          OR p.role IN ('SUPER_ADMIN', 'ADMIN', 'VERIFICATION')
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_trust_verifications_org_status
  ON nexcarga_trust_verifications(organization_id, trust_status);
CREATE INDEX IF NOT EXISTS idx_trust_history_verification
  ON nexcarga_trust_history(trust_verification_id, created_at DESC);
