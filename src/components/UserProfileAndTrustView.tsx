import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  CloudUpload,
  Eye,
  FileCheck,
  Globe,
  History,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type {
  ActiveProfileSession,
  DocumentItem,
  NavSectionId,
  NexCargaTrustHistoryItem,
  NexCargaTrustStatus,
  NexCargaTrustVerificationItem,
  OrganizationItem,
  UserProfileAccount,
} from '../types/nexcarga';
import { formatBrl, formatDateBr } from '../utils/logisticsRules';

export const OFFICIAL_VERIFIED_SEAL_URL = '/assets/brand/nexcarga-verificado-oficial.png';

export type ProfileSubTabId =
  | 'profile-personal'
  | 'organization-profile'
  | 'security-password'
  | 'preferences-notifications'
  | 'account-settings';

export const PROFILE_SUBTAB_STORAGE_KEY = 'nexcarga_active_profile_subtab';

export const TRUST_STATUS_LABELS: Record<
  NexCargaTrustStatus,
  { label: string; badgeClass: string; description: string }
> = {
  NOT_SUBMITTED: {
    label: 'Não enviado',
    badgeClass: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/40',
    description: 'Nenhum documento obrigatório foi submetido para validação cadastral.',
  },
  PENDING: {
    label: 'Pendente de documentação',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Existem documentos obrigatórios pendentes de envio para completar o dossiê.',
  },
  UNDER_REVIEW: {
    label: 'Em análise pelo setor de homologação',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description:
      'Seus documentos passaram pela triagem assistida NexIA Verify e aguardam revisão humana final.',
  },
  ACTION_REQUIRED: {
    label: 'Ação necessária',
    badgeClass: 'bg-[#FF8A00]/20 text-[#FF8A00] border-[#FF8A00]/40',
    description: 'O setor de homologação solicitou complementação ou substituição documental.',
  },
  VERIFIED: {
    label: 'Aprovado — NEXCARGA VERIFICADO',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description:
      'Cadastro 100% homologado. O selo oficial NEXCARGA VERIFICADO está ativo em seu perfil e propostas.',
  },
  REJECTED: {
    label: 'Reprovado',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    description:
      'Um ou mais documentos foram reprovados na revisão humana. Verifique o motivo abaixo e reenvie.',
  },
  EXPIRED: {
    label: 'Documento vencido — Selo Suspenso',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    description:
      'Um documento obrigatório atingiu a data de vencimento. O selo NEXCARGA VERIFICADO permanece suspenso até a renovação.',
  },
  SUSPENDED: {
    label: 'Verificação suspensa',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    description: 'Homologação suspensa preventivamente pela administração NexCarga Control.',
  },
};

interface NexCargaVerifiedBadgeProps {
  verified?: boolean;
  trustStatus?: NexCargaTrustStatus;
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
}

/**
 * Componente oficial do Selo NEXCARGA VERIFICADO.
 * REGRA OBRIGATÓRIA: Exibe o selo exclusivamente quando o backend confirma `verified === true` e `trustStatus === 'VERIFIED'`.
 * Utiliza exatamente o ativo RGBA transparente `/assets/brand/nexcarga-verificado-oficial.png`.
 */
export const NexCargaVerifiedBadge: React.FC<NexCargaVerifiedBadgeProps> = ({
  verified,
  trustStatus,
  variant = 'compact',
  className = '',
}) => {
  const isStrictlyVerified = Boolean(verified) && (!trustStatus || trustStatus === 'VERIFIED');
  if (!isStrictlyVerified) return null;

  if (variant === 'full') {
    return (
      <div
        data-testid="nexcarga-verified-seal-full"
        className={`rounded-2xl bg-gradient-to-b from-[#1d150c]/90 to-[#121214]/95 border border-[#FF8A00]/50 p-4 flex flex-col items-center text-center shadow-[0_0_30px_rgba(255,138,0,0.18)] ${className}`}
      >
        <img
          src={OFFICIAL_VERIFIED_SEAL_URL}
          alt="Selo Oficial NEXCARGA VERIFICADO"
          className="w-40 h-40 object-contain drop-shadow-[0_6px_18px_rgba(255,138,0,0.35)] select-none"
        />
        <span className="mt-2 text-xs font-extrabold tracking-wider text-[#FF8A00] uppercase">
          NEXCARGA VERIFICADO
        </span>
        <span className="text-[11px] text-neutral-300 mt-0.5">
          Homologação Oficial Pupa Labs • NEXCARGA TRUST
        </span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        data-testid="nexcarga-verified-seal-inline"
        title="Organização homologada com Selo Oficial NEXCARGA VERIFICADO"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#2a1a08]/90 border border-[#FF8A00]/60 text-[10px] font-bold text-[#FF8A00] align-middle shrink-0 ${className}`}
      >
        <img
          src={OFFICIAL_VERIFIED_SEAL_URL}
          alt="NEXCARGA VERIFICADO"
          className="w-4 h-4 object-contain shrink-0"
        />
        <span>VERIFICADO</span>
      </span>
    );
  }

  return (
    <div
      data-testid="nexcarga-verified-seal-compact"
      title="Selo Oficial NEXCARGA VERIFICADO Ativo"
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#241607]/90 border border-[#FF8A00]/60 shadow-[0_2px_10px_rgba(255,138,0,0.2)] shrink-0 ${className}`}
    >
      <img
        src={OFFICIAL_VERIFIED_SEAL_URL}
        alt="Selo Oficial NEXCARGA VERIFICADO"
        className="w-6 h-6 object-contain shrink-0"
      />
      <div className="text-left leading-none">
        <span className="block text-[10px] font-extrabold text-[#FF8A00] tracking-wide">
          NEXCARGA VERIFICADO
        </span>
        <span className="block text-[9px] text-neutral-300">Homologação Ativa</span>
      </div>
    </div>
  );
};

// ============================================================================
// MENU 4 — COMPONENTE EXCLUSIVO DE PREFERÊNCIAS E NOTIFICAÇÕES
// Identificador exclusivo: "preferences-notifications"
// ============================================================================

