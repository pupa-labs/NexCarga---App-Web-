export type UserRole =
  | 'COMPANY'
  | 'DRIVER'
  | 'CARRIER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'SUPPORT'
  | 'VERIFICATION';

export type NavSectionId =
  | 'dashboard'
  | 'publicar-frete'
  | 'radar-nexgrid'
  | 'fretes'
  | 'propostas'
  | 'contratacoes'
  | 'operacoes'
  | 'parceiros'
  | 'financeiro'
  | 'documentos'
  | 'relatorios'
  | 'nexia'
  | 'nexia-verify'
  | 'nexcarga-docs'
  | 'motor-custos'
  | 'configuracoes'
  | 'meu-perfil'
  | 'nexcarga-trust';

export type NexCargaTrustStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED';

export type StorageBucketName =
  | 'driver-documents'
  | 'company-documents'
  | 'vehicle-images'
  | 'freight-attachments'
  | 'profile-images'
  | 'nexcarga-private';

export type OperationStatus =
  | 'Aguardando coleta'
  | 'Programada'
  | 'Em carregamento'
  | 'Em trânsito'
  | 'Em descarregamento'
  | 'Entregue'
  | 'Com ocorrência'
  | 'Cancelada';

export interface AuthorizedOrgContext {
  contextId: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationCnpjOrCpf: string;
  role: UserRole;
  roleLabel: string;
  trustStatus: NexCargaTrustStatus;
  verifiedBadge: boolean;
}

export interface ActiveProfileSession {
  userId: string;
  authUserId?: string;
  userName: string;
  email?: string;
  phone?: string;
  cpf?: string;
  userTitle: string;
  role: UserRole;
  roleLabel: string;
  organizationId: string;
  organizationName: string;
  organizationCnpjOrCpf: string;
  city: string;
  uf: string;
  avatarUrl?: string;
  accountStatus?: UserAccountStatus;
  trustStatus?: NexCargaTrustStatus;
  verifiedBadge?: boolean;
  createdAt?: string;
}

export interface FreightItem {
  id: string;
  code: string;
  organizationId: string;
  organizationName: string;
  organizationVerified?: boolean;
  originCity: string;
  originUf: string;
  originCep: string;
  originStreet?: string;
  originNumber?: string;
  originComplement?: string;
  originNeighborhood?: string;
  originLat: number;
  originLng: number;
  destinationCity: string;
  destinationUf: string;
  destinationCep: string;
  destinationStreet?: string;
  destinationNumber?: string;
  destinationComplement?: string;
  destinationNeighborhood?: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  cargoType: string;
  vehicleRequired: string;
  implementRequired: string;
  weightKg: number;
  volumeM3: number;
  offeredValueBrl: number;
  pickupDate: string;
  deliveryDate: string;
  status: 'PUBLISHED' | 'IN_NEGOTIATION' | 'CONTRACTED' | 'IN_OPERATION' | 'DELIVERED' | 'CANCELED';
  visibility?: 'PUBLIC' | 'INVITED_ONLY' | 'PRIVATE';
  geocodingSource?: 'GOOGLE_MAPS_API' | 'SERVER_VALIDATED_BR';
  notes: string;
  proposalsCount: number;
  createdAt: string;
}

export interface ProposalItem {
  id: string;
  freightId: string;
  freightCode: string;
  originLabel: string;
  destinationLabel: string;
  proposerOrganizationId: string;
  proposerName: string;
  proposerVerified?: boolean;
  driverName: string;
  driverRntrc: string;
  vehicleDescription: string;
  originalValueBrl: number;
  proposedValueBrl: number;
  counterValueBrl?: number;
  estimatedDeliveryDays: number;
  status: 'PENDING' | 'COUNTER_OFFER' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
  notes: string;
  createdAt: string;
  history: Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    valueBrl: number;
  }>;
}

export interface ImmutableFeeSnapshot {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  capturedAt: string;
  totalFeePercent: number;
  companyFeePercent: number;
  providerFeePercent: number;
  companyFeeBrl: number;
  providerFeeBrl: number;
  totalPlatformFeeBrl: number;
  netProviderValueBrl: number;
}

