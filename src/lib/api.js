// src/lib/api.js

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Parámetros del acuario
  listParams: () => request('GET', 'params'),
  addParam: (data) => request('POST', 'params', data),
  delParam: (id) => request('DELETE', `params?id=${id}`),

  // Dosificación
  listDoses: () => request('GET', 'doses'),
  addDose: (data) => request('POST', 'doses', data),
  delDose: (id) => request('DELETE', `doses?id=${id}`),

  // Tareas
  listTasks: () => request('GET', 'tasks'),
  addTask: (data) => request('POST', 'tasks', data),
  delTask: (id) => request('DELETE', `tasks?id=${id}`),

  // Inventario
  listInventory: () => request('GET', 'inventory'),
  addInventory: (data) => request('POST', 'inventory', data),
  delInventory: (id) => request('DELETE', `inventory?id=${id}`),

  // Alimentación
  listFeed: () => request('GET', 'feed'),
  addFeed: (data) => request('POST', 'feed', data),
  delFeed: (id) => request('DELETE', `feed?id=${id}`),

  // Eventos
  listEvents: () => request('GET', 'events'),
  addEvent: (data) => request('POST', 'events', data),
  delEvent: (id) => request('DELETE', `events?id=${id}`),

  // Iluminación
  listLights: () => request('GET', 'lights'),
  addLight: (data) => request('POST', 'lights', data),
  delLight: (id) => request('DELETE', `lights?id=${id}`),
};
