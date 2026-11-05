import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const host = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web'
    ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`
    : `http://${host}:4000`);
let token: string | null = null;
let sessionRevision = 0;
export const mediaUrl = (url: string) => (url.startsWith('/') ? `${API_URL}${url}` : url);
export const sessionStore = {
  get revision() {
    return sessionRevision;
  },
  async read() {
    token =
      Platform.OS === 'web'
        ? await AsyncStorage.getItem('luma.token')
        : await SecureStore.getItemAsync('luma.token');
    return token;
  },
  async write(value: string | null) {
    sessionRevision++;
    token = value;
    if (Platform.OS === 'web') {
      if (value) await AsyncStorage.setItem('luma.token', value);
      else await AsyncStorage.removeItem('luma.token');
    } else if (value) await SecureStore.setItemAsync('luma.token', value);
    else await SecureStore.deleteItemAsync('luma.token');
  },
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.body instanceof FormData ? 120000 : 20000,
  );
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.message || 'Không thể kết nối. Vui lòng thử lại.', response.status);
    }
    return response.status === 204 ? (undefined as T) : await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Không kết nối được máy chủ. Kiểm tra Wi-Fi và đảm bảo backend đang chạy.');
  } finally {
    clearTimeout(timeout);
  }
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const put = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) });
