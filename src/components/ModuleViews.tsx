import React, { useState } from 'react';
import {
  BarChart3,
  Calculator,
  CheckCircle2,
  CloudUpload,
  FileCheck,
  Handshake,
  Plus,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  ActiveProfileSession,
  AuditLogItem,
  BootstrapResponse,
  CommercialSettings,
  ContractItem,
  CostCalculationResult,
  DocumentItem,
  FreightItem,
  IntegrationStatus,
  NavSectionId,
  NexCargaTrustHistoryItem,
  NexCargaTrustVerificationItem,
  OperationItem,
  OperationStatus,
  PartnerItem,
  ProposalItem,
  UserProfileAccount,
  VehicleItem,
} from '../types/nexcarga';
import {
  calculateLogisticsCost,
  formatBrl,
  formatDateBr,
} from '../utils/logisticsRules';
import { NexCargaControlView } from './NexCargaControlView';
import {
  NexCargaTrustView,
  NexCargaVerifiedBadge,
  type ProfileSubTabId,
  UserProfileView,
} from './UserProfileAndTrustView';

interface ModuleViewsProps {
  activeSection: NavSectionId;
  activeProfile: ActiveProfileSession;
  userProfile: UserProfileAccount;
  trustVerification: NexCargaTrustVerificationItem;
  trustHistory: NexCargaTrustHistoryItem[];
  profileInitialTab?: ProfileSubTabId;
  onNavigateSection: (sec: NavSectionId) => void;
  freights: FreightItem[];
  proposals: ProposalItem[];
  contracts: ContractItem[];
  operations: OperationItem[];
  documents: DocumentItem[];
  vehicles: VehicleItem[];
  partners: PartnerItem[];
  commercialSettings: CommercialSettings;
  auditLogs: AuditLogItem[];
  integrations: IntegrationStatus;
  adminControl?: BootstrapResponse['adminControl'];
  onRefreshBootstrap: () => Promise<void>;
  onShowToast: (msg: string) => void;
  onSelectFreight: (f: FreightItem) => void;
  onOpenPublishModal: () => void;
  onProposalDecision: (
    proposalId: string,
    decision: 'ACCEPT' | 'COUNTER' | 'REJECT',
    counterValueBrl?: number
  ) => Promise<void>;
  onUpdateOperationStatus: (operationId: string, status: OperationStatus) => Promise<void>;
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
  onUpdateCommercialSettings: (payload: {
    companyFeePercent: number;
    providerFeePercent: number;
    freeTrialDays: number;
    defaultPartnerCommissionPercent: number;
  }) => Promise<void>;
}

