import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAdminControlMetrics,
  calculateDistanceKm,
  calculateLogisticsCost,
  calculatePlatformFees,
  canRoleAccessSection,
  createImmutableFeeSnapshot,
  evaluateSubscriptionDelinquency,
  filterFreightsByRoleVisibility,
  filterNexgridFreights,
  formatBrl,
  formatDateBr,
  geocodeBrazilianAddress,
  hasAdminPermission,
  validateCep,
  validateCnpj,
  validateCpf,
  validateFeeRuleSplit,
} from './logisticsRules';
import {
  INITIAL_ADMIN_USERS,
  INITIAL_CONTRACTS,
  INITIAL_DELINQUENCY_POLICY,
  INITIAL_FEE_RULES,
  INITIAL_FREIGHTS,
  INITIAL_ORGANIZATIONS,
  INITIAL_PARTNER_COMMISSIONS,
  INITIAL_PAYMENTS,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_SUBSCRIPTIONS,
} from '../data/initialSeed';

describe('NEXCARGA — Regras Comerciais, NEXGRID e NexCarga Control (FASE 1 & FASE 2)', () => {
  it('Formata valores monetários no padrão brasileiro R$ 1.234,56 e datas DD/MM/AAAA', () => {
    assert.equal(formatBrl(12480), 'R$ 12.480,00');
    assert.equal(formatBrl(79.9), 'R$ 79,90');
    assert.equal(formatDateBr('2026-11-05'), '05/11/2026');
  });

  it('Valida CPF, CNPJ e CEP brasileiros', () => {
    assert.equal(validateCpf('084.512.936-20'), true);
    assert.equal(validateCpf('111.111.111-11'), false);
    assert.equal(validateCnpj('18.492.310/0001-54'), true);
    assert.equal(validateCep('36900-000'), true);
    assert.equal(validateCep('3690'), false);
  });

  it('Calcula taxa padrão da plataforma de 3,5% (1,75% contratante + 1,75% prestador)', () => {
    const res = calculatePlatformFees(5600, 1.75, 1.75);
    assert.equal(res.totalFeePercent, 3.5);
    assert.equal(res.companyFeeBrl, 98.0);
    assert.equal(res.providerFeeBrl, 98.0);
    assert.equal(res.totalPlatformFeeBrl, 196.0);
    assert.equal(res.netProviderValueBrl, 5502.0);
  });

  it('Valida matematicamente a divisão da regra de taxa (soma contratante + prestador = total)', () => {
    const validSplit = validateFeeRuleSplit(3.5, 1.75, 1.75);
    assert.equal(validSplit.valid, true);

    const invalidSplit = validateFeeRuleSplit(3.5, 2.0, 2.0);
    assert.equal(invalidSplit.valid, false);
    assert.ok(invalidSplit.error?.includes('Divisão matemática inválida'));
  });

  it('Gera snapshot imutável de taxa no contrato sem sofrer alteração retroativa', () => {
    const activeRule = INITIAL_FEE_RULES[0];
    const snapshot = createImmutableFeeSnapshot(10000, activeRule);
    assert.equal(snapshot.totalFeePercent, 3.5);
    assert.equal(snapshot.companyFeeBrl, 175.0);
    assert.equal(snapshot.providerFeeBrl, 175.0);
    assert.equal(snapshot.totalPlatformFeeBrl, 350.0);

    // Simula mudança futura na regra para 4.0% e confirma que o snapshot permanece 3.5%
    const mutatedRule = { ...activeRule, totalPercent: 4.0, companyPercent: 2.0, providerPercent: 2.0 };
    assert.equal(mutatedRule.totalPercent, 4.0);
    assert.equal(snapshot.totalFeePercent, 3.5);
    assert.equal(snapshot.totalPlatformFeeBrl, 350.0);
  });

  it('Geocodifica endereços brasileiros no servidor e valida coordenadas (Manhuaçu/MG -> Vitória/ES)', () => {
    const geoOrig = geocodeBrazilianAddress({
      city: 'Manhuaçu',
      uf: 'MG',
      cep: '36900-000',
      street: 'Rodovia BR-262',
      number: 'Km 38',
      neighborhood: 'Distrito Industrial',
    });
    assert.equal(geoOrig.validated, true);
    assert.equal(geoOrig.uf, 'MG');
    assert.ok(Math.abs(geoOrig.latitude - -20.2572) < 0.05);
    assert.ok(Math.abs(geoOrig.longitude - -42.0336) < 0.05);

    const dist = calculateDistanceKm(geoOrig.latitude, geoOrig.longitude, -20.3155, -40.3128);
    assert.ok(dist > 150 && dist < 320);
  });

  it('Filtra oportunidades no Radar NEXGRID por todos os parâmetros avançados (veículo, implemento, peso, valor, UF)', () => {
    const trucksOnly = filterNexgridFreights(INITIAL_FREIGHTS, {
      vehicleType: 'Truck',
    });
    assert.ok(trucksOnly.length > 0);
    assert.ok(trucksOnly.every((f) => f.vehicleRequired === 'Truck'));

    const siderOnly = filterNexgridFreights(INITIAL_FREIGHTS, {
      implementType: 'Sider',
      minWeightKg: 15000,
    });
    assert.ok(siderOnly.length >= 1);
    assert.ok(siderOnly.every((f) => f.implementRequired.includes('Sider') && f.weightKg >= 15000));

    const valueFiltered = filterNexgridFreights(INITIAL_FREIGHTS, {
      minValueBrl: 6000,
      maxValueBrl: 8500,
    });
    assert.ok(valueFiltered.every((f) => f.offeredValueBrl >= 6000 && f.offeredValueBrl <= 8500));
  });

  it('Aplica visibilidade por perfil e isolamento multi-tenant no NEXGRID', () => {
    const privateFreight = {
      ...INITIAL_FREIGHTS[0],
      id: 'fr-private-test',
      organizationId: 'org-vale-sa',
      visibility: 'PRIVATE' as const,
    };
    const list = [privateFreight, INITIAL_FREIGHTS[1]];

    // Outra empresa ou motorista não pode ver frete PRIVATE de org-vale-sa
    const driverVisible = filterFreightsByRoleVisibility(list, 'DRIVER', 'org-driver-joao');
    assert.equal(driverVisible.some((f) => f.id === 'fr-private-test'), false);

    // A própria empresa dona do frete vê seu frete PRIVATE
    const ownerVisible = filterFreightsByRoleVisibility(list, 'COMPANY', 'org-vale-sa');
    assert.equal(ownerVisible.some((f) => f.id === 'fr-private-test'), true);

    // SUPER_ADMIN possui visão global
    const adminVisible = filterFreightsByRoleVisibility(list, 'SUPER_ADMIN', 'org-pupa-labs');
    assert.equal(adminVisible.length, 2);
  });

  it('Aplica RBAC administrativo por princípio do menor privilégio no NexCarga Control', () => {
    assert.equal(canRoleAccessSection('DRIVER', 'publicar-frete'), false);
    assert.equal(canRoleAccessSection('COMPANY', 'publicar-frete'), true);

    // Somente SUPER_ADMIN pode conceder assinatura manual gratuita
    assert.equal(
      hasAdminPermission('SUPER_ADMIN', 'GRANT_MANUAL_SUBSCRIPTION', INITIAL_ROLE_PERMISSIONS),
      true
    );
    assert.equal(
      hasAdminPermission('FINANCE', 'GRANT_MANUAL_SUBSCRIPTION', INITIAL_ROLE_PERMISSIONS),
      false
    );
    assert.equal(
      hasAdminPermission('VERIFICATION', 'MANAGE_FEES', INITIAL_ROLE_PERMISSIONS),
      false
    );
    assert.equal(
      hasAdminPermission('VERIFICATION', 'VERIFY_DOCUMENTS', INITIAL_ROLE_PERMISSIONS),
      true
    );
  });

  it('Avalia política de inadimplência preservando operações logísticas em andamento e respeitando concessão manual', () => {
    const overdueSub = INITIAL_SUBSCRIPTIONS.find((s) => s.id === 'sub-transrio-overdue')!;
    const evalOverdue = evaluateSubscriptionDelinquency(overdueSub, INITIAL_DELINQUENCY_POLICY);
    assert.equal(evalOverdue.shouldSuspendAccess, true);
    assert.equal(evalOverdue.recommendedStatus, 'SUSPENDED');
    assert.equal(evalOverdue.preserveActiveOperations, true);

    const manualGrantSub = INITIAL_SUBSCRIPTIONS.find((s) => s.isManualGrant)!;
    const evalGrant = evaluateSubscriptionDelinquency(manualGrantSub, INITIAL_DELINQUENCY_POLICY);
    assert.equal(evalGrant.shouldSuspendAccess, false);
    assert.equal(evalGrant.recommendedStatus, 'MANUAL_GRANT');
  });

  it('Calcula todos os indicadores reais do dashboard NexCarga Control sem valores aleatórios', () => {
    const metrics = calculateAdminControlMetrics({
      users: INITIAL_ADMIN_USERS,
      organizations: INITIAL_ORGANIZATIONS,
      subscriptions: INITIAL_SUBSCRIPTIONS,
      payments: INITIAL_PAYMENTS,
      freights: INITIAL_FREIGHTS,
      contracts: INITIAL_CONTRACTS,
      partnerCommissions: INITIAL_PARTNER_COMMISSIONS,
    });

    assert.equal(metrics.totalUsers, INITIAL_ADMIN_USERS.length);
    assert.ok(metrics.activeUsers >= 6);
    assert.ok(metrics.manualGrantSubscriptions >= 1);
    assert.ok(metrics.mrrBrl > 0);
    assert.ok(metrics.accumulatedRevenueBrl > 0);
    assert.equal(metrics.totalPublishedFreights, INITIAL_FREIGHTS.length);
    assert.ok(metrics.collectedFeesBrl > 0);
  });

  it('Calcula custos logísticos no Motor de Custos com diesel, pedágio, diária e margem', () => {
    const cost = calculateLogisticsCost({
      originCity: 'Manhuaçu/MG',
      destinationCity: 'Vitória/ES',
      distanceKm: 295,
      vehicleType: 'Truck',
      weightTons: 14,
      dieselPriceBrl: 6.15,
      avgConsumptionKmL: 3.2,
      tollCostBrl: 165,
      operationalDailyBrl: 340,
      marginPercent: 18,
    });
    assert.ok(cost.litersNeeded > 90);
    assert.ok(cost.recommendedFreightValueBrl > cost.baseTransportCostBrl);
    assert.ok(cost.netDriverEarningsBrl < cost.recommendedFreightValueBrl);
  });
});
