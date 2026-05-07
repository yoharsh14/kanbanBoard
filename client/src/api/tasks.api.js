import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/task";

export const createTaskApi = (data) =>
  axios.post(`${BASE}/create`, data).then((r) => r.data);

export const editTaskApi = (data) =>
  axios.post(`${BASE}/edit`, data).then((r) => r.data);

export const deleteTaskApi = (id) =>
  axios.post(`${BASE}/delete`, { id }).then((r) => r.data);

export const moveTaskApi = (data) =>
  axios.post(`${BASE}/move`, data).then((r) => r.data);

export const getAllTasksApi = () =>
  axios.get(`${BASE}`).then((r) => r.data);
