// v341 — Super Admin now connected to real internal API

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json?.error?.message || `Request failed: ${res.status}`);
  }
  return json?.data;
}

export const superAdminService = {
  async listTenants() {
    const data = await fetchJson('/api/internal/platform/tenants');
    return data.items || [];
  },
  async saveTenant(record: any) {
    return fetchJson('/api/internal/platform/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  },
  async deleteTenant(id: string) {
    await fetchJson(`/api/internal/platform/tenants?id=${id}`, { method: 'DELETE' });
  },

  async listDeployments() {
    const data = await fetchJson('/api/internal/platform/deployments');
    return data.items || [];
  },
  async saveDeployment(record: any) {
    return fetchJson('/api/internal/platform/deployments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  },
  async deleteDeployment(id: string) {
    await fetchJson(`/api/internal/platform/deployments?id=${id}`, { method: 'DELETE' });
  },

  async listDemoUploads() {
    const data = await fetchJson('/api/internal/platform/demo-uploads');
    return data.items || [];
  },
  async saveDemoUpload(record: any) {
    return fetchJson('/api/internal/platform/demo-uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  },
  async deleteDemoUpload(id: string) {
    await fetchJson(`/api/internal/platform/demo-uploads?id=${id}`, { method: 'DELETE' });
  },
};
