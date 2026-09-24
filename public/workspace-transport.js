export class WorkspaceError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}
export function createWorkspaceTransport({request = (...args) => fetch(...args), timeoutMs = 15000} = {}) {
  async function send(options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await request('/api/workspace', {...options, signal: controller.signal});
      const result = await response.json();
      if (!response.ok) throw new WorkspaceError(result.error || 'Your library could not be saved.', response.status);
      return result;
    } catch (error) {
      if (controller.signal.aborted) throw new WorkspaceError('The connection timed out. Your changes are still here; please retry.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  return {
    load: () => send(),
    save: (data, revision) => send({method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({data, revision})}),
  };
}