export const ModuleViews: React.FC<ModuleViewsProps> = ({
  activeSection,
  activeProfile,
  userProfile,
  trustVerification,
  trustHistory,
  profileInitialTab = 'profile-personal',
  onNavigateSection,
  freights,
  proposals,
  contracts,
  operations,
  documents,
  vehicles,
  partners,
  commercialSettings,
  auditLogs,
  integrations,
  adminControl,
  onRefreshBootstrap,
  onShowToast,
  onSelectFreight,
  onOpenPublishModal,
  onProposalDecision,
  onUpdateOperationStatus,
  onUploadDocument,
  onVerifyDocument,
}) => {
  // Cost Engine State
  const [costOrigin, setCostOrigin] = useState('Manhuaçu/MG');
  const [costDest, setCostDest] = useState('Vitória/ES');
  const [costDistance, setCostDistance] = useState(295);
  const [costVehicle, setCostVehicle] = useState<'Truck' | 'Carreta' | 'Carreta LS' | 'Bitruck' | 'Toco'>('Truck');
  const [costWeight, setCostWeight] = useState(14);
  const [costDiesel, setCostDiesel] = useState(6.15);
  const [costConsumption, setCostConsumption] = useState(3.2);
  const [costToll, setCostToll] = useState(165);
  const [costDaily, setCostDaily] = useState(340);
  const [costMargin, setCostMargin] = useState(18);

  const costResult: CostCalculationResult = calculateLogisticsCost(
    {
      originCity: costOrigin,
      destinationCity: costDest,
      distanceKm: costDistance,
      vehicleType: costVehicle,
      weightTons: costWeight,
      dieselPriceBrl: costDiesel,
      avgConsumptionKmL: costConsumption,
      tollCostBrl: costToll,
      operationalDailyBrl: costDaily,
      marginPercent: costMargin,
    },
    commercialSettings.companyFeePercent,
    commercialSettings.providerFeePercent
  );

  // Document Upload State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentItem['category']>('CNH');
  const [docNumber, setDocNumber] = useState('');
  const [docExpires, setDocExpires] = useState('2028-10-15');

  // 0. MEU PERFIL (PÁGINA COMPLETA DE PERFIL DO USUÁRIO)
  if (activeSection === 'meu-perfil') {
    return (
      <UserProfileView
        activeProfile={activeProfile}
        userProfile={userProfile}
        trustVerification={trustVerification}
        initialTab={profileInitialTab}
        onRefreshBootstrap={onRefreshBootstrap}
        onShowToast={onShowToast}
        onNavigateToTrust={() => onNavigateSection('nexcarga-trust')}
        onNavigateToDocs={() => onNavigateSection('documentos')}
      />
    );
  }

  // 0.1 NEXCARGA TRUST (VERIFICAÇÃO CADASTRAL OFICIAL + SELO NEXCARGA VERIFICADO)
  if (activeSection === 'nexcarga-trust') {
    return (
      <NexCargaTrustView
        activeProfile={activeProfile}
        trustVerification={trustVerification}
        trustHistory={trustHistory}
        documents={documents}
        onUploadDocument={onUploadDocument}
        onVerifyDocument={onVerifyDocument}
        onRefreshBootstrap={onRefreshBootstrap}
        onShowToast={onShowToast}
      />
    );
  }

  // 1. FRETES (Marketplace)
  if (activeSection === 'fretes') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <div>
            <h2 className="text-xl font-bold text-white">Marketplace de Fretes NexCarga</h2>
            <p className="text-xs text-neutral-400">
              Cargas ativas publicadas em Manhuaçu/MG, Zona da Mata, Leste de Minas e rotas nacionais.
            </p>
          </div>
          {activeProfile.role !== 'DRIVER' && (
            <button
              type="button"
              onClick={onOpenPublishModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar novo frete</span>
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 bg-[#141416]">
                  <th className="py-3.5 px-4 font-semibold">Código</th>
                  <th className="py-3.5 px-4 font-semibold">Origem → Destino</th>
                  <th className="py-3.5 px-4 font-semibold">Carga / Peso</th>
                  <th className="py-3.5 px-4 font-semibold">Veículo / Implemento</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Distância</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Valor Ofertado</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {freights.map((f) => (
                  <tr key={f.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#FF8A00] font-semibold">{f.code}</td>
                    <td className="py-3 px-4 text-white font-medium">
                      {f.originCity}/{f.originUf} → {f.destinationCity}/{f.destinationUf}
                      <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                        <span>
                          Coleta: {formatDateBr(f.pickupDate)} • {f.organizationName}
                        </span>
                        <NexCargaVerifiedBadge
                          verified={f.organizationVerified}
                          variant="inline"
                        />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {f.cargoType}
                      <span className="block text-[11px] text-neutral-500 font-mono tabular-nums">
                        {(f.weightKg / 1000).toFixed(1)} t • {f.volumeM3} m³
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {f.vehicleRequired} • {f.implementRequired}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-neutral-300 tabular-nums">
                      {f.distanceKm} km
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums">
                      {formatBrl(f.offeredValueBrl)}
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {f.status === 'PUBLISHED'
                        ? 'Publicado'
                        : f.status === 'IN_NEGOTIATION'
                        ? 'Em negociação'
                        : f.status === 'CONTRACTED'
                        ? 'Contratado'
                        : 'Em operação'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectFreight(f)}
                        className="px-3 py-1.5 rounded-lg bg-[#FF8A00]/15 hover:bg-[#FF8A00]/25 text-[#FF8A00] font-semibold text-xs cursor-pointer whitespace-nowrap"
                      >
                        Detalhes / Propor
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. PROPOSTAS E NEGOCIAÇÕES
  if (activeSection === 'propostas') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white">Propostas e Negociações</h2>
          <p className="text-xs text-neutral-400">
            Gerencie propostas comerciais, envie contrapropostas ou efetive a contratação imediata com geração de contrato e snapshot imutável de taxa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-[#FF8A00]">{p.freightCode}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="font-semibold text-white">
                    {p.originLabel} → {p.destinationLabel}
                  </span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-neutral-400">
                    Status:{' '}
                    <strong className="text-white">
                      {p.status === 'ACCEPTED'
                        ? 'Aceita (Contratada)'
                        : p.status === 'PENDING'
                        ? 'Aguardando decisão'
                        : p.status === 'COUNTER_OFFER'
                        ? 'Em contraproposta'
                        : 'Recusada'}
                    </strong>
                  </span>
                </div>

                <p className="text-xs text-neutral-300 flex flex-wrap items-center gap-1.5">
                  <span>
                    Proponente: <strong className="text-white">{p.proposerName}</strong>
                  </span>
                  <NexCargaVerifiedBadge verified={p.proposerVerified} variant="inline" />
                  <span>
                    • Motorista: <strong className="text-white">{p.driverName}</strong> (RNTRC{' '}
                    {p.driverRntrc})
                  </span>
                </p>
                <p className="text-xs text-neutral-400">
                  Veículo: {p.vehicleDescription} • Prazo estimado: {p.estimatedDeliveryDays} dia(s)
                </p>
                {p.notes && <p className="text-xs text-neutral-400 italic">"{p.notes}"</p>}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="text-right">
                  <span className="block text-[11px] text-neutral-400">
                    Valor Ofertado Original: {formatBrl(p.originalValueBrl)}
                  </span>
                  <span className="text-lg font-bold font-mono text-white tabular-nums">
                    Proposta: {formatBrl(p.proposedValueBrl)}
                  </span>
                </div>

                {p.status === 'PENDING' || p.status === 'COUNTER_OFFER' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onProposalDecision(p.id, 'ACCEPT')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold text-xs cursor-pointer whitespace-nowrap"
                    >
                      Aceitar e Contratar
                    </button>
                    <button
                      type="button"
                      onClick={() => onProposalDecision(p.id, 'REJECT')}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-neutral-300 hover:text-red-300 text-xs font-medium cursor-pointer whitespace-nowrap"
                    >
                      Recusar
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Processada
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. CONTRATAÇÕES
  if (activeSection === 'contratacoes') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white">Contratos de Transporte e Snapshots Imutáveis de Taxas</h2>
          <p className="text-xs text-neutral-400">
            A NexCarga atua como intermediadora tecnológica (não custodiante do valor integral do frete). Taxa vigente para novas contratações: {commercialSettings.totalMaintenanceFeePercent}% ({commercialSettings.companyFeePercent}% contratante + {commercialSettings.providerFeePercent}% prestador).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Handshake className="w-4 h-4 text-[#FF8A00]" />
                  <span className="font-mono font-bold text-[#FF8A00]">{c.code}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-white font-semibold">Frete {c.freightCode}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-neutral-400">Assinado em {c.signedAt}</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {c.originLabel} → {c.destinationLabel}
                </p>
                <p className="text-xs text-neutral-300">
                  Contratante: <strong>{c.companyName}</strong> • Transportador:{' '}
                  <strong>{c.providerName}</strong> ({c.driverName})
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-[#121214] p-3.5 rounded-xl border border-white/5 text-xs">
                <div>
                  <span className="text-neutral-400 block">Valor Acordado</span>
                  <strong className="text-white font-mono text-sm tabular-nums">
                    {formatBrl(c.agreedFreightValueBrl)}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">
                    Taxa Contratante ({c.companyFeePercent}%)
                  </span>
                  <strong className="text-[#FF8A00] font-mono text-sm tabular-nums">
                    {formatBrl(c.companyFeeBrl)}
                  </strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">
                    Taxa Prestador ({c.providerFeePercent}%)
                  </span>
                  <strong className="text-[#FF8A00] font-mono text-sm tabular-nums">
                    {formatBrl(c.providerFeeBrl)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. OPERAÇÕES
  if (activeSection === 'operacoes') {
    const statuses: OperationStatus[] = [
      'Aguardando coleta',
      'Programada',
      'Em carregamento',
      'Em trânsito',
      'Em descarregamento',
      'Entregue',
      'Com ocorrência',
      'Cancelada',
    ];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white">Controle de Operações e Rastreabilidade</h2>
          <p className="text-xs text-neutral-400">
            Acompanhe cada etapa operacional da coleta até o comprovante de entrega.
          </p>
        </div>

        <div className="space-y-4">
          {operations.map((op) => (
            <div key={op.id} className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[#FF8A00]">{op.freightCode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-400">Contrato {op.contractCode}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-neutral-300">
                      Motorista: <strong className="text-white">{op.driverName}</strong> ({op.vehiclePlate})
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {op.originCity}/{op.originUf} → {op.destinationCity}/{op.destinationUf}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor={`status-${op.id}`} className="text-xs text-neutral-400">
                    Atualizar situação:
                  </label>
                  <select
                    id={`status-${op.id}`}
                    value={op.status}
                    onChange={(e) =>
                      onUpdateOperationStatus(op.id, e.target.value as OperationStatus)
                    }
                    className="rounded-lg bg-[#232328] border border-[#FF8A00]/40 px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-[#252529] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF8A00] to-[#E85D04] transition-all duration-300"
                  style={{ width: `${op.progressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                {op.timeline.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl bg-[#131316] border border-white/5 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#FF8A00] font-semibold">
                      <span>{ev.status}</span>
                      <span className="font-mono text-neutral-400">{ev.timestamp}</span>
                    </div>
                    <p className="text-neutral-200 mt-1">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. MOTOR DE CUSTOS LOGÍSTICOS
  if (activeSection === 'motor-custos') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#FF8A00]" />
            <span>Motor de Custos Logísticos NexCarga</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Estimativa técnica de combustível, consumo rodoviário, pedágios, diárias operacionais, margem e taxa de intermediação ({costResult.referenceTimestamp}).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Parâmetros da Rota e Veículo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label htmlFor="cost-orig" className="block text-neutral-400 mb-1">Origem</label>
                <input
                  id="cost-orig"
                  type="text"
                  value={costOrigin}
                  onChange={(e) => setCostOrigin(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="cost-dest" className="block text-neutral-400 mb-1">Destino</label>
                <input
                  id="cost-dest"
                  type="text"
                  value={costDest}
                  onChange={(e) => setCostDest(e.target.value)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label htmlFor="cost-dist" className="block text-neutral-400 mb-1">Distância (km)</label>
                <input
                  id="cost-dist"
                  type="number"
                  value={costDistance}
                  onChange={(e) => setCostDistance(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label htmlFor="cost-veh" className="block text-neutral-400 mb-1">Veículo</label>
                <select
                  id="cost-veh"
                  value={costVehicle}
                  onChange={(e) => setCostVehicle(e.target.value as typeof costVehicle)}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
                >
                  <option value="Truck">Truck (3 eixos)</option>
                  <option value="Bitruck">Bitruck (4 eixos)</option>
                  <option value="Carreta">Carreta (5 eixos)</option>
                  <option value="Carreta LS">Carreta LS (6 eixos)</option>
                  <option value="Toco">Toco (2 eixos)</option>
                </select>
              </div>
              <div>
                <label htmlFor="cost-weight" className="block text-neutral-400 mb-1">Peso (Toneladas)</label>
                <input
                  id="cost-weight"
                  type="number"
                  value={costWeight}
                  onChange={(e) => setCostWeight(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="cost-diesel" className="block text-neutral-400 mb-1">Diesel S10 (R$/L)</label>
                <input
                  id="cost-diesel"
                  type="number"
                  step="0.05"
                  value={costDiesel}
                  onChange={(e) => setCostDiesel(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="cost-cons" className="block text-neutral-400 mb-1">Consumo (km/L)</label>
                <input
                  id="cost-cons"
                  type="number"
                  step="0.1"
                  value={costConsumption}
                  onChange={(e) => setCostConsumption(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label htmlFor="cost-toll" className="block text-neutral-400 mb-1">Pedágios Estimados (R$)</label>
                <input
                  id="cost-toll"
                  type="number"
                  value={costToll}
                  onChange={(e) => setCostToll(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="cost-daily" className="block text-neutral-400 mb-1">Diária Operacional (R$)</label>
                <input
                  id="cost-daily"
                  type="number"
                  value={costDaily}
                  onChange={(e) => setCostDaily(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="cost-margin" className="block text-neutral-400 mb-1">Margem Sugerida (%)</label>
                <input
                  id="cost-margin"
                  type="number"
                  value={costMargin}
                  onChange={(e) => setCostMargin(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl bg-[#181818] border border-[#FF8A00]/30 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Demonstrativo de Custos Estimados</h3>
              <div className="space-y-2 text-xs border-b border-white/10 pb-3">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Combustível ({costResult.litersNeeded} L):</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(costResult.fuelCostBrl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Pedágios estimados na rota:</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(costResult.tollCostBrl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Despesas operacionais e manutenção:</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(costResult.operationalCostBrl)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1">
                  <span className="text-neutral-200">Custo Base de Transporte:</span>
                  <span className="font-mono text-white tabular-nums">{formatBrl(costResult.baseTransportCostBrl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Margem Operacional ({costMargin}%):</span>
                  <span className="font-mono text-emerald-400 tabular-nums">+ {formatBrl(costResult.suggestedMarginBrl)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Frete Recomendado:</span>
                  <span className="text-xl font-bold font-mono text-[#FF8A00] tabular-nums">
                    {formatBrl(costResult.recommendedFreightValueBrl)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Custo por quilômetro:</span>
                  <span className="font-mono text-neutral-200 tabular-nums">{formatBrl(costResult.costPerKmBrl)} / km</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Líquido motorista (após {commercialSettings.providerFeePercent}%):</span>
                  <span className="font-mono text-emerald-400 tabular-nums">{formatBrl(costResult.netDriverEarningsBrl)}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 mt-4 pt-3 border-t border-white/5">
              Nota técnica: Os valores de diesel e pedágio são estimativas orientativas parametrizáveis pelo usuário na data de referência ({costResult.referenceTimestamp}).
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 6. DOCUMENTOS, NEXCARGA DOCS & NEXIA VERIFY
  if (
    activeSection === 'documentos' ||
    activeSection === 'nexcarga-docs' ||
    activeSection === 'nexia-verify'
  ) {
    const handleDocSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!docTitle.trim()) return;
      await onUploadDocument({
        title: docTitle,
        category: docCategory,
        documentNumber: docNumber || 'DOC-2026-BR',
        expiresAt: docExpires,
      });
      setDocTitle('');
      setDocNumber('');
    };

    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF8A00]" />
              <span>
                {activeSection === 'nexia-verify'
                  ? 'NexIA Verify — Homologação Documental Assistida'
                  : 'NexCarga Docs — Repositório Seguro Google Cloud Storage'}
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Bucket privado: <code className="text-[#FF8A00]">{integrations.googleCloudStorage.bucket}</code> • Metadados no PostgreSQL • A análise automatizada da NexIA auxilia na triagem e requer aprovação humana para validade operacional.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleDocSubmit}
          className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-xs"
        >
          <div className="md:col-span-2">
            <label htmlFor="doc-title" className="block text-neutral-400 mb-1">
              Identificação do Documento
            </label>
            <input
              id="doc-title"
              type="text"
              required
              placeholder="Ex.: CRLV Digital 2026 — Scania R450"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label htmlFor="doc-cat" className="block text-neutral-400 mb-1">Categoria</label>
            <select
              id="doc-cat"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as DocumentItem['category'])}
              className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white"
            >
              <option value="CNH">CNH</option>
              <option value="RNTRC">RNTRC / ANTT</option>
              <option value="CRLV">CRLV Veículo</option>
              <option value="CT_E">CT-e</option>
              <option value="MDF_E">MDF-e</option>
              <option value="NF_E">NF-e</option>
              <option value="COMPROVANTE_ENTREGA">Comprovante de Entrega</option>
            </select>
          </div>
          <div>
            <label htmlFor="doc-num" className="block text-neutral-400 mb-1">Número / Registro</label>
            <input
              id="doc-num"
              type="text"
              placeholder="000918273"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full rounded-lg bg-[#232328] border border-white/10 px-3 py-2 text-white font-mono"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold py-2 px-4 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CloudUpload className="w-4 h-4" />
            <span>Enviar ao GCS</span>
          </button>
        </form>

        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <FileCheck className="w-4 h-4 text-[#FF8A00]" />
                  <strong className="text-white text-sm">{doc.title}</strong>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="font-mono text-neutral-400">{doc.category}</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="text-neutral-400">Validade: {formatDateBr(doc.expiresAt)}</span>
                </div>
                <p className="text-xs text-neutral-400 font-mono">
                  gs://{doc.gcsBucket}/{doc.gcsObjectPath} ({doc.fileSizeLabel})
                </p>
                {doc.aiAnalysisSummary && (
                  <p className="text-xs text-neutral-300 bg-[#121215] px-3 py-1.5 rounded-lg border border-white/5 mt-1">
                    {doc.aiAnalysisSummary}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold">
                  {doc.verificationStatus === 'APPROVED' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Homologado ({doc.reviewedBy})
                    </span>
                  ) : doc.verificationStatus === 'REJECTED' ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Reprovado
                    </span>
                  ) : (
                    <span className="text-[#FF8A00]">Aguardando Revisão Humana</span>
                  )}
                </span>

                {doc.verificationStatus !== 'APPROVED' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onVerifyDocument(doc.id, 'APPROVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => onVerifyDocument(doc.id, 'REJECTED')}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold cursor-pointer"
                    >
                      Reprovar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. FINANCEIRO, PLANOS E ASSINATURAS
  if (activeSection === 'financeiro') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white">Assinaturas, Planos e Taxas de Manutenção</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Todos os planos incluem {commercialSettings.freeTrialDays} dias de avaliação gratuita. Arquitetura de pagamentos desacoplada pronta para integração com gateway homologado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {commercialSettings.plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl bg-[#181818] border p-5 flex flex-col justify-between ${
                plan.code === 'ANNUAL'
                  ? 'border-[#FF8A00] shadow-[0_0_25px_rgba(255,138,0,0.12)]'
                  : 'border-white/[0.08]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#FF8A00]">{plan.cycleLabel}</span>
                  <span className="text-[11px] text-neutral-400">
                    {plan.trialDays} dias grátis
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{plan.name}</h3>
                <p className="text-2xl font-bold font-mono text-white mt-2 tabular-nums">
                  {formatBrl(plan.priceBrl)}
                  <span className="text-xs font-normal text-neutral-400"> / ciclo</span>
                </p>
                <p className="text-xs text-neutral-400 mt-2">{plan.description}</p>

                <ul className="mt-4 space-y-2 text-xs text-neutral-300 border-t border-white/10 pt-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF8A00] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF8A00] to-[#E85D04] text-black font-semibold text-xs cursor-pointer"
              >
                {plan.code === 'ANNUAL' ? 'Plano Atual Ativo' : 'Selecionar Ciclo'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. PARCEIROS E COMISSÕES
  if (activeSection === 'parceiros') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white">Programa de Parceiros e Indicações NexCarga</h2>
          <p className="text-xs text-neutral-400">
            Comissão padrão configurada: {commercialSettings.defaultPartnerCommissionPercent}% sobre novas assinaturas convertidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partners.map((prt) => (
            <div key={prt.id} className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{prt.name}</h3>
                <span className="text-xs font-mono text-[#FF8A00]">{prt.referralCode}</span>
              </div>
              <p className="text-xs text-neutral-400">
                CNPJ/CPF: {prt.cnpjCpf} • {prt.cityUf}
              </p>
              <div className="grid grid-cols-3 gap-2 bg-[#121215] p-3 rounded-xl text-xs">
                <div>
                  <span className="text-neutral-400 block">Indicações</span>
                  <strong className="text-white font-mono text-sm tabular-nums">{prt.indicationsCount}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">Conversões</span>
                  <strong className="text-emerald-400 font-mono text-sm tabular-nums">{prt.conversionsCount}</strong>
                </div>
                <div>
                  <span className="text-neutral-400 block">Comissões</span>
                  <strong className="text-[#FF8A00] font-mono text-sm tabular-nums">
                    {formatBrl(prt.totalCommissionBrl)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 9. RELATÓRIOS E INDICADORES EXECUTIVOS
  if (activeSection === 'relatorios') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#181818] border border-white/[0.08] p-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#FF8A00]" />
            <span>Relatórios Executivos e Indicadores de Frota</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Consolidado operacional de fretes, contratos, veículos homologados e desempenho regional (Manhuaçu/MG e rotas nacionais).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-2xl bg-[#181818] border border-white/[0.08] p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <strong className="font-mono text-[#FF8A00]">{v.plate}</strong>
                <span className="text-emerald-400 font-semibold">{v.status}</span>
              </div>
              <p className="text-white font-bold">{v.brandModel}</p>
              <p className="text-neutral-400">
                {v.vehicleType} • {v.implementType} • {(v.capacityKg / 1000).toFixed(1)} t
              </p>
              <p className="text-neutral-500">
                Motorista: {v.driverName} (RNTRC {v.rntrc})
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 10. NEXCARGA CONTROL (CONFIGURAÇÕES & ADMINISTRAÇÃO GLOBAL COMPLETA)
  if (adminControl) {
    return (
      <NexCargaControlView
        activeProfile={activeProfile}
        overview={adminControl.overview}
        users={adminControl.users}
        organizations={adminControl.organizations}
        subscriptions={adminControl.subscriptions}
        payments={adminControl.payments}
        feeRules={adminControl.feeRules}
        delinquencyPolicy={adminControl.delinquencyPolicy}
        partnerCommissions={adminControl.partnerCommissions}
        partners={partners}
        contracts={contracts}
        rolePermissions={adminControl.rolePermissions}
        platformSettings={adminControl.platformSettings}
        commercialSettings={commercialSettings}
        auditLogs={auditLogs}
        integrations={integrations}
        trustVerifications={adminControl.trustVerifications}
        trustHistory={adminControl.trustHistory}
        documents={documents}
        onRefresh={onRefreshBootstrap}
        onShowToast={onShowToast}
      />
    );
  }

  return null;
};
