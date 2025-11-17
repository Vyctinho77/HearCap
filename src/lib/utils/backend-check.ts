/**
 * Utilitário para verificar se o backend está disponível
 */

let backendAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // Verifica a cada 30 segundos
const CHECK_TIMEOUT = 2000; // Timeout de 2 segundos

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

/**
 * Verifica se o backend está disponível (com cache)
 */
export async function isBackendAvailable(): Promise<boolean> {
  const now = Date.now();
  
  // Se já verificamos recentemente, retorna o valor em cache
  if (backendAvailable !== null && (now - lastCheckTime) < CHECK_INTERVAL) {
    return backendAvailable;
  }

  try {
    // Tenta fazer uma requisição simples para verificar se o backend está rodando
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT);
    
    await fetch(`${API_BASE}/api/market/ticker24h?symbol=TEST`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Se chegou aqui, o backend está respondendo (mesmo que retorne erro 404)
    backendAvailable = true;
    lastCheckTime = now;
    return true;
  } catch (error) {
    // Backend não está disponível
    backendAvailable = false;
    lastCheckTime = now;
    return false;
  }
}

/**
 * Força uma nova verificação (ignora cache)
 */
export async function checkBackendAvailability(): Promise<boolean> {
  backendAvailable = null;
  lastCheckTime = 0;
  return isBackendAvailable();
}

/**
 * Retorna o status em cache sem fazer nova verificação
 */
export function getCachedBackendStatus(): boolean | null {
  return backendAvailable;
}