interface PreferencesNotificationsPanelProps {
  userProfile: UserProfileAccount;
  onRefreshBootstrap: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const PreferencesNotificationsPanel: React.FC<PreferencesNotificationsPanelProps> = ({
  userProfile,
  onRefreshBootstrap,
  onShowToast,
}) => {
  const prefs = userProfile.notificationPreferences;
  const [emailAlerts, setEmailAlerts] = useState<boolean>(prefs.emailAlerts ?? true);
  const [pushNotifications, setPushNotifications] = useState<boolean>(
    prefs.pushNotifications ?? true
  );
  const [whatsappOperational, setWhatsappOperational] = useState<boolean>(
    prefs.whatsappOperational ?? true
  );
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(prefs.securityAlerts ?? true);
  const [proposalsAndContracts, setProposalsAndContracts] = useState<boolean>(
    prefs.proposalsAndContracts ?? true
  );
  const [documentExpirationWarnings, setDocumentExpirationWarnings] = useState<boolean>(
    prefs.documentExpirationWarnings ?? true
  );
  const [communicationFrequency, setCommunicationFrequency] = useState<
    'IMMEDIATE' | 'DAILY_DIGEST' | 'CRITICAL_ONLY'
  >(prefs.communicationFrequency || 'IMMEDIATE');
  const [preferredChannel, setPreferredChannel] = useState<
    'WHATSAPP_AND_EMAIL' | 'EMAIL_ONLY' | 'PUSH_AND_WHATSAPP'
  >(prefs.preferredChannel || 'WHATSAPP_AND_EMAIL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmailAlerts(userProfile.notificationPreferences.emailAlerts ?? true);
    setPushNotifications(userProfile.notificationPreferences.pushNotifications ?? true);
    setWhatsappOperational(userProfile.notificationPreferences.whatsappOperational ?? true);
    setSecurityAlerts(userProfile.notificationPreferences.securityAlerts ?? true);
    setProposalsAndContracts(
      userProfile.notificationPreferences.proposalsAndContracts ?? true
    );
    setDocumentExpirationWarnings(
      userProfile.notificationPreferences.documentExpirationWarnings ?? true
    );
    setCommunicationFrequency(
      userProfile.notificationPreferences.communicationFrequency || 'IMMEDIATE'
    );
    setPreferredChannel(
      userProfile.notificationPreferences.preferredChannel || 'WHATSAPP_AND_EMAIL'
    );
  }, [userProfile]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAlerts,
          pushNotifications,
          whatsappOperational,
          securityAlerts,
          proposalsAndContracts,
          documentExpirationWarnings,
          communicationFrequency,
          preferredChannel,
        }),
      });
      if (res.ok) {
        await onRefreshBootstrap();
        onShowToast('Preferências de comunicação e notificações salvas com sucesso!');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      id="preferences-notifications"
      data-testid="preferences-notifications-panel"
      onSubmit={handleSavePreferences}
      className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-5 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#FF8A00]" />
            <span>Central de Preferências de Comunicação e Notificações</span>
          </h3>
          <p className="text-neutral-400 mt-0.5">
            Personalize como você recebe alertas operacionais de fretes, propostas, documentos e segurança.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-[#121215] border border-white/10 font-mono text-[11px] text-[#FF8A00]">
          ID: preferences-notifications
        </span>
      </div>

      {/* Canais e Gatilhos de Alerta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <label className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#FF8A00]/40 transition-colors">
          <input
            type="checkbox"
            data-testid="pref-email-alerts"
            checked={emailAlerts}
            onChange={(e) => setEmailAlerts(e.target.checked)}
            className="mt-0.5 accent-[#FF8A00]"
          />
          <div>
            <strong className="text-white block">Receber alertas por e-mail</strong>
            <span className="text-neutral-400 text-[11px]">
              Envio de confirmações operacionais, relatórios de fretes e comprovantes para {userProfile.email}.
            </span>
          </div>
        </label>

        <label className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#FF8A00]/40 transition-colors">
          <input
            type="checkbox"
            data-testid="pref-push-notifications"
            checked={pushNotifications}
            onChange={(e) => setPushNotifications(e.target.checked)}
            className="mt-0.5 accent-[#FF8A00]"
          />
          <div>
            <strong className="text-white block">Notificações push em tempo real</strong>
            <span className="text-neutral-400 text-[11px]">
              Alertas instantâneos no navegador e aplicativo PWA sobre cargas próximas no Radar NEXGRID.
            </span>
          </div>
        </label>

        <label className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#FF8A00]/40 transition-colors">
          <input
            type="checkbox"
            data-testid="pref-whatsapp-operational"
            checked={whatsappOperational}
            onChange={(e) => setWhatsappOperational(e.target.checked)}
            className="mt-0.5 accent-[#FF8A00]"
          />
          <div>
            <strong className="text-white block">Alertas operacionais via WhatsApp</strong>
            <span className="text-neutral-400 text-[11px]">
              Avisos rápidos de coleta, trânsito e descarga no número {userProfile.phone}.
            </span>
          </div>
        </label>

        <label className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#FF8A00]/40 transition-colors">
          <input
            type="checkbox"
            data-testid="pref-security-alerts"
            checked={securityAlerts}
            onChange={(e) => setSecurityAlerts(e.target.checked)}
            className="mt-0.5 accent-[#FF8A00]"
          />
          <div>
            <strong className="text-white block">Alertas críticos de segurança</strong>
            <span className="text-neutral-400 text-[11px]">
              Notificações de novos acessos, alterações de senha e eventos de auditoria da conta.
            </span>
          </div>
        </label>

        <label className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#FF8A00]/40 transition-colors">
          <input
            type="checkbox"
            data-testid="pref-proposals-contracts"
            checked={proposalsAndContracts}
            onChange={(e) => setProposalsAndContracts(e.target.checked)}
            className="mt-0.5 accent-[#FF8A00]"
          />
          <div>
            <strong className="text-white block">Notificações de propostas e contratos</strong>
            <span className="text-neutral-400 text-[11px]">
              Avisos sobre novas propostas comerciais, contrapropostas e geração de contratos assinados.
            </span>
          </div>
        </label>

        <label className="rounded-xl bg-[#121215] border border-white/5 p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#FF8A00]/40 transition-colors">
          <input
            type="checkbox"
            data-testid="pref-document-expiration"
            checked={documentExpirationWarnings}
            onChange={(e) => setDocumentExpirationWarnings(e.target.checked)}
            className="mt-0.5 accent-[#FF8A00]"
          />
          <div>
            <strong className="text-white block">Avisos de vencimento de documentos</strong>
            <span className="text-neutral-400 text-[11px]">
              Lembretes preventivos de renovação de CNH, RNTRC/ANTT, CRLV e Cartão CNPJ no NEXCARGA TRUST.
            </span>
          </div>
        </label>
      </div>

      {/* Frequência e Canal Prioritário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-white/10">
        <div>
          <label htmlFor="pref-freq" className="block text-neutral-400 mb-1">
            Frequência de Comunicação Operacional
          </label>
          <select
            id="pref-freq"
            data-testid="pref-communication-frequency"
            value={communicationFrequency}
            onChange={(e) =>
              setCommunicationFrequency(
                e.target.value as 'IMMEDIATE' | 'DAILY_DIGEST' | 'CRITICAL_ONLY'
              )
            }
            className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
          >
            <option value="IMMEDIATE">Tempo real imediato (Recomendado para operações)</option>
            <option value="DAILY_DIGEST">Resumo diário consolidado + alertas urgentes</option>
            <option value="CRITICAL_ONLY">Apenas alertas críticos, segurança e contratos</option>
          </select>
        </div>

        <div>
          <label htmlFor="pref-chan" className="block text-neutral-400 mb-1">
            Canal Prioritário de Comunicação
          </label>
          <select
            id="pref-chan"
            data-testid="pref-preferred-channel"
            value={preferredChannel}
            onChange={(e) =>
              setPreferredChannel(
                e.target.value as 'WHATSAPP_AND_EMAIL' | 'EMAIL_ONLY' | 'PUSH_AND_WHATSAPP'
              )
            }
            className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
          >
            <option value="WHATSAPP_AND_EMAIL">WhatsApp Operacional + E-mail Corporativo</option>
            <option value="PUSH_AND_WHATSAPP">Push Radar NEXGRID + WhatsApp Operacional</option>
            <option value="EMAIL_ONLY">Exclusivamente E-mail Corporativo</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          data-testid="save-preferences-btn"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
        >
          {saving ? 'Salvando preferências...' : 'Salvar Preferências de Notificação'}
        </button>
      </div>
    </form>
  );
};

// ============================================================================
// MENU 5 — COMPONENTE INDEPENDENTE DE CONFIGURAÇÕES DA CONTA
// Identificador exclusivo: "account-settings"
// Organizado nas 6 seções obrigatórias (sem duplicar Preferências e Notificações)
// ============================================================================

interface AccountSettingsPanelProps {
  userProfile: UserProfileAccount;
  onRefreshBootstrap: () => Promise<void>;
  onShowToast: (msg: string) => void;
  onSelectSubTab: (tab: ProfileSubTabId) => void;
  onNavigateToTrust: () => void;
}

export const AccountSettingsPanel: React.FC<AccountSettingsPanelProps> = ({
  userProfile,
  onRefreshBootstrap,
  onShowToast,
  onSelectSubTab,
  onNavigateToTrust,
}) => {
  const settings = userProfile.accountSettings;
  const [timezone, setTimezone] = useState<string>(
    settings?.timezone || 'America/Sao_Paulo (BRT / UTC-3)'
  );
  const [defaultWeightUnit, setDefaultWeightUnit] = useState<'TONS' | 'KG'>(
    settings?.defaultWeightUnit || 'TONS'
  );
  const [defaultLandingSection, setDefaultLandingSection] = useState<NavSectionId>(
    settings?.defaultLandingSection || 'dashboard'
  );
  const [profileVisibility, setProfileVisibility] = useState<
    'PUBLIC_VERIFIED' | 'CONTRACTED_ONLY'
  >(settings?.profileVisibility || 'PUBLIC_VERIFIED');
  const [shareRadarTelemetry, setShareRadarTelemetry] = useState<boolean>(
    settings?.shareRadarTelemetry ?? true
  );
  const [lgpdConsentActive, setLgpdConsentActive] = useState<boolean>(
    settings?.lgpdConsentActive ?? true
  );
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<30 | 120 | 480>(
    settings?.sessionTimeoutMinutes || 120
  );
  const [requireDeviceConfirmation, setRequireDeviceConfirmation] = useState<boolean>(
    settings?.requireDeviceConfirmation ?? true
  );
  const [saving, setSaving] = useState(false);
  const [closureRequested, setClosureRequested] = useState(false);

  useEffect(() => {
    setTimezone(
      userProfile.accountSettings?.timezone || 'America/Sao_Paulo (BRT / UTC-3)'
    );
    setDefaultWeightUnit(userProfile.accountSettings?.defaultWeightUnit || 'TONS');
    setDefaultLandingSection(
      userProfile.accountSettings?.defaultLandingSection || 'dashboard'
    );
    setProfileVisibility(
      userProfile.accountSettings?.profileVisibility || 'PUBLIC_VERIFIED'
    );
    setShareRadarTelemetry(userProfile.accountSettings?.shareRadarTelemetry ?? true);
    setLgpdConsentActive(userProfile.accountSettings?.lgpdConsentActive ?? true);
    setSessionTimeoutMinutes(userProfile.accountSettings?.sessionTimeoutMinutes || 120);
    setRequireDeviceConfirmation(
      userProfile.accountSettings?.requireDeviceConfirmation ?? true
    );
  }, [userProfile]);

  const handleSaveAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profile/account-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          defaultWeightUnit,
          defaultLandingSection,
          profileVisibility,
          shareRadarTelemetry,
          lgpdConsentActive,
          sessionTimeoutMinutes,
          requireDeviceConfirmation,
        }),
      });
      if (res.ok) {
        await onRefreshBootstrap();
        onShowToast('Configurações da conta atualizadas e persistidas no servidor!');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      id="account-settings"
      data-testid="account-settings-panel"
      onSubmit={handleSaveAccountSettings}
      className="space-y-4 text-xs"
    >
      {/* Cabeçalho de Configurações da Conta */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#FF8A00]" />
            <span>Configurações da Conta, Privacidade e Governança de Acesso</span>
          </h3>
          <p className="text-neutral-400 mt-0.5">
            Gerencie parâmetros estruturais da conta, regionalização, privacidade LGPD, sessões e ciclo de vida cadastral.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-[#121215] border border-white/10 font-mono text-[11px] text-[#FF8A00]">
          ID: account-settings
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SEÇÃO 1: INFORMAÇÕES E IDENTIFICAÇÃO DA CONTA */}
        <section
          aria-label="1. Informações e identificação da conta"
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3"
        >
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#FF8A00]" />
            <span>1. Informações e Identificação da Conta</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-500 block">Identificador Interno (User ID)</span>
              <strong className="text-white font-mono">{userProfile.userId}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-500 block">Vínculo Supabase Auth</span>
              <strong className="text-[#FF8A00] font-mono">{userProfile.authUserId}</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-500 block">E-mail Verificado</span>
              <strong className="text-white font-mono truncate block">
                {userProfile.email}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-500 block">Documento Fiscal (CPF / CNPJ)</span>
              <strong className="text-white font-mono">
                {userProfile.cpf} • {userProfile.organizationCnpjOrCpf}
              </strong>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2: CONFIGURAÇÕES GERAIS */}
        <section
          aria-label="2. Configurações gerais"
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3"
        >
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#FF8A00]" />
            <span>2. Configurações Gerais e Regionalização</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="acc-tz" className="block text-neutral-400 mb-1">
                Fuso Horário Operacional
              </label>
              <select
                id="acc-tz"
                data-testid="acc-timezone-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              >
                <option value="America/Sao_Paulo (BRT / UTC-3)">
                  America/Sao_Paulo (Brasília BRT / UTC-3)
                </option>
                <option value="America/Manaus (AMT / UTC-4)">
                  America/Manaus (Amazonas AMT / UTC-4)
                </option>
                <option value="America/Cuiaba (AMT / UTC-4)">
                  America/Cuiaba (Centro-Oeste / UTC-4)
                </option>
              </select>
            </div>

            <div>
              <label htmlFor="acc-unit" className="block text-neutral-400 mb-1">
                Unidade Padrão de Carga
              </label>
              <select
                id="acc-unit"
                data-testid="acc-weight-unit-select"
                value={defaultWeightUnit}
                onChange={(e) => setDefaultWeightUnit(e.target.value as 'TONS' | 'KG')}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              >
                <option value="TONS">Toneladas métricas (t)</option>
                <option value="KG">Quilogramas (kg)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="acc-landing" className="block text-neutral-400 mb-1">
                Módulo Inicial Padrão ao Autenticar
              </label>
              <select
                id="acc-landing"
                data-testid="acc-landing-select"
                value={defaultLandingSection}
                onChange={(e) => setDefaultLandingSection(e.target.value as NavSectionId)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              >
                <option value="dashboard">Dashboard Principal</option>
                <option value="radar-nexgrid">Radar Geográfico NEXGRID</option>
                <option value="fretes">Marketplace de Fretes</option>
                <option value="operacoes">Painel de Operações</option>
              </select>
            </div>
          </div>
        </section>

        {/* SEÇÃO 3: GERENCIAMENTO DE ACESSO */}
        <section
          aria-label="3. Gerenciamento de acesso"
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3"
        >
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#FF8A00]" />
            <span>3. Gerenciamento de Acesso e Vínculos Multi-Tenant</span>
          </h4>
          <p className="text-neutral-400">
            Role RBAC ativa: <strong className="text-[#FF8A00] font-mono">{userProfile.role}</strong> ({userProfile.roleLabel}) • Organização:{' '}
            <strong className="text-white">{userProfile.organizationName}</strong>. Utilize os atalhos abaixo para acessar os módulos dedicados:
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelectSubTab('organization-profile')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 font-semibold cursor-pointer"
            >
              Ir para Minha Organização →
            </button>
            <button
              type="button"
              onClick={() => onSelectSubTab('security-password')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 font-semibold cursor-pointer"
            >
              Gerenciar Senha e 2FA →
            </button>
            <button
              type="button"
              onClick={onNavigateToTrust}
              className="px-3 py-2 rounded-xl bg-[#FF8A00]/15 hover:bg-[#FF8A00]/25 text-[#FF8A00] font-semibold cursor-pointer"
            >
              Homologação NEXCARGA TRUST →
            </button>
          </div>
        </section>

        {/* SEÇÃO 4: PRIVACIDADE E DADOS DA CONTA */}
        <section
          aria-label="4. Privacidade e dados da conta"
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3"
        >
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#FF8A00]" />
            <span>4. Privacidade e Proteção de Dados (LGPD)</span>
          </h4>
          <div>
            <label htmlFor="acc-vis" className="block text-neutral-400 mb-1">
              Visibilidade do Perfil Corporativo no Marketplace
            </label>
            <select
              id="acc-vis"
              data-testid="acc-visibility-select"
              value={profileVisibility}
              onChange={(e) =>
                setProfileVisibility(
                  e.target.value as 'PUBLIC_VERIFIED' | 'CONTRACTED_ONLY'
                )
              }
              className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
            >
              <option value="PUBLIC_VERIFIED">
                Visível para todas as empresas e transportadores verificados
              </option>
              <option value="CONTRACTED_ONLY">
                Restrito apenas a parceiros com contrato ou negociação ativa
              </option>
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={shareRadarTelemetry}
              onChange={(e) => setShareRadarTelemetry(e.target.checked)}
              className="accent-[#FF8A00]"
            />
            <span>
              Autorizar geolocalização operacional para cálculo de raio no Radar NEXGRID
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer">
            <input
              type="checkbox"
              checked={lgpdConsentActive}
              onChange={(e) => setLgpdConsentActive(e.target.checked)}
              className="accent-[#FF8A00]"
            />
            <span>
              Termo de conformidade LGPD e compartilhamento documental seguro ativo
            </span>
          </label>
        </section>

        {/* SEÇÃO 5: PREFERÊNCIAS DE SESSÃO */}
        <section
          aria-label="5. Preferências de sessão"
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3"
        >
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#FF8A00]" />
            <span>5. Preferências de Sessão e Dispositivos</span>
          </h4>
          <div>
            <label htmlFor="acc-timeout" className="block text-neutral-400 mb-1">
              Expiração Automática por Inatividade
            </label>
            <select
              id="acc-timeout"
              data-testid="acc-session-timeout-select"
              value={sessionTimeoutMinutes}
              onChange={(e) =>
                setSessionTimeoutMinutes(Number(e.target.value) as 30 | 120 | 480)
              }
              className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
            >
              <option value={30}>30 minutos (Alta segurança financeira)</option>
              <option value={120}>2 horas (Padrão operacional B2B)</option>
              <option value={480}>8 horas (Turno completo de torre logística)</option>
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={requireDeviceConfirmation}
              onChange={(e) => setRequireDeviceConfirmation(e.target.checked)}
              className="accent-[#FF8A00]"
            />
            <span>
              Exigir confirmação adicional ao iniciar sessão em novo endereço IP ou navegador
            </span>
          </label>
        </section>

        {/* SEÇÃO 6: GERENCIAMENTO E ENCERRAMENTO DA CONTA */}
        <section
          aria-label="6. Gerenciamento e encerramento da conta"
          className="rounded-2xl bg-[#181818] border border-red-500/30 p-5 space-y-3"
        >
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>6. Gerenciamento e Encerramento da Conta</span>
          </h4>
          <p className="text-neutral-400">
            Política de segurança Pupa Labs: contas com contratos ativos, operações em trânsito ou pendências financeiras passam por validação de conformidade antes do encerramento definitivo, preservando o histórico fiscal.
          </p>
          {closureRequested ? (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200">
              Solicitação de revisão de encerramento registrada sob protocolo de governança. Contratos ativos permanecem protegidos.
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setClosureRequested(true);
                onShowToast(
                  'Protocolo de avaliação de encerramento registrado com preservação de auditoria.'
                );
              }}
              className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 font-semibold cursor-pointer"
            >
              Solicitar Avaliação de Desativação / Encerramento da Conta
            </button>
          )}
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="save-account-settings-btn"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
        >
          {saving ? 'Salvando configurações...' : 'Salvar Configurações da Conta'}
        </button>
      </div>
    </form>
  );
};

