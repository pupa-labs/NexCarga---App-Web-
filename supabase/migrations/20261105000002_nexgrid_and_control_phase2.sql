-- ============================================================================
-- NEXCARGA — LOGTECH SAAS B2B (PUPA LABS)
-- Migration: 20261105000002_nexgrid_and_control_phase2.sql
-- Escopo: Evolução FASE 2 — NEXGRID Georreferenciado + NexCarga Control
-- ============================================================================

-- 1. Evolução da tabela de fretes com endereço completo e visibilidade multi-tenant
ALTER TABLE freights
  ADD COLUMN IF NOT EXISTS origin_street TEXT,
  ADD COLUMN IF NOT EXISTS origin_number TEXT,
  ADD COLUMN IF NOT EXISTS origin_complement TEXT,
  ADD COLUMN IF NOT EXISTS origin_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS destination_street TEXT,
  ADD COLUMN IF NOT EXISTS destination_number TEXT,
  ADD COLUMN IF NOT EXISTS destination_complement TEXT,
  ADD COLUMN IF NOT EXISTS destination_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'INVITED_ONLY', 'PRIVATE')),
  ADD COLUMN IF NOT EXISTS geocoding_source TEXT NOT NULL DEFAULT 'SERVER_VALIDATED';

-- 2. Regras de taxas configuráveis com vigência e divisão matemática validada
CREATE TABLE IF NOT EXISTS fee_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  fee_type TEXT NOT NULL DEFAULT 'MAINTENANCE' CHECK (fee_type IN ('MAINTENANCE', 'ADDITIONAL_SERVICE', 'ESCROW_OPTIONAL')),
  total_percent NUMERIC(5,2) NOT NULL DEFAULT 3.50,
  company_percent NUMERIC(5,2) NOT NULL DEFAULT 1.75,
  provider_percent NUMERIC(5,2) NOT NULL DEFAULT 1.75,
  fixed_fee_brl NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_fee_split_sum CHECK (ROUND(company_percent + provider_percent, 2) = ROUND(total_percent, 2))
);

-- 3. Snapshot imutável de taxas nas contratações (impede alteração retroativa)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS fee_rule_id UUID REFERENCES fee_rules(id),
  ADD COLUMN IF NOT EXISTS fee_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 4. Evolução da tabela de assinaturas para Concessão Manual Administrativa (SUPER_ADMIN)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_manual_grant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grant_reason TEXT,
  ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS delinquency_days INTEGER NOT NULL DEFAULT 0;

-- 5. Políticas de inadimplência configuráveis pelo NexCarga Control
CREATE TABLE IF NOT EXISTS delinquency_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grace_period_days INTEGER NOT NULL DEFAULT 5,
  pre_due_notice_days INTEGER NOT NULL DEFAULT 3,
  post_due_notice_days INTEGER NOT NULL DEFAULT 1,
  auto_suspension_days INTEGER NOT NULL DEFAULT 10,
  blocked_resources TEXT[] NOT NULL DEFAULT ARRAY['PUBLICAR_FRETE', 'ENVIAR_PROPOSTA', 'SOLICITAR_HOMOLOGACAO'],
  allow_active_operations_completion BOOLEAN NOT NULL DEFAULT TRUE,
  auto_reactivate_on_payment BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Evolução de logs de auditoria com rastreabilidade administrativa completa
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS previous_value JSONB,
  ADD COLUMN IF NOT EXISTS new_value JSONB,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS origin_ip TEXT DEFAULT '127.0.0.1',
  ADD COLUMN IF NOT EXISTS result TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (result IN ('SUCCESS', 'DENIED', 'ERROR'));

-- 7. RLS para as novas tabelas administrativas
ALTER TABLE fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE delinquency_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente administradores gerenciam fee_rules"
  ON fee_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE')
    )
  );

CREATE POLICY "Somente administradores gerenciam delinquency_policies"
  ON delinquency_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE')
    )
  );
