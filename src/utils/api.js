// Thin wrapper over the GLOBAL axios instance. Do not use axios.create(): the new
// instance would not inherit the axios.defaults.headers.common mutations made by
// AuthContext (the token), nor the session interceptors.
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const url = (path) => `${API_BASE_URL}${path}`;

export const apiGet = (path, config) => axios.get(url(path), config);
export const apiPost = (path, data, config) => axios.post(url(path), data, config);
export const apiPut = (path, data, config) => axios.put(url(path), data, config);
export const apiPatch = (path, data, config) => axios.patch(url(path), data, config);
export const apiDelete = (path, config) => axios.delete(url(path), config);

// Friendly error message coming from the API ({ error } | { message }) or a fallback.
export const apiErrorMessage = (error, fallback = 'Request failed') =>
	error?.response?.data?.error || error?.response?.data?.message || fallback;