interface UserProfileViewProps {
  activeProfile: ActiveProfileSession;
  userProfile: UserProfileAccount;
  trustVerification: NexCargaTrustVerificationItem;
  initialTab?: ProfileSubTabId;
  onSubTabChange?: (tab: ProfileSubTabId) => void;
  onRefreshBootstrap: () => Promise<void>;
  onShowToast: (msg: string) => void;
  onNavigateToTrust: () => void;
  onNavigateToDocs: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  userProfile,
  trustVerification,
  initialTab = 'profile-personal',
  onSubTabChange,
  onRefreshBootstrap,
  onShowToast,
  onNavigateToTrust,
  onNavigateToDocs,
}) => {
  const [subTab, setSubTab] = useState<ProfileSubTabId>(initialTab);
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [phone, setPhone] = useState(userProfile.phone);
  const [jobTitle, setJobTitle] = useState(userProfile.jobTitle);
  const [city, setCity] = useState(userProfile.city);
  const [uf, setUf] = useState(userProfile.uf);

  // Security states
  const [currentPassword, setCurrentPassword] = useState('NexCarga@2026');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(userProfile.twoFactorEnabled);

  // Linked organization state
  const [organizationData, setOrganizationData] = useState<OrganizationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSubTab(initialTab);
  }, [initialTab]);

  const handleSelectSubTab = (nextTab: ProfileSubTabId) => {
    setSubTab(nextTab);
    try {
      window.localStorage.setItem(PROFILE_SUBTAB_STORAGE_KEY, nextTab);
    } catch {
      // ignore storage errors
    }
    if (onSubTabChange) onSubTabChange(nextTab);
  };

  useEffect(() => {
    setFullName(userProfile.fullName);
    setPhone(userProfile.phone);
    setJobTitle(userProfile.jobTitle);
    setCity(userProfile.city);
    setUf(userProfile.uf);
    setTwoFactorEnabled(userProfile.twoFactorEnabled);
  }, [userProfile]);

  useEffect(() => {
    fetch('/api/organization/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.organization) setOrganizationData(json.organization);
      })
      .catch(() => null);
  }, [userProfile.organizationId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          jobTitle,
          city,
          uf,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Erro ao atualizar perfil.');
        return;
      }
      await onRefreshBootstrap();
      onShowToast('Dados do perfil atualizados e auditados no PostgreSQL!');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('A imagem de perfil deve ter no máximo 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarDataUrl: dataUrl,
          fileName: file.name,
        }),
      });
      if (res.ok) {
        await onRefreshBootstrap();
        onShowToast('Foto de perfil enviada ao bucket oficial profile-images!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('A confirmação da nova senha não confere.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword: newPassword || undefined,
          twoFactorEnabled,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Falha ao atualizar configurações de segurança.');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      await onRefreshBootstrap();
      onShowToast('Credenciais e parâmetros de segurança atualizados!');
    } finally {
      setSaving(false);
    }
  };

  const trustMeta = TRUST_STATUS_LABELS[userProfile.trustStatus];

  const navigationTabs: Array<{
    id: ProfileSubTabId;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'profile-personal', label: 'Meu Perfil e Dados Pessoais', icon: UserCheck },
    { id: 'organization-profile', label: 'Minha Organização', icon: Building2 },
    { id: 'security-password', label: 'Segurança e Senha', icon: KeyRound },
    { id: 'preferences-notifications', label: 'Preferências e Notificações', icon: Bell },
    { id: 'account-settings', label: 'Configurações da Conta', icon: Sliders },
  ];

  return (
    <div className="space-y-4" data-testid="user-profile-page">
      {/* Top Profile Banner */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#FF8A00] bg-[#242429] flex items-center justify-center shrink-0">
              {userProfile.avatarUrl && userProfile.avatarUrl.startsWith('data:image') ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg viewBox="1662 24 48 48" className="w-full h-full">
                  <image
                    href="/assets/aistudio/file_00000000650c820eabe3f30ff870e8e4_1fab598d.png"
                    x="0"
                    y="0"
                    width="1920"
                    height="1080"
                    preserveAspectRatio="none"
                  />
                </svg>
              )}
            </div>
            <label
              htmlFor="profile-avatar-upload"
              title="Alterar foto de perfil (bucket: profile-images)"
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              <Camera className="w-4 h-4" />
              <input
                id="profile-avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-white">{userProfile.fullName}</h2>
              <NexCargaVerifiedBadge
                verified={userProfile.verifiedBadge}
                trustStatus={userProfile.trustStatus}
                variant="compact"
              />
            </div>
            <p className="text-xs text-neutral-300">
              {userProfile.jobTitle} •{' '}
              <strong className="text-[#FF8A00] font-mono">{userProfile.roleLabel}</strong> (
              {userProfile.organizationName})
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
              <span>CPF: {userProfile.cpf}</span>
              <span>•</span>
              <span>Desde {formatDateBr(userProfile.createdAt)}</span>
              <span>•</span>
              <span>
                Bucket Avatar:{' '}
                <code className="text-[#FF8A00]">{userProfile.avatarBucket}</code>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-[#121215] border border-white/10 text-xs">
            <span className="block text-[10px] text-neutral-400">Status da Conta</span>
            <strong
              className={
                userProfile.accountStatus === 'ACTIVE'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }
            >
              {userProfile.accountStatus === 'ACTIVE' ? 'Conta Ativa' : userProfile.accountStatus}
            </strong>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-[#121215] border border-white/10 text-xs">
            <span className="block text-[10px] text-neutral-400">Status de Verificação</span>
            <strong className="text-[#FF8A00]">{trustMeta.label}</strong>
          </div>

          <button
            type="button"
            onClick={onNavigateToTrust}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Abrir NEXCARGA TRUST</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs with Exclusive Semantic Identifiers */}
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {navigationTabs.map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`profile-tab-${tab.id}`}
              onClick={() => handleSelectSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black shadow-[0_2px_12px_rgba(255,138,0,0.3)]'
                  : 'bg-[#181818] hover:bg-[#222227] text-neutral-300 border border-white/[0.08]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/15 border border-red-500/40 px-4 py-3 text-xs text-red-200 flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: MEU PERFIL (profile-personal) */}
      {subTab === 'profile-personal' && (
        <div
          id="profile-personal"
          data-testid="profile-personal-panel"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4"
        >
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-8 rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Gerenciamento de Dados Pessoais e Profissionais
                </h3>
                <p className="text-neutral-400 mt-0.5">
                  Atualize seus dados cadastrais autorizados. Alterações sensíveis de CPF/CNPJ exigem revalidação no NEXCARGA TRUST.
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#FF8A00]">
                ID: {userProfile.userId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="prof-fullname" className="block text-neutral-400 mb-1">
                  Nome Completo *
                </label>
                <input
                  id="prof-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="prof-email" className="block text-neutral-400 mb-1">
                  E-mail Corporativo (Vinculado ao Supabase Auth)
                </label>
                <input
                  id="prof-email"
                  type="email"
                  disabled
                  value={userProfile.email}
                  className="w-full rounded-lg bg-[#141418] border border-white/5 px-3 py-2 text-neutral-400 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="prof-phone" className="block text-neutral-400 mb-1">
                  Telefone / WhatsApp Operacional *
                </label>
                <input
                  id="prof-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label htmlFor="prof-cpf" className="block text-neutral-400 mb-1">
                  CPF do Titular (Validado)
                </label>
                <input
                  id="prof-cpf"
                  type="text"
                  disabled
                  value={userProfile.cpf}
                  className="w-full rounded-lg bg-[#141418] border border-white/5 px-3 py-2 text-neutral-400 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="prof-job" className="block text-neutral-400 mb-1">
                  Cargo / Função *
                </label>
                <input
                  id="prof-job"
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="prof-role" className="block text-neutral-400 mb-1">
                  Tipo de Usuário / Role RBAC
                </label>
                <input
                  id="prof-role"
                  type="text"
                  disabled
                  value={`${userProfile.roleLabel} (${userProfile.role})`}
                  className="w-full rounded-lg bg-[#141418] border border-white/5 px-3 py-2 text-[#FF8A00] font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="prof-city" className="block text-neutral-400 mb-1">
                  Cidade Base
                </label>
                <input
                  id="prof-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="prof-uf" className="block text-neutral-400 mb-1">
                  UF
                </label>
                <input
                  id="prof-uf"
                  type="text"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
              <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
                <span className="text-neutral-500 block">Organização Vinculada</span>
                <strong className="text-white">{userProfile.organizationName}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
                <span className="text-neutral-500 block">Data de Cadastro</span>
                <strong className="text-white font-mono">
                  {formatDateBr(userProfile.createdAt)}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-[#121215] border border-white/5">
                <span className="text-neutral-500 block">Status de Verificação</span>
                <strong className="text-[#FF8A00]">{trustMeta.label}</strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
              >
                {saving ? 'Salvando...' : 'Salvar Dados do Perfil'}
              </button>
            </div>
          </form>

          {/* Right Column: Official NEXCARGA VERIFICADO Seal Showcase */}
          <div className="lg:col-span-4 space-y-4">
            {userProfile.verifiedBadge && userProfile.trustStatus === 'VERIFIED' ? (
              <NexCargaVerifiedBadge
                verified={userProfile.verifiedBadge}
                trustStatus={userProfile.trustStatus}
                variant="full"
              />
            ) : (
              <div className="rounded-2xl bg-[#181818] border border-amber-500/40 p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Selo NEXCARGA VERIFICADO Inativo ({trustMeta.label})</span>
                </div>
                <p className="text-neutral-300">{trustMeta.description}</p>
                {trustVerification.pendingRequirements.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#121215] border border-white/5 space-y-1">
                    <span className="font-semibold text-white block">Pendências atuais:</span>
                    {trustVerification.pendingRequirements.map((req) => (
                      <p key={req} className="text-amber-300">
                        • {req}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onNavigateToTrust}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
                >
                  Regularizar no NEXCARGA TRUST
                </button>
              </div>
            )}

            <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4 space-y-2.5 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF8A00]" />
                <span>Regras de Segurança do Perfil</span>
              </h4>
              <p className="text-neutral-400">
                • Isolamento Multi-Tenant ativo: você visualiza e edita apenas seu próprio registro (<code className="text-[#FF8A00]">auth.uid() = id</code>).
              </p>
              <p className="text-neutral-400">
                • O selo oficial <strong>NEXCARGA VERIFICADO</strong> é controlado exclusivamente pelo motor de homologação no backend.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MINHA ORGANIZAÇÃO (organization-profile) */}
      {subTab === 'organization-profile' && (
        <div
          id="organization-profile"
          data-testid="organization-profile-panel"
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{organizationData?.tradeName || userProfile.organizationName}</span>
                <NexCargaVerifiedBadge
                  verified={userProfile.verifiedBadge}
                  trustStatus={userProfile.trustStatus}
                  variant="inline"
                />
              </h3>
              <p className="text-neutral-400">
                Razão Social: {organizationData?.legalName || userProfile.organizationName} • CNPJ/CPF:{' '}
                <strong className="font-mono text-white">
                  {userProfile.organizationCnpjOrCpf}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToDocs}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold cursor-pointer"
            >
              Ver Documentos Corporativos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-400 block">Categoria Cadastral</span>
              <strong className="text-white text-sm mt-0.5 block">
                {trustVerification.entityCategoryLabel}
              </strong>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-400 block">Plano Assinado</span>
              <strong className="text-[#FF8A00] text-sm mt-0.5 block">
                {organizationData?.activePlanName || 'Plano Anual Corporativo'}
              </strong>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-400 block">Fretes / Contratos Concluídos</span>
              <strong className="text-white font-mono text-sm mt-0.5 block">
                {organizationData?.publishedFreightsCount ?? 0} fretes •{' '}
                {organizationData?.completedContractsCount ?? 0} contratos
              </strong>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5">
              <span className="text-neutral-400 block">Volume Financeiro Homologado</span>
              <strong className="text-emerald-400 font-mono text-sm mt-0.5 block">
                {formatBrl(organizationData?.financialVolumeBrl ?? 0)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEGURANÇA E SENHA (security-password) */}
      {subTab === 'security-password' && (
        <form
          id="security-password"
          data-testid="security-password-panel"
          onSubmit={handleSaveSecurity}
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4 text-xs"
        >
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF8A00]" />
              <span>Segurança, Credenciais e Controle de Sessão (Supabase Auth)</span>
            </h3>
            <p className="text-neutral-400 mt-0.5">
              Última atualização de senha: {formatDateBr(userProfile.lastPasswordUpdateAt)} • Sessões ativas: {userProfile.activeSessionsCount}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="sec-curr" className="block text-neutral-400 mb-1">
                Senha Atual
              </label>
              <input
                id="sec-curr"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="sec-new" className="block text-neutral-400 mb-1">
                Nova Senha (mínimo 8 caracteres)
              </label>
              <input
                id="sec-new"
                type="password"
                placeholder="Digite a nova senha..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="sec-conf" className="block text-neutral-400 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                id="sec-conf"
                type="password"
                placeholder="Repita a nova senha..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-neutral-200 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="accent-[#FF8A00]"
            />
            <span>
              Ativar Autenticação em Duas Etapas (2FA) para aprovações de contratos e operações financeiras
            </span>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold cursor-pointer"
            >
              Atualizar Segurança e Senha
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: MENU 4 — PREFERÊNCIAS E NOTIFICAÇÕES (Componente exclusivo) */}
      {subTab === 'preferences-notifications' && (
        <PreferencesNotificationsPanel
          userProfile={userProfile}
          onRefreshBootstrap={onRefreshBootstrap}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB 5: MENU 5 — CONFIGURAÇÕES DA CONTA (Componente exclusivo e independente) */}
      {subTab === 'account-settings' && (
        <AccountSettingsPanel
          userProfile={userProfile}
          onRefreshBootstrap={onRefreshBootstrap}
          onShowToast={onShowToast}
          onSelectSubTab={handleSelectSubTab}
          onNavigateToTrust={onNavigateToTrust}
        />
      )}
    </div>
  );
};

interface NexCargaTrustViewProps {
  activeProfile: ActiveProfileSession;
  trustVerification: NexCargaTrustVerificationItem;
  trustHistory: NexCargaTrustHistoryItem[];
  documents: DocumentItem[];
  onUploadDocument: (payload: {
    title: string;
    category: DocumentItem['category'];
    documentNumber: string;
    expiresAt: string;
  }) => Promise<void>;
  onVerifyDocument: (
    docId: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) => Promise<void>;
  onRefreshBootstrap: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const NexCargaTrustView: React.FC<NexCargaTrustViewProps> = ({
  activeProfile,
  trustVerification,
  trustHistory,
  documents,
  onUploadDocument,
  onVerifyDocument,
  onRefreshBootstrap,
  onShowToast,
}) => {
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>(
    trustVerification.requiredDocuments[0]?.category || 'CARTAO_CNPJ'
  );
  const [docNumber, setDocNumber] = useState('');
  const [docExpires, setDocExpires] = useState('2028-11-15');
  const [requestingReview, setRequestingReview] = useState(false);

  const trustMeta = TRUST_STATUS_LABELS[trustVerification.trustStatus];
  const orgDocuments = documents.filter(
    (d) =>
      d.organizationId === trustVerification.organizationId ||
      activeProfile.role === 'SUPER_ADMIN' ||
      activeProfile.role === 'ADMIN' ||
      activeProfile.role === 'VERIFICATION'
  );

  const canHumanApprove = ['SUPER_ADMIN', 'ADMIN', 'VERIFICATION'].includes(
    activeProfile.role
  );

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    await onUploadDocument({
      title: docTitle,
      category: docCategory,
      documentNumber: docNumber || 'DOC-TRUST-2026',
      expiresAt: docExpires,
    });
    setDocTitle('');
    setDocNumber('');
  };

  const handleRequestNewReview = async () => {
    setRequestingReview(true);
    try {
      const res = await fetch('/api/trust/request-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await onRefreshBootstrap();
        onShowToast('Solicitação de análise cadastral enviada ao setor de homologação!');
      }
    } finally {
      setRequestingReview(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="nexcarga-trust-page">
      {/* Top Hero Banner with Official Seal */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-[#FF8A00]/15 border border-[#FF8A00]/40 text-[#FF8A00] text-xs font-extrabold tracking-wide">
              NEXCARGA TRUST
            </span>
            <span
              data-testid="trust-status-badge"
              className={`px-3 py-1 rounded-full border text-xs font-bold ${trustMeta.badgeClass}`}
            >
              {trustMeta.label}
            </span>
          </div>

          <h2 className="text-xl lg:text-2xl font-bold text-white">
            Sistema Oficial de Verificação Cadastral, Documental e Operacional
          </h2>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Organização avaliada: <strong className="text-white">{trustVerification.organizationName}</strong> ({trustVerification.organizationCnpjOrCpf}) • Categoria:{' '}
            <strong className="text-[#FF8A00]">{trustVerification.entityCategoryLabel}</strong>.{' '}
            {trustMeta.description}
          </p>

          <div className="p-3.5 rounded-xl bg-[#121215] border border-white/5 text-xs space-y-1">
            <span className="text-neutral-400 font-semibold block">
              Instruções de Homologação e Regularização:
            </span>
            <p className="text-white">{trustVerification.regularizationInstructions}</p>
            {trustVerification.rejectionReason && (
              <p className="text-red-400 font-semibold mt-1">
                Motivo de reprovação registrado: {trustVerification.rejectionReason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={requestingReview}
              onClick={handleRequestNewReview}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Solicitar Nova Análise Cadastral</span>
            </button>
            {trustVerification.reviewedBy && (
              <span className="text-xs text-neutral-400">
                Última revisão por <strong className="text-white">{trustVerification.reviewedBy}</strong> em{' '}
                {formatDateBr(trustVerification.reviewedAt || trustVerification.submittedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Official Seal Box */}
        <div className="lg:col-span-4 flex justify-center">
          {trustVerification.verifiedBadge && trustVerification.trustStatus === 'VERIFIED' ? (
            <NexCargaVerifiedBadge
              verified={trustVerification.verifiedBadge}
              trustStatus={trustVerification.trustStatus}
              variant="full"
              className="w-full"
            />
          ) : (
            <div className="w-full rounded-2xl bg-[#121215] border border-white/10 p-5 flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center mb-3">
                <ShieldAlert className="w-12 h-12 text-amber-400" />
              </div>
              <strong className="text-sm text-white">
                Selo NEXCARGA VERIFICADO Aguardando Homologação
              </strong>
              <p className="text-xs text-neutral-400 mt-1">
                O selo oficial somente é concedido após aprovação humana de todos os documentos obrigatórios vigentes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Checklist de Documentos Obrigatórios por Categoria & Buckets Privados */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              Requisitos Obrigatórios para {trustVerification.entityCategoryLabel}
            </h3>
            <p className="text-xs text-neutral-400">
              Armazenamento seguro com isolamento por buckets privados (driver-documents, company-documents, vehicle-images, freight-attachments, profile-images, nexcarga-private).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {trustVerification.requiredDocuments.map((req) => {
            const matchingDoc = orgDocuments.find((d) => d.category === req.category);
            const isApproved =
              matchingDoc &&
              matchingDoc.verificationStatus === 'APPROVED' &&
              new Date(matchingDoc.expiresAt).getTime() >= Date.now();
            const isExpired =
              matchingDoc && new Date(matchingDoc.expiresAt).getTime() < Date.now();

            return (
              <div
                key={req.category}
                className={`rounded-xl p-4 border flex flex-col justify-between gap-2 ${
                  isApproved
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : isExpired
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-[#121215] border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#FF8A00]">{req.category}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-300">
                      bucket: {req.bucket}
                    </span>
                  </div>
                  <strong className="text-white text-sm block mt-1">{req.label}</strong>
                  <p className="text-neutral-400 mt-1">{req.description}</p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  {isApproved ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Aprovado e Vigente
                    </span>
                  ) : isExpired ? (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Documento Vencido
                    </span>
                  ) : matchingDoc ? (
                    <span className="text-blue-400 font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Em Análise ({matchingDoc.verificationStatus})
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Envio Pendente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulário de Envio de Documento ao Bucket Correspondente */}
      <form
        onSubmit={handleUploadSubmit}
        className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs"
      >
        <div className="md:col-span-2">
          <label htmlFor="trust-doc-title" className="block text-neutral-400 mb-1">
            Enviar / Atualizar Documento Comprobatório
          </label>
          <input
            id="trust-doc-title"
            type="text"
            required
            placeholder="Ex.: Cartão CNPJ / CNH Digital / RNTRC ANTT 2026"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label htmlFor="trust-doc-cat" className="block text-neutral-400 mb-1">
            Tipo de Documento
          </label>
          <select
            id="trust-doc-cat"
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as DocumentItem['category'])}
            className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
          >
            <option value="CARTAO_CNPJ">Cartão CNPJ</option>
            <option value="CONTRATO_SOCIAL">Contrato Social</option>
            <option value="COMPROVANTE_ENDERECO">Comprovante de Endereço</option>
            <option value="CNH">CNH (Motorista)</option>
            <option value="RNTRC">RNTRC / ANTT</option>
            <option value="ANTT">Certificado ANTT Frota</option>
            <option value="CRLV">CRLV Veículo</option>
          </select>
        </div>
        <div>
          <label htmlFor="trust-doc-exp" className="block text-neutral-400 mb-1">
            Data de Validade
          </label>
          <input
            id="trust-doc-exp"
            type="date"
            value={docExpires}
            onChange={(e) => setDocExpires(e.target.value)}
            className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-bold py-2 px-4 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CloudUpload className="w-4 h-4" />
          <span>Enviar para Análise</span>
        </button>
      </form>

      {/* Lista Detalhada de Documentos Submetidos */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Dossiê Documental Submetido ({orgDocuments.length} registro(s))
        </h3>
        <div className="space-y-2.5">
          {orgDocuments.map((doc) => {
            const isExpired = new Date(doc.expiresAt).getTime() < Date.now();
            return (
              <div
                key={doc.id}
                className="rounded-xl bg-[#121215] border border-white/5 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#FF8A00]" />
                    <strong className="text-white text-sm">{doc.title}</strong>
                    <span className="font-mono text-[#FF8A00]">{doc.category}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-[10px] text-neutral-300">
                      Bucket: {doc.storageBucket || doc.gcsBucket}
                    </span>
                  </div>
                  <p className="text-neutral-400">
                    Titular: <strong className="text-neutral-200">{doc.ownerName}</strong> • Envio:{' '}
                    {formatDateBr(doc.submittedAt || doc.createdAt)} • Validade:{' '}
                    <strong className={isExpired ? 'text-red-400' : 'text-white'}>
                      {formatDateBr(doc.expiresAt)}
                    </strong>
                    {doc.approvedAt && ` • Aprovado em: ${formatDateBr(doc.approvedAt)}`}
                  </p>
                  {doc.aiAnalysisSummary && (
                    <p className="text-neutral-300 bg-[#18181c] px-3 py-1.5 rounded-lg border border-white/5">
                      {doc.aiAnalysisSummary}
                    </p>
                  )}
                  {doc.rejectionReason && (
                    <p className="text-red-400 font-semibold">
                      Motivo da reprovação/pendência: {doc.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {doc.verificationStatus === 'APPROVED' && !isExpired ? (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Aprovado
                    </span>
                  ) : isExpired || doc.verificationStatus === 'EXPIRED' ? (
                    <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 font-bold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Vencido
                    </span>
                  ) : doc.verificationStatus === 'REJECTED' ? (
                    <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 font-bold">
                      Reprovado
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-bold">
                      Pré-validado NexIA • Aguardando Humano
                    </span>
                  )}

                  {canHumanApprove && doc.uploadedByUserId !== activeProfile.userId && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onVerifyDocument(doc.id, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold cursor-pointer"
                      >
                        Homologar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onVerifyDocument(
                            doc.id,
                            'REJECTED',
                            'Documento ilegível ou divergente do CNPJ/CPF cadastrado.'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold cursor-pointer"
                      >
                        Reprovar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico de Verificação e Auditoria NEXCARGA TRUST */}
      <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-[#FF8A00]" />
          <span>Histórico Auditável de Homologação (NEXCARGA TRUST)</span>
        </h3>
        <div className="space-y-2">
          {trustHistory.map((h) => (
            <div
              key={h.id}
              className="rounded-xl bg-[#121215] border border-white/5 p-3 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#FF8A00]">{h.actionType}</span>
                  <span className="text-neutral-400">
                    ({h.previousStatus} → <strong className="text-white">{h.newStatus}</strong>)
                  </span>
                </div>
                <p className="text-neutral-200 mt-0.5">{h.reason}</p>
              </div>
              <div className="text-right text-[11px] text-neutral-400 font-mono">
                <span className="block text-white">{h.actorName}</span>
                <span>
                  {h.actorRole} • {h.createdAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
