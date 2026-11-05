import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  KeyRound,
  Lock,
  Percent,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Users,
} from 'lucide-react';
import type {
  ActiveProfileSession,
  AdminControlOverviewMetrics,
  AdminPermissionAction,
  AdminUserItem,
  AuditLogItem,
  CommercialSettings,
  ContractItem,
  DelinquencyPolicy,
  FeeRuleItem,
  IntegrationStatus,
  OrganizationItem,
  PartnerCommissionItem,
  PartnerItem,
  PaymentTransactionItem,
  PlatformGeneralSettings,
  RolePermissionMatrix,
  SubscriptionItem,
  UserAccountStatus,
  UserRole,
} from '../types/nexcarga';
import { formatBrl, formatDateBr, hasAdminPermission } from '../utils/logisticsRules';

interface NexCargaControlViewProps {
  activeProfile: ActiveProfileSession;
  overview: AdminControlOverviewMetrics;
  users: AdminUserItem[];
  organizations: OrganizationItem[];
  subscriptions: SubscriptionItem[];
  payments: PaymentTransactionItem[];
  feeRules: FeeRuleItem[];
  delinquencyPolicy: DelinquencyPolicy;
  partnerCommissions: PartnerCommissionItem[];
  partners: PartnerItem[];
  contracts: ContractItem[];
  rolePermissions: RolePermissionMatrix;
  platformSettings: PlatformGeneralSettings;
  commercialSettings: CommercialSettings;
  auditLogs: AuditLogItem[];
  integrations: IntegrationStatus;
  onRefresh: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

type ControlTabId =
  | 'overview'
  | 'users'
  | 'organizations'
  | 'plans'
  | 'subscriptions'
  | 'finance'
  | 'fees'
  | 'delinquency'
  | 'partners'
  | 'permissions'
  | 'audit'
  | 'settings';

export const NexCargaControlView: React.FC<NexCargaControlViewProps> = ({
  activeProfile,
  overview,
  users,
  organizations,
  subscriptions,
  payments,
  feeRules,
  delinquencyPolicy,
  partnerCommissions,
  partners,
  contracts,
  rolePermissions,
  platformSettings,
  commercialSettings,
  auditLogs,
  integrations,
  onRefresh,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<ControlTabId>('overview');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // 5.2 Users filter state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');

  // 5.4 New Plan state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCycle, setNewPlanCycle] = useState('Semestral');
  const [newPlanPrice, setNewPlanPrice] = useState(299.9);
  const [newPlanTrial, setNewPlanTrial] = useState(15);

  // 5.5 Manual Subscription Grant state (Exclusive SUPER_ADMIN)
  const [grantOrgId, setGrantOrgId] = useState(organizations[0]?.id || 'org-vale-sa');
  const [grantPlanId, setGrantPlanId] = useState(
    commercialSettings.plans[2]?.id || 'plan-annual'
  );
  const [grantStartDate, setGrantStartDate] = useState('2026-11-05');
  const [grantValidUntil, setGrantValidUntil] = useState('2027-05-05');
  const [grantReason, setGrantReason] = useState(
    'Parceria Comercial Estratégica Zona da Mata / Leste de MG'
  );
  const [grantAdminNotes, setGrantAdminNotes] = useState(
    'Concessão administrativa autorizada pelo SUPER_ADMIN sem geração de cobrança financeira.'
  );

  // 5.6 Financial adjustment state
  const [adjustReason, setAdjustReason] = useState(
    'Conciliação bancária PIX confirmada pelo setor financeiro'
  );

  // 5.7 Fee Rule state
  const [feeName, setFeeName] = useState('Taxa de Manutenção Padrão NexCarga');
  const [feeCompPct, setFeeCompPct] = useState(commercialSettings.companyFeePercent);
  const [feeProvPct, setFeeProvPct] = useState(commercialSettings.providerFeePercent);

  // 5.8 Delinquency Policy state
  const [graceDays, setGraceDays] = useState(delinquencyPolicy.gracePeriodDays);
  const [preNoticeDays, setPreNoticeDays] = useState(delinquencyPolicy.preDueNoticeDays);
  const [postNoticeDays, setPostNoticeDays] = useState(delinquencyPolicy.postDueNoticeDays);
  const [autoSuspDays, setAutoSuspDays] = useState(delinquencyPolicy.autoSuspensionDays);
  const [preserveOps, setPreserveOps] = useState(
    delinquencyPolicy.allowActiveOperationsCompletion
  );

  // 5.9 New Partner state
  const [partnerName, setPartnerName] = useState('');
  const [partnerDoc, setPartnerDoc] = useState('');
  const [partnerCity, setPartnerCity] = useState('Manhuaçu/MG');
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerPct, setPartnerPct] = useState(15);

  // FASE E General Settings state
  const [supportEmail, setSupportEmail] = useState(platformSettings.supportEmail);
  const [supportPhone, setSupportPhone] = useState(platformSettings.supportPhone);
  const [defaultRadius, setDefaultRadius] = useState(platformSettings.nexgridDefaultRadiusKm);
  const [nexiaEnabled, setNexiaEnabled] = useState(platformSettings.nexiaEnabled);
  const [humanVerifyRequired, setHumanVerifyRequired] = useState(
    platformSettings.nexiaVerifyRequireHumanApproval
  );

  const canManageUsers = hasAdminPermission(
    activeProfile.role,
    'MANAGE_USERS',
    rolePermissions
  );
  const canGrantManualSub = hasAdminPermission(
    activeProfile.role,
    'GRANT_MANUAL_SUBSCRIPTION',
    rolePermissions
  );

  const callAdminApi = async (url: string, method: string, body?: unknown, successMsg?: string) => {
    setErrorBanner(null);
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok) {
      setErrorBanner(json.error || 'Operação negada pelo servidor.');
      return false;
    }
    await onRefresh();
    if (successMsg) onShowToast(successMsg);
    return true;
  };

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userStatusFilter !== 'ALL' && u.status !== userStatusFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const hay = `${u.fullName} ${u.email} ${u.cpfOrCnpj} ${u.organizationName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const tabs: Array<{ id: ControlTabId; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'organizations', label: 'Organizações', icon: Building2 },
    { id: 'plans', label: 'Planos', icon: FileSpreadsheet },
    { id: 'subscriptions', label: 'Assinaturas & Cortesia', icon: Award },
    { id: 'finance', label: 'Financeiro', icon: CreditCard },
    { id: 'fees', label: 'Taxas & Snapshots', icon: Percent },
    { id: 'delinquency', label: 'Inadimplência', icon: AlertTriangle },
    { id: 'partners', label: 'Parceiros & Comissões', icon: Users },
    { id: 'permissions', label: 'Permissões RBAC', icon: KeyRound },
    { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
    { id: 'settings', label: 'Configurações Gerais', icon: Settings },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#FF8A00]" />
            <h2 className="text-xl font-bold text-white">
              NexCarga Control — Centro de Administração Global
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Operador autenticado: <strong className="text-white">{activeProfile.userName}</strong> (
            <span className="text-[#FF8A00] font-mono">{activeProfile.role}</span> —{' '}
            {activeProfile.organizationName}). Todas as ações exigem validação RBAC no servidor e geram trilha de auditoria imutável.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#121215] border border-white/10 text-neutral-300 font-mono">
            Taxa Vigente: <strong className="text-[#FF8A00]">{commercialSettings.totalMaintenanceFeePercent}%</strong> ({commercialSettings.companyFeePercent}% + {commercialSettings.providerFeePercent}%)
          </span>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setErrorBanner(null);
                setActiveTab(t.id);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold shadow-[0_2px_12px_rgba(255,138,0,0.3)]'
                  : 'bg-[#181818] hover:bg-[#222226] text-neutral-300 border border-white/[0.07]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {errorBanner && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-xs text-red-200 flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.1 DASHBOARD ADMINISTRATIVO (VISÃO GERAL REAL)                     */}
      {/* =================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4">
              <span className="text-[11px] text-neutral-400 block">Usuários Ativos / Total</span>
              <strong className="text-xl font-bold text-white font-mono tabular-nums mt-1 block">
                {overview.activeUsers} / {overview.totalUsers}
              </strong>
              <span className="text-[10px] text-amber-400">
                {overview.blockedOrSuspendedUsers} suspenso(s)/bloqueado(s)
              </span>
            </div>

            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4">
              <span className="text-[11px] text-neutral-400 block">Ecossistema Cadastrado</span>
              <strong className="text-sm font-bold text-white font-mono mt-1.5 block">
                {overview.registeredCompanies} Empresas • {overview.registeredDrivers} TAC •{' '}
                {overview.registeredCarriers} ETC
              </strong>
              <span className="text-[10px] text-neutral-400">Isolamento Multi-Tenant RLS</span>
            </div>

            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4">
              <span className="text-[11px] text-neutral-400 block">Assinaturas Ativas</span>
              <strong className="text-xl font-bold text-[#FF8A00] font-mono tabular-nums mt-1 block">
                {overview.activeSubscriptions}
              </strong>
              <span className="text-[10px] text-neutral-400">
                {overview.trialSubscriptions} em avaliação • {overview.manualGrantSubscriptions} cortesia
              </span>
            </div>

            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4">
              <span className="text-[11px] text-neutral-400 block">MRR (Receita Recorrente)</span>
              <strong className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
                {formatBrl(overview.mrrBrl)}
              </strong>
              <span className="text-[10px] text-neutral-400">
                Acumulado: {formatBrl(overview.accumulatedRevenueBrl)}
              </span>
            </div>

            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4">
              <span className="text-[11px] text-neutral-400 block">Taxas de Manutenção</span>
              <strong className="text-xl font-bold text-[#FF8A00] font-mono tabular-nums mt-1 block">
                {formatBrl(overview.collectedFeesBrl)}
              </strong>
              <span className="text-[10px] text-neutral-400">
                Volume Fretes: {formatBrl(overview.totalFinancialVolumeBrl)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl bg-[#141417] border border-white/[0.06] p-3.5">
              <span className="text-neutral-400 block">Pagamentos Pendentes</span>
              <strong className="text-white font-mono text-base tabular-nums">
                {formatBrl(overview.pendingPaymentsBrl)}
              </strong>
            </div>
            <div className="rounded-xl bg-[#141417] border border-white/[0.06] p-3.5">
              <span className="text-neutral-400 block">Inadimplência em Aberto</span>
              <strong className="text-red-400 font-mono text-base tabular-nums">
                {formatBrl(overview.delinquencyAmountBrl)} ({overview.overdueSubscriptions} conta)
              </strong>
            </div>
            <div className="rounded-xl bg-[#141417] border border-white/[0.06] p-3.5">
              <span className="text-neutral-400 block">Fretes Publicados / Contratos</span>
              <strong className="text-white font-mono text-base tabular-nums">
                {overview.totalPublishedFreights} fretes • {overview.completedContracts} contratos
              </strong>
            </div>
            <div className="rounded-xl bg-[#141417] border border-white/[0.06] p-3.5">
              <span className="text-neutral-400 block">Comissões de Parceiros Pendentes</span>
              <strong className="text-[#FF8A00] font-mono text-base tabular-nums">
                {formatBrl(overview.pendingCommissionsBrl)}
              </strong>
            </div>
          </div>

          {/* Status das Integrações Oficiais */}
          <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
            <h3 className="text-sm font-bold text-white mb-3">
              Status de Infraestrutura e Integrações (Pupa Labs)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
                <div className="flex items-center justify-between">
                  <strong className="text-white">1. Supabase PostgreSQL + Auth + RLS</strong>
                  <span className="text-[#FF8A00] font-mono text-[11px]">
                    {integrations.supabasePostgres.mode}
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">{integrations.supabasePostgres.details}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
                <div className="flex items-center justify-between">
                  <strong className="text-white">2. Google Maps Platform (NEXGRID)</strong>
                  <span className="text-emerald-400 font-mono text-[11px]">PROVISIONADO</span>
                </div>
                <p className="text-neutral-400 mt-1">{integrations.googleMapsPlatform.details}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
                <div className="flex items-center justify-between">
                  <strong className="text-white">3. Gemini API (NexIA & NexIA Verify)</strong>
                  <span className="text-[#FF8A00] font-mono text-[11px]">
                    {integrations.geminiNexIA.model}
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">{integrations.geminiNexIA.details}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
                <div className="flex items-center justify-between">
                  <strong className="text-white">4. Google Cloud Storage (NexCarga Docs)</strong>
                  <span className="text-[#FF8A00] font-mono text-[11px]">
                    {integrations.googleCloudStorage.bucket}
                  </span>
                </div>
                <p className="text-neutral-400 mt-1">{integrations.googleCloudStorage.details}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.2 GESTÃO DE USUÁRIOS (ATIVAR, SUSPENDER, BLOQUEAR, DESBLOQUEAR)   */}
      {/* =================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuário por nome, e-mail, CPF/CNPJ ou organização..."
                aria-label="Buscar usuário"
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                aria-label="Filtrar por role"
                className="rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              >
                <option value="ALL">Todos os Perfis</option>
                <option value="COMPANY">COMPANY</option>
                <option value="DRIVER">DRIVER</option>
                <option value="CARRIER">CARRIER</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="FINANCE">FINANCE</option>
                <option value="VERIFICATION">VERIFICATION</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                aria-label="Filtrar por status de conta"
                className="rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="SUSPENDED">Suspenso</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-[#181818] border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 bg-[#141416]">
                    <th className="py-3 px-4">Nome / E-mail</th>
                    <th className="py-3 px-4">CPF / CNPJ</th>
                    <th className="py-3 px-4">Perfil (RBAC)</th>
                    <th className="py-3 px-4">Organização</th>
                    <th className="py-3 px-4">Assinatura</th>
                    <th className="py-3 px-4">Status da Conta</th>
                    <th className="py-3 px-4 text-right">Ações Administrativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <strong className="text-white block">{u.fullName}</strong>
                        <span className="text-neutral-400 text-[11px]">{u.email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-300">{u.cpfOrCnpj}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[#FF8A00] font-semibold">{u.role}</span>
                        <span className="block text-[10px] text-neutral-400">{u.roleLabel}</span>
                      </td>
                      <td className="py-3 px-4 text-neutral-200">
                        {u.organizationName}
                        <span className="block text-[10px] text-neutral-500">
                          {u.city}/{u.uf}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {u.subscriptionStatus === 'MANUAL_GRANT' ? (
                          <span className="text-[#FF8A00]">CORTESIA ADMIN</span>
                        ) : u.subscriptionStatus === 'OVERDUE' ? (
                          <span className="text-red-400">INADIMPLENTE</span>
                        ) : u.subscriptionStatus === 'TRIAL' ? (
                          <span className="text-blue-400">AVALIAÇÃO (15 DIAS)</span>
                        ) : u.subscriptionStatus === 'SUSPENDED' ? (
                          <span className="text-amber-400">SUSPENSA</span>
                        ) : (
                          <span className="text-emerald-400">ATIVA</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            u.status === 'ACTIVE'
                              ? 'text-emerald-400'
                              : u.status === 'SUSPENDED'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {u.status === 'ACTIVE'
                            ? 'Ativo'
                            : u.status === 'SUSPENDED'
                            ? 'Suspenso'
                            : 'Bloqueado'}
                        </span>
                        {u.statusReason && (
                          <span className="block text-[10px] text-neutral-500 truncate max-w-[180px]">
                            {u.statusReason}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role === 'SUPER_ADMIN' ? (
                          <span className="text-[11px] text-neutral-500">Protegido</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status !== 'ACTIVE' && (
                              <button
                                type="button"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  callAdminApi(
                                    `/api/admin/users/${u.id}/status`,
                                    'PATCH',
                                    {
                                      status: 'ACTIVE' as UserAccountStatus,
                                      reason: 'Reativação administrativa no NexCarga Control',
                                    },
                                    `Usuário ${u.fullName} reativado!`
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[11px] cursor-pointer"
                              >
                                Ativar / Desbloquear
                              </button>
                            )}
                            {u.status === 'ACTIVE' && (
                              <button
                                type="button"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  callAdminApi(
                                    `/api/admin/users/${u.id}/status`,
                                    'PATCH',
                                    {
                                      status: 'SUSPENDED' as UserAccountStatus,
                                      reason: 'Suspensão preventiva pelo administrador',
                                    },
                                    `Usuário ${u.fullName} suspenso.`
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] cursor-pointer"
                              >
                                Suspender
                              </button>
                            )}
                            {u.status !== 'BLOCKED' && (
                              <button
                                type="button"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  callAdminApi(
                                    `/api/admin/users/${u.id}/status`,
                                    'PATCH',
                                    {
                                      status: 'BLOCKED' as UserAccountStatus,
                                      reason: 'Bloqueio de segurança registrado pelo administrador',
                                    },
                                    `Usuário ${u.fullName} bloqueado (desativação lógica).`
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold text-[11px] cursor-pointer"
                              >
                                Bloquear
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.3 GESTÃO DE ORGANIZAÇÕES                                          */}
      {/* =================================================================== */}
      {activeTab === 'organizations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-col justify-between gap-3 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[#FF8A00] font-semibold">
                    {org.type === 'COMPANY'
                      ? 'EMPRESA CONTRATANTE'
                      : org.type === 'CARRIER'
                      ? 'TRANSPORTADORA (ETC)'
                      : org.type === 'DRIVER'
                      ? 'MOTORISTA AUTÔNOMO (TAC)'
                      : 'ADMINISTRAÇÃO GLOBAL'}
                  </span>
                  <span
                    className={`font-semibold ${
                      org.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {org.status === 'ACTIVE' ? 'Organização Ativa' : 'Suspensa'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{org.tradeName}</h3>
                <p className="text-neutral-400">
                  Razão Social: {org.legalName} • CNPJ/CPF:{' '}
                  <strong className="font-mono text-neutral-200">{org.cnpjOrCpf}</strong>
                </p>
                <p className="text-neutral-400">
                  Responsável: <strong className="text-white">{org.responsibleUserName}</strong> ({org.membersCount}{' '}
                  membro(s)) • {org.city}/{org.uf}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#121215] p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-neutral-500 block">Plano Vinculado</span>
                  <strong className="text-white truncate block">{org.activePlanName}</strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Operações</span>
                  <strong className="text-white font-mono">
                    {org.publishedFreightsCount} fretes / {org.completedContractsCount} contr.
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-500 block">Volume Movimentado</span>
                  <strong className="text-[#FF8A00] font-mono">
                    {formatBrl(org.financialVolumeBrl)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {org.status !== 'ACTIVE' ? (
                  <button
                    type="button"
                    onClick={() =>
                      callAdminApi(
                        `/api/admin/organizations/${org.id}/status`,
                        'PATCH',
                        { status: 'ACTIVE', reason: 'Reativação organizacional' },
                        `Organização ${org.tradeName} reativada!`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold cursor-pointer"
                  >
                    Reativar Organização
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      callAdminApi(
                        `/api/admin/organizations/${org.id}/status`,
                        'PATCH',
                        { status: 'SUSPENDED', reason: 'Suspensão administrativa temporária' },
                        `Organização ${org.tradeName} suspensa.`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-semibold cursor-pointer"
                  >
                    Suspender Organização
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.4 GESTÃO DE PLANOS COMERCIAIS                                     */}
      {/* =================================================================== */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commercialSettings.plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#FF8A00]">{plan.cycleLabel}</span>
                    <span
                      className={`font-semibold ${
                        plan.status === 'INACTIVE' ? 'text-neutral-500' : 'text-emerald-400'
                      }`}
                    >
                      {plan.status === 'INACTIVE' ? 'Inativo para novas adesões' : 'Ativo'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{plan.name}</h3>
                  <p className="text-2xl font-bold font-mono text-white mt-2">
                    {formatBrl(plan.priceBrl)}
                  </p>
                  <p className="text-neutral-400 mt-1">
                    Avaliação gratuita: {plan.trialDays} dias • Código: {plan.code}
                  </p>
                  <p className="text-neutral-400 mt-2">{plan.description}</p>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() =>
                      callAdminApi(
                        `/api/admin/plans/${plan.id}`,
                        'PATCH',
                        {
                          status: plan.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
                        },
                        `Status do plano ${plan.name} atualizado (contratos ativos preservados).`
                      )
                    }
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 font-semibold cursor-pointer"
                  >
                    {plan.status === 'INACTIVE' ? 'Reativar Plano' : 'Desativar Novas Adesões'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Criar novo plano comercial */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await callAdminApi(
                '/api/admin/plans',
                'POST',
                {
                  name: newPlanName,
                  cycleLabel: newPlanCycle,
                  priceBrl: newPlanPrice,
                  trialDays: newPlanTrial,
                },
                'Novo plano comercial criado e disponibilizado!'
              );
              if (ok) setNewPlanName('');
            }}
            className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs"
          >
            <div className="md:col-span-2">
              <label htmlFor="new-plan-name" className="block text-neutral-400 mb-1">
                Criar Novo Plano Comercial
              </label>
              <input
                id="new-plan-name"
                type="text"
                required
                placeholder="Ex.: Plano Semestral Frota Corporativa"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="new-plan-cycle" className="block text-neutral-400 mb-1">
                Ciclo
              </label>
              <input
                id="new-plan-cycle"
                type="text"
                value={newPlanCycle}
                onChange={(e) => setNewPlanCycle(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="new-plan-price" className="block text-neutral-400 mb-1">
                Valor (R$)
              </label>
              <input
                id="new-plan-price"
                type="number"
                step="0.10"
                value={newPlanPrice}
                onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Plano</span>
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.5 ASSINATURAS E CONCESSÃO MANUAL GRATUITA (SUPER_ADMIN)           */}
      {/* =================================================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Formulário de Concessão Manual de Assinatura Gratuita */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await callAdminApi(
                '/api/admin/subscriptions/manual-grant',
                'POST',
                {
                  organizationId: grantOrgId,
                  planId: grantPlanId,
                  startDate: grantStartDate,
                  validUntil: grantValidUntil,
                  grantReason,
                  adminNotes: grantAdminNotes,
                },
                'Assinatura gratuita concedida manualmente pelo SUPER_ADMIN com registro em auditoria!'
              );
            }}
            className="rounded-2xl bg-[#181818] border border-[#FF8A00]/40 p-5 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FF8A00]" />
                  <span>
                    Concessão Manual de Assinatura Gratuita (Exclusivo SUPER_ADMIN)
                  </span>
                </h3>
                <p className="text-neutral-400 mt-0.5">
                  Ativa um plano gratuitamente para parceria estratégica, piloto comercial ou cortesia institucional sem gerar pagamento falso no financeiro.
                </p>
              </div>
              {!canGrantManualSub && (
                <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Requer perfil SUPER_ADMIN
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label htmlFor="grant-org" className="block text-neutral-400 mb-1">
                  Organização Beneficiada
                </label>
                <select
                  id="grant-org"
                  value={grantOrgId}
                  onChange={(e) => setGrantOrgId(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                >
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.tradeName} ({o.cnpjOrCpf})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="grant-plan" className="block text-neutral-400 mb-1">
                  Plano Concedido
                </label>
                <select
                  id="grant-plan"
                  value={grantPlanId}
                  onChange={(e) => setGrantPlanId(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                >
                  {commercialSettings.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.cycleLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="grant-start" className="block text-neutral-400 mb-1">
                  Início da Vigência
                </label>
                <input
                  id="grant-start"
                  type="date"
                  value={grantStartDate}
                  onChange={(e) => setGrantStartDate(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="grant-until" className="block text-neutral-400 mb-1">
                  Término da Vigência
                </label>
                <input
                  id="grant-until"
                  type="date"
                  value={grantValidUntil}
                  onChange={(e) => setGrantValidUntil(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="grant-reason" className="block text-neutral-400 mb-1">
                  Motivo da Concessão (Obrigatório)
                </label>
                <input
                  id="grant-reason"
                  type="text"
                  required
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="grant-notes" className="block text-neutral-400 mb-1">
                  Observação Administrativa
                </label>
                <input
                  id="grant-notes"
                  type="text"
                  value={grantAdminNotes}
                  onChange={(e) => setGrantAdminNotes(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
              >
                Conceder Assinatura Gratuita (Concessão Administrativa)
              </button>
            </div>
          </form>

          {/* Lista de Assinaturas */}
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-white text-sm">{sub.organizationName}</strong>
                    <span className="text-neutral-500">•</span>
                    <span className="text-[#FF8A00] font-semibold">{sub.planName}</span>
                    {sub.isManualGrant && (
                      <span className="px-2 py-0.5 rounded bg-[#FF8A00]/20 text-[#FF8A00] font-mono text-[10px]">
                        CONCESSÃO ADMINISTRATIVA
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-400">
                    Responsável: {sub.userName} • Vigência: {formatDateBr(sub.startDate)} até{' '}
                    <strong className="text-white">{formatDateBr(sub.validUntil)}</strong> • Valor:{' '}
                    <strong className="font-mono text-white">{formatBrl(sub.priceBrl)}</strong>
                  </p>
                  {sub.grantReason && (
                    <p className="text-neutral-300 bg-[#121215] px-3 py-1.5 rounded-lg border border-white/5">
                      Motivo da concessão: <strong>{sub.grantReason}</strong> ({sub.grantedBy})
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold px-2.5 py-1 rounded-lg ${
                      sub.status === 'ACTIVE' || sub.status === 'MANUAL_GRANT'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : sub.status === 'TRIAL'
                        ? 'bg-blue-500/15 text-blue-300'
                        : 'bg-red-500/15 text-red-300'
                    }`}
                  >
                    {sub.status === 'ACTIVE'
                      ? 'ATIVA'
                      : sub.status === 'MANUAL_GRANT'
                      ? 'CORTESIA ADMIN'
                      : sub.status === 'TRIAL'
                      ? 'AVALIAÇÃO 15 DIAS'
                      : sub.status === 'OVERDUE'
                      ? 'EM ATRASO'
                      : sub.status === 'SUSPENDED'
                      ? 'SUSPENSA'
                      : 'CANCELADA'}
                  </span>

                  {sub.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() =>
                        callAdminApi(
                          `/api/admin/subscriptions/${sub.id}/status`,
                          'PATCH',
                          {
                            status: 'ACTIVE',
                            validUntil: '2027-11-05',
                            reason: 'Renovação / Reativação administrativa',
                          },
                          `Assinatura de ${sub.organizationName} reativada!`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold cursor-pointer"
                    >
                      Reativar / Estender
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.6 GESTÃO FINANCEIRA E CONCILIAÇÃO DE PAGAMENTOS                   */}
      {/* =================================================================== */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="text-sm font-bold text-white">
                Histórico de Transações, Assinaturas e Taxas de Manutenção
              </h3>
              <p className="text-neutral-400">
                Todo ajuste manual exige justificativa obrigatória auditada. Pagamentos de fretes não ficam em custódia integral na plataforma.
              </p>
            </div>
            <div className="w-full md:w-96">
              <label htmlFor="fin-reason" className="block text-[11px] text-neutral-400 mb-1">
                Justificativa para Ajuste Administrativo:
              </label>
              <input
                id="fin-reason"
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-1.5 text-white"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[#181818] border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 bg-[#141416]">
                    <th className="py-3 px-4">Código / Gateway</th>
                    <th className="py-3 px-4">Organização</th>
                    <th className="py-3 px-4">Descrição / Categoria</th>
                    <th className="py-3 px-4">Método / Vencimento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Conciliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono">
                        <strong className="text-[#FF8A00] block">{p.code}</strong>
                        <span className="text-[10px] text-neutral-500">{p.gatewayReference}</span>
                      </td>
                      <td className="py-3 px-4 text-white">{p.organizationName}</td>
                      <td className="py-3 px-4 text-neutral-300">
                        {p.description}
                        {p.adminAdjustmentNote && (
                          <span className="block text-[10px] text-amber-400">
                            Ajuste: {p.adminAdjustmentNote}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-400">
                        {p.paymentMethod} • {formatDateBr(p.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums">
                        {formatBrl(p.amountBrl)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            p.status === 'CONFIRMED'
                              ? 'text-emerald-400'
                              : p.status === 'PENDING'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {p.status === 'CONFIRMED'
                            ? 'Confirmado'
                            : p.status === 'PENDING'
                            ? 'Pendente'
                            : p.status === 'OVERDUE'
                            ? 'Vencido'
                            : p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.status !== 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() =>
                              callAdminApi(
                                `/api/admin/payments/${p.id}/status`,
                                'PATCH',
                                { status: 'CONFIRMED', reason: adjustReason },
                                `Pagamento ${p.code} confirmado e assinatura regularizada!`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-[11px] cursor-pointer"
                          >
                            Confirmar Liquidação
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.7 GESTÃO DE TAXAS & SNAPSHOTS IMUTÁVEIS EM CONTRATOS              */}
      {/* =================================================================== */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await callAdminApi(
                  '/api/admin/fee-rules',
                  'POST',
                  {
                    name: feeName,
                    companyPercent: feeCompPct,
                    providerPercent: feeProvPct,
                  },
                  'Nova regra de taxa ativada! Contratos anteriores permanecem imutáveis.'
                );
              }}
              className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3.5 text-xs"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#FF8A00]" />
                <span>Configurar Regra de Taxa de Manutenção (Novas Contratações)</span>
              </h3>
              <p className="text-neutral-400">
                Padrão inicial: 3,5% total (1,75% contratante + 1,75% prestador). Mudanças de taxa aplicam-se apenas a novas contratações e nunca alteram contratos já assinados.
              </p>

              <div>
                <label htmlFor="fee-rule-name" className="block text-neutral-400 mb-1">
                  Nome da Regra de Taxa
                </label>
                <input
                  id="fee-rule-name"
                  type="text"
                  value={feeName}
                  onChange={(e) => setFeeName(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="fee-comp" className="block text-neutral-400 mb-1">
                    Contratante (%)
                  </label>
                  <input
                    id="fee-comp"
                    type="number"
                    step="0.05"
                    value={feeCompPct}
                    onChange={(e) => setFeeCompPct(Number(e.target.value))}
                    className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="fee-prov" className="block text-neutral-400 mb-1">
                    Prestador (%)
                  </label>
                  <input
                    id="fee-prov"
                    type="number"
                    step="0.05"
                    value={feeProvPct}
                    onChange={(e) => setFeeProvPct(Number(e.target.value))}
                    className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <span className="block text-neutral-400 mb-1">Soma Validada</span>
                  <div className="rounded-lg bg-[#121215] border border-[#FF8A00]/40 px-3 py-2 font-mono font-bold text-[#FF8A00]">
                    {(feeCompPct + feeProvPct).toFixed(2)}%
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
              >
                Salvar e Ativar Regra para Futuros Contratos
              </button>
            </form>

            {/* Snapshots Imutáveis nos Contratos Firmados */}
            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white">
                Snapshots Imutáveis de Taxas Registrados em Contratos
              </h3>
              <div className="space-y-2.5">
                {contracts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl bg-[#121215] border border-white/5 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="font-mono text-[#FF8A00]">
                        {c.code} ({c.freightCode})
                      </strong>
                      <span className="font-mono text-emerald-400">
                        Snapshot Congelado: {c.totalFeePercent}%
                      </span>
                    </div>
                    <p className="text-neutral-300">
                      Frete Acordado: <strong>{formatBrl(c.agreedFreightValueBrl)}</strong> • Taxa
                      Total: <strong>{formatBrl(c.totalPlatformFeeBrl)}</strong> ({c.companyFeePercent}%
                      contratante + {c.providerFeePercent}% prestador)
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono">
                      Regra: {c.feeSnapshot?.ruleCode || 'NEX-MAINT-3.5'} • Assinado em {c.signedAt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.8 GESTÃO DE INADIMPLÊNCIA                                         */}
      {/* =================================================================== */}
      {activeTab === 'delinquency' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await callAdminApi(
              '/api/admin/delinquency-policy',
              'PUT',
              {
                gracePeriodDays: graceDays,
                preDueNoticeDays: preNoticeDays,
                postDueNoticeDays: postNoticeDays,
                autoSuspensionDays: autoSuspDays,
                allowActiveOperationsCompletion: preserveOps,
                autoReactivateOnPayment: true,
              },
              'Política de inadimplência atualizada no servidor!'
            );
          }}
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4 text-xs"
        >
          <div>
            <h3 className="text-sm font-bold text-white">
              Política de Inadimplência, Carência e Preservação Operacional
            </h3>
            <p className="text-neutral-400 mt-0.5">
              A inadimplência bloqueia apenas novos recursos comerciais após o prazo de suspensão, sem jamais apagar dados ou cancelar operações logísticas em trânsito.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="del-grace" className="block text-neutral-400 mb-1">
                Dias de Carência (Grace Period)
              </label>
              <input
                id="del-grace"
                type="number"
                value={graceDays}
                onChange={(e) => setGraceDays(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="del-pre" className="block text-neutral-400 mb-1">
                Aviso Pré-Vencimento (Dias)
              </label>
              <input
                id="del-pre"
                type="number"
                value={preNoticeDays}
                onChange={(e) => setPreNoticeDays(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="del-post" className="block text-neutral-400 mb-1">
                Aviso Pós-Vencimento (Dias)
              </label>
              <input
                id="del-post"
                type="number"
                value={postNoticeDays}
                onChange={(e) => setPostNoticeDays(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="del-susp" className="block text-neutral-400 mb-1">
                Suspensão Automática (Dias)
              </label>
              <input
                id="del-susp"
                type="number"
                value={autoSuspDays}
                onChange={(e) => setAutoSuspDays(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveOps}
              onChange={(e) => setPreserveOps(e.target.checked)}
              className="accent-[#FF8A00]"
            />
            <span>
              Preservar obrigatoriamente todas as operações logísticas em trânsito e histórico de dados durante suspensão por inadimplência
            </span>
          </label>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
          >
            Salvar Política de Inadimplência
          </button>
        </form>
      )}

      {/* =================================================================== */}
      {/* 5.9 GESTÃO DE COMISSÕES E PARCEIROS                                 */}
      {/* =================================================================== */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await callAdminApi(
                '/api/admin/partners',
                'POST',
                {
                  name: partnerName,
                  cnpjCpf: partnerDoc,
                  cityUf: partnerCity,
                  referralCode: partnerCode,
                  commissionPercent: partnerPct,
                },
                'Novo parceiro comercial cadastrado!'
              );
              if (ok) {
                setPartnerName('');
                setPartnerDoc('');
                setPartnerCode('');
              }
            }}
            className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs"
          >
            <div className="md:col-span-2">
              <label htmlFor="prt-name" className="block text-neutral-400 mb-1">
                Razão Social / Nome do Parceiro
              </label>
              <input
                id="prt-name"
                type="text"
                required
                placeholder="Ex.: Sindicato dos Transportadores de Minas"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="prt-doc" className="block text-neutral-400 mb-1">
                CNPJ / CPF
              </label>
              <input
                id="prt-doc"
                type="text"
                required
                placeholder="19.440.120/0001-80"
                value={partnerDoc}
                onChange={(e) => setPartnerDoc(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="prt-pct" className="block text-neutral-400 mb-1">
                Comissão (%)
              </label>
              <input
                id="prt-pct"
                type="number"
                value={partnerPct}
                onChange={(e) => setPartnerPct(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
            >
              Cadastrar Parceiro
            </button>
          </form>

          {/* Comissões geradas */}
          <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-white">
              Controle de Comissões por Indicação (Proteção Anti-Duplicidade)
            </h3>
            <div className="space-y-2">
              {partnerCommissions.map((cm) => (
                <div
                  key={cm.id}
                  className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <strong className="text-white">{cm.partnerName}</strong>
                    <span className="text-neutral-500 mx-1.5">→</span>
                    <span className="text-neutral-300">
                      Indicação: <strong>{cm.referredOrganizationName}</strong> ({cm.planName})
                    </span>
                    <span className="block text-[11px] text-neutral-400 font-mono mt-0.5">
                      Base: {formatBrl(cm.baseAmountBrl)} • Comissão:{' '}
                      <strong className="text-[#FF8A00]">{formatBrl(cm.commissionAmountBrl)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-neutral-300">
                      {cm.status === 'PAID'
                        ? 'PAGA'
                        : cm.status === 'APPROVED'
                        ? 'APROVADA'
                        : cm.status === 'PENDING'
                        ? 'PENDENTE'
                        : 'CANCELADA'}
                    </span>
                    {cm.status !== 'PAID' && (
                      <button
                        type="button"
                        onClick={() =>
                          callAdminApi(
                            `/api/admin/commissions/${cm.id}/status`,
                            'PATCH',
                            { status: 'PAID' },
                            `Comissão de ${formatBrl(cm.commissionAmountBrl)} liquidada com idempotência!`
                          )
                        }
                        className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold cursor-pointer"
                      >
                        Aprovar e Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5.10 GESTÃO DE PERMISSÕES ADMINISTRATIVAS (MATRIZ RBAC)             */}
      {/* =================================================================== */}
      {activeTab === 'permissions' && (
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white">
              Matriz RBAC de Permissões Administrativas (Princípio do Menor Privilégio)
            </h3>
            <p className="text-neutral-400 mt-0.5">
              Todas as rotas <code className="text-[#FF8A00]">/api/admin/*</code> validam estas permissões diretamente no servidor Express antes de qualquer operação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(
              ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'VERIFICATION'] as UserRole[]
            ).map((role) => (
              <div
                key={role}
                className="rounded-xl bg-[#121215] border border-white/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <strong className="font-mono text-sm text-[#FF8A00]">{role}</strong>
                  <span className="text-[11px] text-neutral-400">
                    {(rolePermissions[role] || []).length} permissões
                  </span>
                </div>
                <ul className="space-y-1 text-[11px] text-neutral-300">
                  {(rolePermissions[role] || []).map((perm: AdminPermissionAction) => (
                    <li key={perm} className="flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FASE D — AUDITORIA ADMINISTRATIVA E RASTREABILIDADE                 */}
      {/* =================================================================== */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white">
            Trilha de Auditoria Imutável (Quem, Perfil, Data/Hora, Ação, Antes/Depois, Resultado)
          </h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl bg-[#121215] border border-white/5 p-3 space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#FF8A00]">{log.action}</span>
                  <span className="font-mono text-neutral-400 text-[11px]">
                    {log.createdAt} • IP {log.originIp || '127.0.0.1'} •{' '}
                    <strong
                      className={
                        log.result === 'DENIED' ? 'text-red-400' : 'text-emerald-400'
                      }
                    >
                      {log.result === 'DENIED'
                        ? 'NEGADO'
                        : log.result === 'ERROR'
                        ? 'ERRO DE VALIDAÇÃO'
                        : 'SUCESSO'}
                    </strong>
                  </span>
                </div>
                <p className="text-neutral-200">{log.details}</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono">
                  <span>
                    Autor: <strong className="text-white">{log.actorName}</strong> ({log.actorRole})
                  </span>
                  <span>Entidade: {log.entityType}/{log.entityId}</span>
                  {log.previousValue && <span>Antes: {log.previousValue}</span>}
                  {log.newValue && <span>Depois: {log.newValue}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* FASE E — CONFIGURAÇÕES GERAIS DA PLATAFORMA                         */}
      {/* =================================================================== */}
      {activeTab === 'settings' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await callAdminApi(
              '/api/admin/platform-settings',
              'PUT',
              {
                supportEmail,
                supportPhone,
                nexgridDefaultRadiusKm: defaultRadius,
                nexiaEnabled,
                nexiaVerifyRequireHumanApproval: humanVerifyRequired,
              },
              'Configurações gerais da plataforma NexCarga salvas!'
            );
          }}
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4 text-xs"
        >
          <h3 className="text-sm font-bold text-white">
            Parâmetros Globais de Operação, NEXGRID, NexIA e PWA
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cfg-email" className="block text-neutral-400 mb-1">
                E-mail Oficial de Suporte
              </label>
              <input
                id="cfg-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="cfg-phone" className="block text-neutral-400 mb-1">
                Telefone Central de Operações
              </label>
              <input
                id="cfg-phone"
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="cfg-radius" className="block text-neutral-400 mb-1">
                Raio Padrão NEXGRID Manhuaçu/MG (km)
              </label>
              <input
                id="cfg-radius"
                type="number"
                value={defaultRadius}
                onChange={(e) => setDefaultRadius(Number(e.target.value))}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={nexiaEnabled}
                onChange={(e) => setNexiaEnabled(e.target.checked)}
                className="accent-[#FF8A00]"
              />
              <span>Habilitar Assistente Inteligente NexIA em todos os dashboards</span>
            </label>
            <label className="flex items-center gap-2 text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={humanVerifyRequired}
                onChange={(e) => setHumanVerifyRequired(e.target.checked)}
                className="accent-[#FF8A00]"
              />
              <span>
                Exigir revisão e aprovação humana obrigatória no NexIA Verify após pré-análise documental
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
          >
            Salvar Configurações Gerais
          </button>
        </form>
      )}
    </div>
  );
};
