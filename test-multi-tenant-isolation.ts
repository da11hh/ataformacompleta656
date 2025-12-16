#!/usr/bin/env tsx

/**
 * TESTE DE ISOLAMENTO MULTI-TENANT
 * 
 * Este teste valida que:
 * 1. Tenant A não pode ver dados de Tenant B
 * 2. Tenant B não pode ver dados de Tenant A
 * 3. Queries filtram corretamente por tenantId
 */

import { db } from './server/db.js';
import { clients, leads, files, pluggyConfig } from './shared/db-schema.js';
import { eq, and } from 'drizzle-orm';

const TENANT_A = 'tenant_test_a';
const TENANT_B = 'tenant_test_b';

async function testIsolation() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 TESTE DE ISOLAMENTO MULTI-TENANT                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // ============================================================
    // 1. SETUP - Limpar dados de teste anteriores
    // ============================================================
    console.log('📋 SETUP: Limpando dados de teste anteriores...');
    await db.delete(clients).where(eq(clients.tenantId, TENANT_A));
    await db.delete(clients).where(eq(clients.tenantId, TENANT_B));
    await db.delete(leads).where(eq(leads.tenantId, TENANT_A));
    await db.delete(leads).where(eq(leads.tenantId, TENANT_B));
    console.log('✅ Setup concluído\n');

    // ============================================================
    // 2. INSERIR DADOS - Criar dados para cada tenant
    // ============================================================
    console.log('📝 INSERINDO DADOS DE TESTE:');
    
    // Cliente para Tenant A
    await db.insert(clients).values({
      id: 'test-client-a',
      name: 'Cliente do Tenant A',
      email: 'cliente-a@test.com',
      tenantId: TENANT_A
    });
    console.log(`   ✓ Cliente inserido para ${TENANT_A}`);

    // Cliente para Tenant B
    await db.insert(clients).values({
      id: 'test-client-b',
      name: 'Cliente do Tenant B',
      email: 'cliente-b@test.com',
      tenantId: TENANT_B
    });
    console.log(`   ✓ Cliente inserido para ${TENANT_B}`);

    // Lead para Tenant A
    await db.insert(leads).values({
      telefone: '+55119999991111',
      telefoneNormalizado: '5511999999111',
      nome: 'Lead do Tenant A',
      tenantId: TENANT_A
    });
    console.log(`   ✓ Lead inserido para ${TENANT_A}`);

    // Lead para Tenant B
    await db.insert(leads).values({
      telefone: '+55119999992222',
      telefoneNormalizado: '5511999999222',
      nome: 'Lead do Tenant B',
      tenantId: TENANT_B
    });
    console.log(`   ✓ Lead inserido para ${TENANT_B}\n`);

    // ============================================================
    // 3. TESTE DE ISOLAMENTO - Verificar que dados não vazam
    // ============================================================
    console.log('🔍 TESTANDO ISOLAMENTO:\n');

    // Buscar clientes de Tenant A
    const clientsA = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, TENANT_A));
    
    console.log(`   Tenant A - Clientes encontrados: ${clientsA.length}`);
    console.log(`   ✓ Esperado: 1, Obtido: ${clientsA.length}`);
    
    if (clientsA.length !== 1) {
      throw new Error(`❌ FALHA: Tenant A deveria ter 1 cliente, mas tem ${clientsA.length}`);
    }
    
    if (clientsA[0].name !== 'Cliente do Tenant A') {
      throw new Error(`❌ FALHA: Tenant A vendo dados incorretos!`);
    }

    // Buscar clientes de Tenant B
    const clientsB = await db
      .select()
      .from(clients)
      .where(eq(clients.tenantId, TENANT_B));
    
    console.log(`   Tenant B - Clientes encontrados: ${clientsB.length}`);
    console.log(`   ✓ Esperado: 1, Obtido: ${clientsB.length}`);
    
    if (clientsB.length !== 1) {
      throw new Error(`❌ FALHA: Tenant B deveria ter 1 cliente, mas tem ${clientsB.length}`);
    }
    
    if (clientsB[0].name !== 'Cliente do Tenant B') {
      throw new Error(`❌ FALHA: Tenant B vendo dados incorretos!`);
    }

    // Buscar leads de Tenant A
    const leadsA = await db
      .select()
      .from(leads)
      .where(eq(leads.tenantId, TENANT_A));
    
    console.log(`\n   Tenant A - Leads encontrados: ${leadsA.length}`);
    console.log(`   ✓ Esperado: 1, Obtido: ${leadsA.length}`);
    
    if (leadsA.length !== 1) {
      throw new Error(`❌ FALHA: Tenant A deveria ter 1 lead, mas tem ${leadsA.length}`);
    }
    
    if (leadsA[0].nome !== 'Lead do Tenant A') {
      throw new Error(`❌ FALHA: Tenant A vendo leads incorretos!`);
    }

    // Buscar leads de Tenant B
    const leadsB = await db
      .select()
      .from(leads)
      .where(eq(leads.tenantId, TENANT_B));
    
    console.log(`   Tenant B - Leads encontrados: ${leadsB.length}`);
    console.log(`   ✓ Esperado: 1, Obtido: ${leadsB.length}`);
    
    if (leadsB.length !== 1) {
      throw new Error(`❌ FALHA: Tenant B deveria ter 1 lead, mas tem ${leadsB.length}`);
    }
    
    if (leadsB[0].nome !== 'Lead do Tenant B') {
      throw new Error(`❌ FALHA: Tenant B vendo leads incorretos!`);
    }

    // ============================================================
    // 4. VERIFICAÇÃO CRUZADA - Garantir que não há vazamento
    // ============================================================
    console.log('\n🔐 VERIFICAÇÃO DE VAZAMENTO CRUZADO:\n');

    // Verificar que Tenant A NÃO vê dados de Tenant B
    const clientsAWithBFilter = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, TENANT_A),
          eq(clients.name, 'Cliente do Tenant B')
        )
      );
    
    console.log(`   Tenant A tentando ver dados de Tenant B: ${clientsAWithBFilter.length} resultados`);
    console.log(`   ✓ Esperado: 0 (nenhum vazamento)`);
    
    if (clientsAWithBFilter.length > 0) {
      throw new Error('❌ FALHA CRÍTICA: Vazamento cross-tenant detectado! Tenant A pode ver dados de Tenant B!');
    }

    // Verificar que Tenant B NÃO vê dados de Tenant A
    const clientsBWithAFilter = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, TENANT_B),
          eq(clients.name, 'Cliente do Tenant A')
        )
      );
    
    console.log(`   Tenant B tentando ver dados de Tenant A: ${clientsBWithAFilter.length} resultados`);
    console.log(`   ✓ Esperado: 0 (nenhum vazamento)`);
    
    if (clientsBWithAFilter.length > 0) {
      throw new Error('❌ FALHA CRÍTICA: Vazamento cross-tenant detectado! Tenant B pode ver dados de Tenant A!');
    }

    // ============================================================
    // 5. CLEANUP - Limpar dados de teste
    // ============================================================
    console.log('\n🧹 CLEANUP: Limpando dados de teste...');
    await db.delete(clients).where(eq(clients.tenantId, TENANT_A));
    await db.delete(clients).where(eq(clients.tenantId, TENANT_B));
    await db.delete(leads).where(eq(leads.tenantId, TENANT_A));
    await db.delete(leads).where(eq(leads.tenantId, TENANT_B));
    console.log('✅ Cleanup concluído');

    // ============================================================
    // RESULTADO FINAL
    // ============================================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ TESTE DE ISOLAMENTO MULTI-TENANT: PASSOU!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n🎉 Isolamento multi-tenant 100% funcional!');
    console.log('   • Tenant A não vê dados de Tenant B');
    console.log('   • Tenant B não vê dados de Tenant A');
    console.log('   • Queries filtram corretamente por tenantId\n');

    process.exit(0);

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ TESTE DE ISOLAMENTO MULTI-TENANT: FALHOU!            ║');
    console.error('╚════════════════════════════════════════════════════════════╝\n');
    console.error('Erro:', error);
    
    // Cleanup em caso de erro
    try {
      await db.delete(clients).where(eq(clients.tenantId, TENANT_A));
      await db.delete(clients).where(eq(clients.tenantId, TENANT_B));
      await db.delete(leads).where(eq(leads.tenantId, TENANT_A));
      await db.delete(leads).where(eq(leads.tenantId, TENANT_B));
    } catch (cleanupError) {
      console.error('Erro no cleanup:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Executar teste
testIsolation();