export interface ContractItem {
  id: string;
  code: string;
  freightId: string;
  freightCode: string;
  proposalId: string;
  companyName: string;
  providerName: string;
  driverName: string;
  originLabel: string;
  destinationLabel: string;
  agreedFreightValueBrl: number;
  companyFeePercent: number;
  providerFeePercent: number;
  totalFeePercent: number;
  companyFeeBrl: number;
  providerFeeBrl: number;
  totalPlatformFeeBrl: number;
  feeRuleId?: string;
  feeSnapshot?: ImmutableFeeSnapshot;
  status: 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELED';
  signedAt: string;
}

export interface OperationItem {
  id: string;
  freightId: string;
  freightCode: string;
  contractCode: string;
  originCity: string;
  originUf: string;
  destinationCity: string;
  destinationUf: string;
  driverName: string;
  vehiclePlate: string;
  vehicleType: string;
  cargoType: string;
  status: OperationStatus;
  progressPercent: number;
  updatedAt: string;
  timeline: Array<{
    id: string;
    status: OperationStatus;
    description: string;
    timestamp: string;
    city: string;
  }>;
}

export interface ActivityEventItem {
  id: string;
  type: 'PROPOSAL_ACCEPTED' | 'PROPOSAL_RECEIVED' | 'FREIGHT_IN_TRANSIT' | 'DOCUMENT_APPROVED' | 'FREIGHT_PUBLISHED' | 'CONTRACT_CREATED';
  title: string;
  relativeTime: string;
  timestamp: string;
  freightCode?: string;
}

