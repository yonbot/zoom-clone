import type { InternalAxiosRequestConfig } from "axios";

// リクエストにAuthorizationヘッダーを追加するインターセプター
export const addAuthorizationHeader = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (!token) return config;
  config.headers.Authorization = `Bearer ${token}`;
  return config;
};