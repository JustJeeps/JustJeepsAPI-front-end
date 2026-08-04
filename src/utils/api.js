// Wrapper fino sobre o axios GLOBAL. Não usar axios.create(): a instância não
// herdaria as mutações de axios.defaults.headers.common feitas pelo
// AuthContext (token) nem os interceptors de sessão.
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const url = (path) => `${API_BASE_URL}${path}`;

export const apiGet = (path, config) => axios.get(url(path), config);
export const apiPost = (path, data, config) => axios.post(url(path), data, config);
export const apiPut = (path, data, config) => axios.put(url(path), data, config);
export const apiPatch = (path, data, config) => axios.patch(url(path), data, config);
export const apiDelete = (path, config) => axios.delete(url(path), config);

// Mensagem de erro amigável vinda da API ({ error } | { message }) ou fallback.
export const apiErrorMessage = (error, fallback = 'Request failed') =>
	error?.response?.data?.error || error?.response?.data?.message || fallback;