export interface DocumentItem {
  id: string;
  organizationId: string;
  uploadedByUserId?: string;
  ownerName: string;
  ownerRole: string;
  title: string;
  category:
    | 'CNH'
    | 'RNTRC'
    | 'ANTT'
    | 'CRLV'
    | 'NF_E'
    | 'CT_E'
    | 'MDF_E'
    | 'CONTRATO_SOCIAL'
    | 'COMPROVANTE_ENDERECO'
    | 'CARTAO_CNPJ'
    | 'COMPROVANTE_ENTREGA';
  documentNumber: string;
  storageBucket?: StorageBucketName;
  gcsBucket: string;
  gcsObjectPath: string;
  fileSizeLabel: string;
  isMandatory?: boolean;
  submittedAt?: string;
  approvedAt?: string;
  expiresAt: string;
  verificationStatus: 'PENDING' | 'AI_PRE_CHECKED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  aiAnalysisSummary?: string;
  aiInconsistencies?: string[];
  reviewedBy?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface VehicleItem {
  id: string;
  organizationId: string;
  ownerName: string;
  driverName: string;
  plate: string;
  brandModel: string;
  year: number;
  vehicleType: string;
  implementType: string;
  capacityKg: number;
  rntrc: string;
  status: 'DISPONIVEL' | 'EM_VIAGEM' | 'MANUTENCAO';
}

export interface PartnerItem {
  id: string;
  name: string;
  cnpjCpf: string;
  cityUf: string;
  referralCode: string;
  referralLink: string;
  commissionType?: 'PERCENTAGE' | 'FIXED';
  commissionPercent: number;
  fixedCommissionBrl?: number;
  indicationsCount: number;
  conversionsCount: number;
  totalCommissionBrl: number;
  pendingCommissionBrl: number;
  approvedCommissionBrl?: number;
  paidCommissionBrl?: number;
  status: 'ATIVO' | 'PAUSADO';
}

export interface PartnerCommissionItem {
  id: string;
  partnerId: string;
  partnerName: string;
  referredOrganizationId: string;
  referredOrganizationName: string;
  subscriptionId: string;
  planName: string;
  baseAmountBrl: number;
  commissionAmountBrl: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELED';
  createdAt: string;
  paidAt?: string;
}

export interface SubscriptionPlanConfig {
  id: string;
  code: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | string;
  name: string;
  cycleLabel: string;
  billingDays?: number;
  priceBrl: number;
  trialDays: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  description: string;
  features: string[];
}

export interface CommercialSettings {
  totalMaintenanceFeePercent: number;
  companyFeePercent: number;
  providerFeePercent: number;
  freeTrialDays: number;
  defaultPartnerCommissionPercent: number;
  plans: SubscriptionPlanConfig[];
  paymentAdapterStatus: 'DECOUPLED_READY' | 'ACTIVE';
}

export interface AuditLogItem {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  originIp?: string;
  result?: 'SUCCESS' | 'DENIED' | 'ERROR';
  createdAt: string;
}

export interface IntegrationStatus {
  supabasePostgres: {
    configured: boolean;
    mode: 'SUPABASE_CLOUD' | 'POSTGRES_COMPATIBLE_LOCAL_ENGINE';
    details: string;
  };
  geminiNexIA: {
    configured: boolean;
    model: string;
    details: string;
  };
  googleCloudStorage: {
    configured: boolean;
    bucket: string;
    details: string;
  };
  googleMapsPlatform: {
    configured: boolean;
    regionFocus: string;
    details: string;
  };
}

export interface DashboardKPIs {
  publishedFreights: number;
  publishedGrowthPercent: number;
  receivedProposals: number;
  proposalsGrowthPercent: number;
  activeContracts: number;
  contractsGrowthPercent: number;
  estimatedSavingsBrl: number;
  savingsGrowthPercent: number;
}

export interface CostCalculationInput {
  originCity: string;
  destinationCity: string;
  distanceKm: number;
  vehicleType: 'VUC' | 'Toco' | 'Truck' | 'Bitruck' | 'Carreta' | 'Carreta LS' | 'Bitrem' | 'Rodotrem';
  weightTons: number;
  dieselPriceBrl: number;
  avgConsumptionKmL: number;
  tollCostBrl: number;
  operationalDailyBrl: number;
  marginPercent: number;
}

export interface CostCalculationResult {
  distanceKm: number;
  litersNeeded: number;
  fuelCostBrl: number;
  tollCostBrl: number;
  operationalCostBrl: number;
  baseTransportCostBrl: number;
  suggestedMarginBrl: number;
  companyFeeBrl: number;
  providerFeeBrl: number;
  totalPlatformFeeBrl: number;
  recommendedFreightValueBrl: number;
  netDriverEarningsBrl: number;
  costPerKmBrl: number;
  referenceTimestamp: string;
}

// ============================================================================
// FASE 2 — NEXCARGA CONTROL (ADMINISTRAÇÃO GERAL) & NEXGRID GEOCODING TYPES
// ============================================================================

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'PENDING_VERIFICATION';

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpfOrCnpj: string;
  role: UserRole;
  roleLabel: string;
  organizationId: string;
  organizationName: string;
  city: string;
  uf: string;
  status: UserAccountStatus;
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'OVERDUE' | 'SUSPENDED' | 'MANUAL_GRANT';
  verificationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  trustStatus?: NexCargaTrustStatus;
  verifiedBadge?: boolean;
  createdAt: string;
  lastLoginAt: string;
  statusReason?: string;
}

export interface OrganizationItem {
  id: string;
  legalName: string;
  tradeName: string;
  cnpjOrCpf: string;
  type: 'COMPANY' | 'DRIVER' | 'CARRIER' | 'PLATFORM';
  city: string;
  uf: string;
  cep: string;
  responsibleUserId: string;
  responsibleUserName: string;
  membersCount: number;
  activePlanId: string;
  activePlanName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'IN_REVIEW';
  trustStatus?: NexCargaTrustStatus;
  verifiedBadge?: boolean;
  publishedFreightsCount: number;
  completedContractsCount: number;
  financialVolumeBrl: number;
  createdAt: string;
}

export type SubscriptionStatusType =
  | 'ACTIVE'
  | 'TRIAL'
  | 'EXPIRED'
  | 'OVERDUE'
  | 'SUSPENDED'
  | 'CANCELED'
  | 'MANUAL_GRANT';

export interface SubscriptionItem {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  planId: string;
  planCode: string;
  planName: string;
  cycleLabel: string;
  priceBrl: number;
  status: SubscriptionStatusType;
  startDate: string;
  validUntil: string;
  autoRenew: boolean;
  isManualGrant: boolean;
  grantReason?: string;
  grantedBy?: string;
  adminNotes?: string;
  delinquencyDays: number;
  updatedAt: string;
}

