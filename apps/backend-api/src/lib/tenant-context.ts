export async function setTenantContext(tx: any, tenantId: string) {
  await tx`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
}