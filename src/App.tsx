import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Coins,
  CreditCard,
  Download,
  FileText,
  Folder,
  Handshake,
  HelpCircle,
  Home,
  MapPin,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  BootstrapResponse,
  DocumentItem,
  FreightItem,
  NavSectionId,
  OperationStatus,
  UserRole,
} from './types/nexcarga';
import { canRoleAccessSection, formatBrl } from './utils/logisticsRules';
import { NexGridMap } from './components/NexGridMap';
import { NexIAPanel } from './components/NexIAPanel';
import { FreightDetailModal, PublishFreightModal } from './components/ModalsAndForms';
import { ModuleViews } from './components/ModuleViews';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';

export default function App() {
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<boolean>(false);
  const [publishModalOpen, setPublishModalOpen] = useState<boolean>(false);
  const [selectedFreight, setSelectedFreight] = useState<FreightItem | null>(null);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const fetchBootstrap = async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Falha ao carregar dados da plataforma.');
      const json = (await res.json()) as BootstrapResponse;
      setData(json);
    } catch (err) {
      console.error('[NexCarga Bootstrap Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const handleSwitchRole = async (role: UserRole) => {
    setRoleDropdownOpen(false);
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        await fetchBootstrap();
        setActiveSection('dashboard');
        showToast(`Sessão alternada para o perfil ${role}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishFreight = async (newFreightPayload: {
    originCity: string;
    originUf: string;
    originCep: string;
    originStreet: string;
    originNumber: string;
    originComplement: string;
    originNeighborhood: string;
    destinationCity: string;
    destinationUf: string;
    destinationCep: string;
    destinationStreet: string;
    destinationNumber: string;
    destinationComplement: string;
    destinationNeighborhood: string;
    distanceKm: number;
    cargoType: string;
    vehicleRequired: string;
    implementRequired: string;
    weightKg: number;
    volumeM3: number;
    offeredValueBrl: number;
    pickupDate: string;
    deliveryDate: string;
    visibility: 'PUBLIC' | 'INVITED_ONLY' | 'PRIVATE';
    notes: string;
  }) => {
    const res = await fetch('/api/freights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFreightPayload),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Não foi possível publicar o frete.');
    }
    await fetchBootstrap();
    showToast(`Frete ${result.freight.code} geocodificado e publicado no Radar NEXGRID!`);
  };

  const handleSubmitProposal = async (payload: {
    freightId: string;
    driverName: string;
    driverRntrc: string;
    vehicleDescription: string;
    proposedValueBrl: number;
    estimatedDeliveryDays: number;
    notes: string;
  }) => {
    const res = await fetch('/api/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Erro ao enviar proposta.');
    }
    await fetchBootstrap();
    showToast('Proposta comercial enviada e registrada!');
  };

  const handleProposalDecision = async (
    proposalId: string,
    decision: 'ACCEPT' | 'COUNTER' | 'REJECT',
    counterValueBrl?: number
  ) => {
    const res = await fetch(`/api/proposals/${proposalId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, counterValueBrl }),
    });
    if (res.ok) {
      await fetchBootstrap();
      showToast(
        decision === 'ACCEPT'
          ? 'Proposta aceita! Contrato com snapshot imutável de taxa e Operação gerados.'
          : 'Status da proposta atualizado.'
      );
    }
  };

  const handleUpdateOperationStatus = async (
    operationId: string,
    status: OperationStatus
  ) => {
    const res = await fetch(`/api/operations/${operationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchBootstrap();
      showToast(`Operação atualizada para "${status}".`);
    }
  };

  const handleUploadDocument = async (payload: {
    title: string;
    category: DocumentItem['category'];
    documentNumber: string;
    expiresAt: string;
  }) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchBootstrap();
      showToast('Documento enviado ao repositório NexCarga Docs e analisado pela NexIA Verify.');
    }
  };

  const handleVerifyDocument = async (
    docId: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    const res = await fetch(`/api/documents/${docId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await fetchBootstrap();
      showToast(
        status === 'APPROVED'
          ? 'Documento homologado com sucesso!'
          : 'Documento reprovado na revisão humana.'
      );
    }
  };

  const handleUpdateCommercialSettings = async (payload: {
    companyFeePercent: number;
    providerFeePercent: number;
    freeTrialDays: number;
    defaultPartnerCommissionPercent: number;
  }) => {
    const res = await fetch('/api/admin/commercial-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchBootstrap();
      showToast('Regras comerciais atualizadas no servidor!');
    }
  };

  const handleNavClick = (section: NavSectionId) => {
    if (section === 'publicar-frete') {
      setPublishModalOpen(true);
      setMobileMenuOpen(false);
      return;
    }
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#FF8A00] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-neutral-300">
            Carregando ecossistema logístico NEXCARGA...
          </p>
        </div>
      </div>
    );
  }

  const {
    activeProfile,
    availableProfiles,
    kpis,
    freights,
    proposals,
    contracts,
    operations,
    activities,
    documents,
    vehicles,
    partners,
    commercialSettings,
    auditLogs,
    integrations,
    subscription,
    adminControl,
  } = data;
  const firstName = activeProfile.userName.split(' ')[0];
  const pendingProposalsCount = proposals.filter((p) => p.status === 'PENDING').length;

  const filteredByHeaderSearch = headerSearchQuery.trim()
    ? freights.filter((f) =>
        `${f.code} ${f.originCity} ${f.destinationCity} ${f.cargoType}`
          .toLowerCase()
          .includes(headerSearchQuery.toLowerCase())
      )
    : freights;

  const primaryNavItems: Array<{
    id: NavSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'publicar-frete', label: 'Publicar Frete', icon: Plus },
    { id: 'radar-nexgrid', label: 'Radar NEXGRID', icon: MapPin },
    { id: 'fretes', label: 'Fretes', icon: Truck },
    { id: 'propostas', label: 'Propostas', icon: MessageSquare, badge: pendingProposalsCount || 2 },
    { id: 'contratacoes', label: 'Contratações', icon: CheckCircle2 },
    { id: 'operacoes', label: 'Operações', icon: Share2 },
    { id: 'parceiros', label: 'Parceiros', icon: Users },
    { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
    { id: 'documentos', label: 'Documentos', icon: Folder },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];

  const intelligenceNavItems: Array<{
    id: NavSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'nexia', label: 'NexIA', icon: Sparkles },
    { id: 'nexia-verify', label: 'NexIA Verify', icon: ShieldCheck },
    { id: 'nexcarga-docs', label: 'NexCarga Docs', icon: Cloud },
    { id: 'motor-custos', label: 'Motor de Custos', icon: Calculator },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col lg:flex-row overflow-x-hidden">
      {/* Google Maps Platform Case A Quota Exhausted Banner (Rendered ONLY when quota event triggers) */}
      {gmpQuotaExceeded && (
        <div
          role="alert"
          className="fixed top-0 inset-x-0 z-50 bg-amber-950/95 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-100 flex items-center justify-between gap-3"
        >
          <span>
            Google Maps Demo Key quota exhausted. To continue using Maps, set up your own API key in Google Cloud Console (https://console.cloud.google.com/google/maps-apis/credentials) and update your environment configuration.
          </span>
          <button
            type="button"
            onClick={() => setGmpQuotaExceeded(false)}
            className="text-amber-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Connectivity Banner (PWA) */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#E85D04] px-4 py-2 text-xs font-semibold text-white shadow-xl">
          <WifiOff className="w-4 h-4" />
          <span>Modo Offline — Exibindo dados em cache seguro.</span>
        </div>
      )}

      {/* Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#1c1c20] border border-[#FF8A00] px-4 py-3 text-xs font-medium text-white shadow-2xl flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-[#FF8A00] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* A. LEFT SIDEBAR (NEXOS Official Navigation — Frozen Design)          */}
      {/* =================================================================== */}
      <aside
        aria-label="Navegação Principal NexCarga"
        className={`fixed inset-y-0 left-0 z-40 w-[238px] bg-[#111111] border-r border-white/[0.07] flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3.5 space-y-3.5 relative z-10">
          {/* Brand Logo Lockup */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="text-left group cursor-pointer"
            >
              <div className="text-[23px] font-extrabold tracking-tight leading-none font-display">
                <span className="text-white">NEX</span>
                <span className="text-[#FF8A00]">CARGA</span>
                <sup className="text-[10px] text-[#FF8A00] font-bold ml-0.5">®</sup>
              </div>
              <p className="text-[11px] text-neutral-300 mt-1 tracking-wide">
                Sua carga. Nossa conexão.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu lateral"
              className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Organization / Role Switcher Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen((prev) => !prev)}
              aria-expanded={roleDropdownOpen}
              aria-label="Selecionar organização ou perfil de acesso"
              className="w-full rounded-xl bg-[#1b1b1e] hover:bg-[#222226] border border-white/[0.09] p-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#2b1f14] border border-[#FF8A00]/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[#FF8A00]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {activeProfile.roleLabel}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate">
                    {activeProfile.organizationName}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-[#1c1c20] border border-white/15 shadow-2xl p-1.5 z-50 space-y-1">
                <p className="px-2.5 py-1 text-[10px] font-semibold text-neutral-400">
                  Alternar Experiência Multi-Role (RBAC):
                </p>
                {availableProfiles.map((prof) => (
                  <button
                    key={prof.userId}
                    type="button"
                    onClick={() => handleSwitchRole(prof.role)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      prof.role === activeProfile.role
                        ? 'bg-[#FF8A00]/20 text-white font-semibold border border-[#FF8A00]/40'
                        : 'text-neutral-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate">{prof.roleLabel}</span>
                      <span className="block text-[10px] text-neutral-400 truncate">
                        {prof.organizationName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#FF8A00] shrink-0">
                      {prof.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Navigation List */}
          <nav aria-label="Menu de Módulos" className="space-y-0.5">
            {primaryNavItems
              .filter((item) => canRoleAccessSection(activeProfile.role, item.id))
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium flex items-center justify-between transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-[#5a2d06] via-[#8c4304] to-[#3d1e04] text-white font-semibold border border-[#FF8A00]/50 shadow-[0_2px_12px_rgba(255,138,0,0.22)]'
                        : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#FF8A00]' : 'text-neutral-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#FF8A00] text-black font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

            <div className="my-2.5 border-t border-white/[0.07]" />

            {/* Intelligence & Docs Group */}
            {intelligenceNavItems
              .filter((item) => canRoleAccessSection(activeProfile.role, item.id))
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const isNexIA = item.id === 'nexia';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-[#5a2d06] via-[#8c4304] to-[#3d1e04] text-white font-semibold border border-[#FF8A00]/50'
                        : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive || isNexIA ? 'text-[#FF8A00]' : 'text-neutral-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}

            <div className="my-2.5 border-t border-white/[0.07]" />

            {/* Configurações / NexCarga Control */}
            <button
              type="button"
              onClick={() => handleNavClick('configuracoes')}
              className={`w-full rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeSection === 'configuracoes'
                  ? 'bg-gradient-to-r from-[#5a2d06] via-[#8c4304] to-[#3d1e04] text-white font-semibold border border-[#FF8A00]/50'
                  : 'text-neutral-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Settings className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Glowing Truck Illustration from Reference Asset */}
        <div className="relative h-28 w-full overflow-hidden shrink-0 pointer-events-none select-none">
          <svg
            viewBox="0 915 245 165"
            preserveAspectRatio="xMidYMax slice"
            className="w-full h-full"
          >
            <image
              href="/assets/aistudio/file_00000000650c820eabe3f30ff870e8e4_1fab598d.png"
              x="0"
              y="0"
              width="1920"
              height="1080"
              preserveAspectRatio="none"
            />
            <rect
              x="0"
              y="915"
              width="245"
              height="45"
              fill="url(#sidebarTopFade)"
            />
            <defs>
              <linearGradient id="sidebarTopFade" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#111111" stopOpacity="1" />
                <stop offset="100%" stopColor="#111111" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* B. MAIN WORKSPACE AREA                                              */}
      {/* =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0e0e10]">
        {/* Top Panoramic Header Banner matching Reference Image (Zero Ghost Text) */}
        <header className="relative min-h-[84px] border-b border-white/[0.07] px-4 lg:px-6 py-3 flex items-center justify-between gap-4 overflow-hidden bg-[#111111]">
          {/* Pure Highway Sunset Truck Slice from Reference Asset (x: 940..1420, y: 0..105) */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute inset-y-0 left-[34%] right-[22%] overflow-hidden"
          >
            <svg
              viewBox="940 0 480 105"
              preserveAspectRatio="xMidYMid slice"
              className="w-full h-full"
            >
              <image
                href="/assets/aistudio/file_00000000650c820eabe3f30ff870e8e4_1fab598d.png"
                x="0"
                y="0"
                width="1920"
                height="1080"
                preserveAspectRatio="none"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-transparent to-[#111111]" />
          </div>

          {/* Left Greeting & Mobile Hamburger */}
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="lg:hidden p-2 rounded-xl bg-[#1b1b1e]/90 border border-white/10 text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight leading-tight">
                Olá, {firstName}!
              </h1>
              <p className="text-xs text-neutral-300 mt-0.5">
                Bem-vindo à NexCarga. Aqui você conecta sua carga aos melhores transportadores do Brasil.
              </p>
            </div>
          </div>

          {/* Right Header Controls: Search, Notifications, Help, Profile */}
          <div className="relative z-10 flex items-center gap-2.5 shrink-0">
            {searchOpen && (
              <div className="hidden md:flex items-center bg-[#18181c]/95 border border-[#FF8A00]/50 rounded-full px-3 py-1.5">
                <input
                  type="text"
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  placeholder="Filtrar por cidade, código ou carga..."
                  aria-label="Pesquisar fretes"
                  className="bg-transparent text-xs text-white focus:outline-none w-48"
                />
                {headerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHeaderSearchQuery('')}
                    aria-label="Limpar pesquisa"
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Install PWA Button */}
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => (isInstallable ? install() : setHelpOpen(true))}
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#1b1b1f]/90 hover:bg-[#25252b] border border-[#FF8A00]/40 px-3 py-1.5 text-xs font-medium text-[#FF8A00] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar App</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Pesquisar na plataforma"
              className="w-9 h-9 rounded-full bg-[#18181b]/90 hover:bg-[#242429] border border-white/10 flex items-center justify-center text-neutral-200 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setHelpOpen(false);
              }}
              aria-label="Notificações do sistema"
              className="relative w-9 h-9 rounded-full bg-[#18181b]/90 hover:bg-[#242429] border border-white/10 flex items-center justify-center text-neutral-200 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#FF8A00]"
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setHelpOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              aria-label="Central de ajuda e documentação"
              className="w-9 h-9 rounded-full bg-[#18181b]/90 hover:bg-[#242429] border border-white/10 flex items-center justify-center text-neutral-200 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* User Profile Button */}
            <button
              type="button"
              onClick={() => setRoleDropdownOpen((prev) => !prev)}
              aria-label={`Conta de ${activeProfile.userName}, ${activeProfile.userTitle}`}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full bg-[#18181b]/90 hover:bg-[#242429] border border-white/10 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#FF8A00]/50 shrink-0 bg-[#292929]">
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
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-white leading-tight whitespace-nowrap">
                  {activeProfile.userName}
                </p>
                <p className="text-[11px] text-neutral-400 leading-tight whitespace-nowrap">
                  {activeProfile.userTitle}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
            </button>
          </div>
        </header>

        {/* Notifications Popover */}
        {notificationsOpen && (
          <div className="fixed top-20 right-6 z-50 w-80 rounded-2xl bg-[#18181c] border border-white/15 shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white">Notificações Recentes</h3>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {activities.slice(0, 4).map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-[#222226] border border-white/5">
                  <p className="text-white font-medium">{act.title}</p>
                  <span className="text-[10px] text-[#FF8A00] font-mono">{act.relativeTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help & Architecture Info Popover */}
        {helpOpen && (
          <div className="fixed top-20 right-6 z-50 w-96 rounded-2xl bg-[#18181c] border border-white/15 shadow-2xl p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Central NexCarga • Pupa Labs</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-neutral-300">
              Plataforma SaaS B2B de intermediação logística operando com RBAC multi-role (COMPANY, DRIVER, CARRIER, NEXCARGA CONTROL).
            </p>
            <div className="p-2.5 rounded-xl bg-[#121215] border border-white/5 space-y-1 text-[11px] text-neutral-400">
              <p>• Taxa de manutenção configurada: <strong className="text-[#FF8A00]">{commercialSettings.totalMaintenanceFeePercent}%</strong> ({commercialSettings.companyFeePercent}% + {commercialSettings.providerFeePercent}%)</p>
              <p>• Aplicativo PWA pronto para instalação mobile e desktop.</p>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* C. MAIN VIEWPORT CONTENT                                            */}
        {/* =================================================================== */}
        <main className="flex-1 px-4 lg:px-5 py-3.5 space-y-3.5 max-w-[1600px] w-full mx-auto">
          {/* Role Banner when switched to DRIVER / CARRIER / SUPER_ADMIN */}
          {activeProfile.role !== 'COMPANY' && (
            <div className="rounded-xl bg-[#1c1610] border border-[#FF8A00]/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF8A00]" />
                <span>
                  Ambiente ativo: <strong className="text-white">{activeProfile.roleLabel}</strong> ({activeProfile.organizationName}) — Permissões RBAC aplicadas no servidor.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchRole('COMPANY')}
                className="text-[#FF8A00] hover:underline font-semibold cursor-pointer"
              >
                Voltar para Empresa Contratante (Construtora Vale S.A.)
              </button>
            </div>
          )}

          {/* KPI ROW + PRIMARY CTA BUTTON (Matches Reference Top Strip — Frozen Design) */}
          <section
            aria-label="Indicadores Principais"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1.08fr_1fr_0.95fr_1.15fr_auto] gap-3 items-stretch"
          >
            {/* KPI 1: Fretes publicados */}
            <div className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] px-3.5 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#2b1f14] border border-[#FF8A00]/30 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-[#FF8A00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-300 whitespace-nowrap">Fretes publicados</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    data-testid="kpi-published-freights"
                    className="text-2xl font-bold text-white font-display tabular-nums leading-none"
                  >
                    {kpis.publishedFreights}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                    ↑ +{kpis.publishedGrowthPercent}%
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5 whitespace-nowrap">vs. período anterior</p>
              </div>
            </div>

            {/* KPI 2: Propostas recebidas */}
            <div className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] px-3.5 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#2b1f14] border border-[#FF8A00]/30 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#FF8A00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-300 whitespace-nowrap">Propostas recebidas</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    data-testid="kpi-received-proposals"
                    className="text-2xl font-bold text-white font-display tabular-nums leading-none"
                  >
                    {kpis.receivedProposals}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                    ↑ +{kpis.proposalsGrowthPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: Contratações */}
            <div className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] px-3.5 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#2b1f14] border border-[#FF8A00]/30 flex items-center justify-center shrink-0">
                <Handshake className="w-5 h-5 text-[#FF8A00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-300 whitespace-nowrap">Contratações</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    data-testid="kpi-active-contracts"
                    className="text-2xl font-bold text-white font-display tabular-nums leading-none"
                  >
                    {kpis.activeContracts}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                    ↑ +{kpis.contractsGrowthPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: Economia estimada */}
            <div className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] px-3.5 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#2b1f14] border border-[#FF8A00]/30 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-[#FF8A00]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-300 whitespace-nowrap">Economia estimada</p>
                <div className="mt-0.5">
                  <span className="text-xl font-bold text-white font-display tabular-nums leading-tight block whitespace-nowrap">
                    {formatBrl(kpis.estimatedSavingsBrl)}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-neutral-400 text-xs">→</span>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
                      ↑ +{kpis.savingsGrowthPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary CTA Button: + Publicar novo frete */}
            <div className="sm:col-span-2 xl:col-span-1 flex items-center">
              <button
                type="button"
                onClick={() => setPublishModalOpen(true)}
                className="w-full h-[54px] rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] hover:from-[#ff991f] hover:to-[#f3660c] text-black font-bold text-xs lg:text-sm px-4 flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(255,138,0,0.35)] transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Publicar novo frete</span>
              </button>
            </div>
          </section>

          {/* ================================================================= */}
          {/* CONDITIONAL CONTENT: DASHBOARD vs SPECIALIZED MODULE VIEWS        */}
          {/* ================================================================= */}
          {activeSection === 'dashboard' || activeSection === 'radar-nexgrid' || activeSection === 'nexia' ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* Left 9 Columns: NEXGRID Radar + Bottom Operations & Activities */}
              <div className="xl:col-span-9 space-y-4">
                <NexGridMap
                  freights={filteredByHeaderSearch}
                  onSelectFreight={(f) => setSelectedFreight(f)}
                  onViewAllFreights={() => setActiveSection('fretes')}
                  mapsConfigured={integrations.googleMapsPlatform.configured}
                  fullPageMode={activeSection === 'radar-nexgrid'}
                />

                {/* Bottom Row: Operações em andamento + Atividades recentes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {/* Card G: Operações em andamento */}
                  <section
                    aria-label="Operações em andamento"
                    className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] p-3.5 lg:p-4"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <h2 className="text-sm lg:text-base font-bold text-white">
                        Operações em andamento
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection('operacoes')}
                        className="text-xs font-medium text-[#FF8A00] hover:text-[#ffa333] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Ver todas</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {operations.slice(0, 3).map((op) => {
                        const isTransit = op.status === 'Em trânsito';
                        const isLoading = op.status === 'Em carregamento';
                        const statusLabel = isLoading ? 'Carregamento' : op.status;

                        const badgeStyle = isTransit
                          ? 'bg-[#17382b] text-[#4ade80] border-[#22543d]'
                          : isLoading
                          ? 'bg-[#172b42] text-[#60a5fa] border-[#1e3a5f]'
                          : 'bg-[#3b2814] text-[#fbbf24] border-[#5c3d1e]';

                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setActiveSection('operacoes')}
                            className="w-full rounded-xl bg-[#202024]/90 hover:bg-[#28282d] border border-white/[0.07] px-3 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Truck className="w-4 h-4 text-[#FF8A00] shrink-0" />
                              <span className="text-xs font-medium text-white truncate">
                                {op.originCity}/{op.originUf}{' '}
                                <span className="text-neutral-400 mx-0.5">→</span>{' '}
                                {op.destinationCity}/{op.destinationUf}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeStyle}`}
                              >
                                {statusLabel}
                              </span>
                              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Card H: Atividades recentes */}
                  <section
                    aria-label="Atividades recentes"
                    className="rounded-2xl bg-[#181818]/95 border border-white/[0.08] p-3.5 lg:p-4"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <h2 className="text-sm lg:text-base font-bold text-white">
                        Atividades recentes
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection('configuracoes')}
                        className="text-xs font-medium text-[#FF8A00] hover:text-[#ffa333] flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Ver todas</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>

                    <div className="divide-y divide-white/[0.06]">
                      {activities.slice(0, 4).map((act) => {
                        return (
                          <div
                            key={act.id}
                            className="py-2 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {act.type === 'PROPOSAL_ACCEPTED' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : act.type === 'PROPOSAL_RECEIVED' ? (
                                <FileText className="w-4 h-4 text-neutral-300 shrink-0" />
                              ) : act.type === 'FREIGHT_IN_TRANSIT' ? (
                                <Truck className="w-4 h-4 text-[#FF8A00] shrink-0" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0" />
                              )}
                              <span className="text-neutral-200 truncate">{act.title}</span>
                            </div>

                            <span className="text-[11px] text-neutral-400 whitespace-nowrap shrink-0">
                              {act.relativeTime}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              {/* Right 3 Columns: NexIA + Quick Actions + Plano Profissional */}
              <div className="xl:col-span-3">
                <NexIAPanel
                  onNavigate={(sec) => handleNavClick(sec)}
                  onOpenPublishModal={() => setPublishModalOpen(true)}
                  subscription={subscription}
                />
              </div>
            </div>
          ) : (
            <ModuleViews
              activeSection={activeSection}
              activeProfile={activeProfile}
              freights={freights}
              proposals={proposals}
              contracts={contracts}
              operations={operations}
              documents={documents}
              vehicles={vehicles}
              partners={partners}
              commercialSettings={commercialSettings}
              auditLogs={auditLogs}
              integrations={integrations}
              adminControl={adminControl}
              onRefreshBootstrap={fetchBootstrap}
              onShowToast={showToast}
              onSelectFreight={(f) => setSelectedFreight(f)}
              onOpenPublishModal={() => setPublishModalOpen(true)}
              onProposalDecision={handleProposalDecision}
              onUpdateOperationStatus={handleUpdateOperationStatus}
              onUploadDocument={handleUploadDocument}
              onVerifyDocument={handleVerifyDocument}
              onUpdateCommercialSettings={handleUpdateCommercialSettings}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <PublishFreightModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onPublishSuccess={handlePublishFreight}
      />

      <FreightDetailModal
        freight={selectedFreight}
        onClose={() => setSelectedFreight(null)}
        onSubmitProposal={handleSubmitProposal}
      />
    </div>
  );
}