export type PaymentStatusType =
  | 'CONFIRMED'
  | 'PENDING'
  | 'DECLINED'
  | 'OVERDUE'
  | 'REFUNDED';

export interface PaymentTransactionItem {
  id: string;
  code: string;
  organizationId: string;
  organizationName: string;
  subscriptionId?: string;
  contractCode?: string;
  category: 'SUBSCRIPTION' | 'PLATFORM_MAINTENANCE_FEE' | 'REFUND' | 'PARTNER_PAYOUT';
  description: string;
  amountBrl: number;
  status: PaymentStatusType;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO_BANCARIO' | 'GATEWAY_SPLIT';
  dueDate: string;
  paidAt?: string;
  gatewayReference: string;
  adminAdjustmentNote?: string;
}

export interface FeeRuleItem {
  id: string;
  code: string;
  name: string;
  feeType: 'MAINTENANCE' | 'ADDITIONAL_SERVICE';
  totalPercent: number;
  companyPercent: number;
  providerPercent: number;
  fixedFeeBrl: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedBy: string;
}

export interface DelinquencyPolicy {
  gracePeriodDays: number;
  preDueNoticeDays: number;
  postDueNoticeDays: number;
  autoSuspensionDays: number;
  blockedResources: string[];
  allowActiveOperationsCompletion: boolean;
  autoReactivateOnPayment: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type AdminPermissionAction =
  | 'MANAGE_USERS'
  | 'MANAGE_ORGANIZATIONS'
  | 'MANAGE_PLANS'
  | 'GRANT_MANUAL_SUBSCRIPTION'
  | 'MANAGE_FINANCE'
  | 'MANAGE_FEES'
  | 'MANAGE_DELINQUENCY'
  | 'MANAGE_PARTNERS'
  | 'MANAGE_PERMISSIONS'
  | 'VIEW_AUDIT_LOGS'
  | 'VERIFY_DOCUMENTS'
  | 'MANAGE_PLATFORM_SETTINGS';

export type RolePermissionMatrix = Record<UserRole, AdminPermissionAction[]>;

export interface PlatformGeneralSettings {
  platformName: string;
  slogan: string;
  developerCompany: string;
  headquartersCityUf: string;
  supportEmail: string;
  supportPhone: string;
  nexgridDefaultLat: number;
  nexgridDefaultLng: number;
  nexgridDefaultRadiusKm: number;
  nexiaEnabled: boolean;
  nexiaVerifyRequireHumanApproval: boolean;
  maintenanceMode: boolean;
  pwaInstallBannerEnabled: boolean;
  maxUploadSizeMb: number;
  updatedAt: string;
}

export interface AdminControlOverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  blockedOrSuspendedUsers: number;
  registeredCompanies: number;
  registeredDrivers: number;
  registeredCarriers: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  manualGrantSubscriptions: number;
  expiredSubscriptions: number;
  canceledSubscriptions: number;
  overdueSubscriptions: number;
  mrrBrl: number;
  accumulatedRevenueBrl: number;
  pendingPaymentsBrl: number;
  delinquencyAmountBrl: number;
  totalPublishedFreights: number;
  completedContracts: number;
  totalFinancialVolumeBrl: number;
  collectedFeesBrl: number;
  pendingCommissionsBrl: number;
}

export interface GeocodeAddressRequest {
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city: string;
  uf: string;
}

export interface GeocodeAddressResponse {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city: string;
  uf: string;
  cep: string;
  source: 'GOOGLE_MAPS_GEOCODING_API' | 'NEXGRID_BR_VALIDATION_ENGINE';
  validated: boolean;
}

