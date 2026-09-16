import axios from 'axios';

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "/api",
	timeout: 8000,
});
export const getError = (err) => err.response?.data?.error || 'Something went wrong. Please try again.';