export interface UserProfileAccount {
  userId: string;
  authUserId: string;
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  jobTitle: string;
  role: UserRole;
  roleLabel: string;
  organizationId: string;
  organizationName: string;
  organizationCnpjOrCpf: string;
  city: string;
  uf: string;
  avatarUrl: string;
  avatarBucket: StorageBucketName;
  createdAt: string;
  accountStatus: UserAccountStatus;
  trustStatus: NexCargaTrustStatus;
  verifiedBadge: boolean;
  twoFactorEnabled: boolean;
  lastPasswordUpdateAt: string;
  activeSessionsCount: number;
  notificationPreferences: {
    emailAlerts: boolean;
    pushNotifications: boolean;
    whatsappOperational: boolean;
    securityAlerts: boolean;
    proposalsAndContracts?: boolean;
    documentExpirationWarnings?: boolean;
    communicationFrequency?: 'IMMEDIATE' | 'DAILY_DIGEST' | 'CRITICAL_ONLY';
    preferredChannel?: 'WHATSAPP_AND_EMAIL' | 'EMAIL_ONLY' | 'PUSH_AND_WHATSAPP';
  };
  accountSettings?: {
    languageRegion: 'pt-BR';
    timezone: string;
    defaultWeightUnit: 'TONS' | 'KG';
    defaultLandingSection: NavSectionId;
    profileVisibility: 'PUBLIC_VERIFIED' | 'CONTRACTED_ONLY';
    shareRadarTelemetry: boolean;
    lgpdConsentActive: boolean;
    sessionTimeoutMinutes: 30 | 120 | 480;
    requireDeviceConfirmation: boolean;
  };
}

export type TrustEntityCategory =
  | 'DRIVER'
  | 'CARRIER'
  | 'COMPANY_SHIPPER'
  | 'COMPANY_PROVIDER'
  | 'COMMERCIAL_PARTNER';

export interface NexCargaTrustRequirement {
  category: DocumentItem['category'];
  label: string;
  bucket: StorageBucketName;
  mandatory: boolean;
  description: string;
}

export interface NexCargaTrustVerificationItem {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationCnpjOrCpf: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  entityCategory: TrustEntityCategory;
  entityCategoryLabel: string;
  trustStatus: NexCargaTrustStatus;
  verifiedBadge: boolean;
  pendingRequirements: string[];
  regularizationInstructions: string;
  rejectionReason?: string;
  suspensionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByUserId?: string;
  expiresAt?: string;
  requiredDocuments: NexCargaTrustRequirement[];
}

export interface NexCargaTrustHistoryItem {
  id: string;
  verificationId: string;
  organizationId: string;
  organizationName: string;
  documentId?: string;
  documentTitle?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  previousStatus: NexCargaTrustStatus | string;
  newStatus: NexCargaTrustStatus | string;
  actionType: string;
  reason: string;
  createdAt: string;
}

export interface BootstrapResponse {
  activeProfile: ActiveProfileSession;
  availableProfiles: ActiveProfileSession[];
  authorizedContexts: AuthorizedOrgContext[];
  userProfile: UserProfileAccount;
  trustVerification: NexCargaTrustVerificationItem;
  trustHistory: NexCargaTrustHistoryItem[];
  kpis: DashboardKPIs;
  freights: FreightItem[];
  proposals: ProposalItem[];
  contracts: ContractItem[];
  operations: OperationItem[];
  activities: ActivityEventItem[];
  documents: DocumentItem[];
  vehicles: VehicleItem[];
  partners: PartnerItem[];
  commercialSettings: CommercialSettings;
  auditLogs: AuditLogItem[];
  integrations: IntegrationStatus;
  subscription: {
    planName: string;
    status: 'ATIVO' | 'AVALIACAO_GRATUITA';
    validUntil: string;
    cycle: string;
    priceBrl: number;
    trialDaysRemaining?: number;
  };
  // Phase 2 NexCarga Control collections
  adminControl?: {
    overview: AdminControlOverviewMetrics;
    users: AdminUserItem[];
    organizations: OrganizationItem[];
    subscriptions: SubscriptionItem[];
    payments: PaymentTransactionItem[];
    feeRules: FeeRuleItem[];
    delinquencyPolicy: DelinquencyPolicy;
    partnerCommissions: PartnerCommissionItem[];
    rolePermissions: RolePermissionMatrix;
    platformSettings: PlatformGeneralSettings;
    trustVerifications?: NexCargaTrustVerificationItem[];
    trustHistory?: NexCargaTrustHistoryItem[];
  };
}
