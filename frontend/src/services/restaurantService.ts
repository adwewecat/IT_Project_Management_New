import apiClient from './api';
import {
  RestaurantItem,
  RestaurantListResponse,
  RestaurantFilterParams,
  RestaurantOptionsResponse,
  BrandItem,
  BrandCreate,
  RegionItem,
  RegionCreate,
  RestaurantAuditLogsResponse,
  RestaurantAuditLogsParams,
} from '../types/restaurant';

export const getRestaurants = async (
  params: RestaurantFilterParams = {}
): Promise<RestaurantListResponse> => {
  const response = await apiClient.get<RestaurantListResponse>('/restaurants', {
    params,
  });
  return response.data;
};

export const getFilterOptions = async (): Promise<RestaurantOptionsResponse> => {
  const response = await apiClient.get<RestaurantOptionsResponse>('/restaurants/options');
  return response.data;
};

export const getRestaurantById = async (id: number): Promise<RestaurantItem> => {
  const response = await apiClient.get<RestaurantItem>(`/restaurants/${id}`);
  return response.data;
};

export const createRestaurant = async (
  data: Partial<RestaurantItem>
): Promise<RestaurantItem> => {
  const response = await apiClient.post<RestaurantItem>('/restaurants', data);
  return response.data;
};

export const updateRestaurant = async (
  id: number,
  data: Partial<RestaurantItem>
): Promise<RestaurantItem> => {
  const response = await apiClient.put<RestaurantItem>(`/restaurants/${id}`, data);
  return response.data;
};

export const exportRestaurantsExcel = async (
  params: RestaurantFilterParams = {}
): Promise<Blob> => {
  const response = await apiClient.get('/restaurants/export/excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const getBrands = async (): Promise<BrandItem[]> => {
  const response = await apiClient.get<BrandItem[]>('/restaurants/brands');
  return response.data;
};

export const createBrand = async (data: BrandCreate): Promise<BrandItem> => {
  const response = await apiClient.post<BrandItem>('/restaurants/brands', data);
  return response.data;
};

export const getRegions = async (): Promise<RegionItem[]> => {
  const response = await apiClient.get<RegionItem[]>('/restaurants/regions');
  return response.data;
};

export const createRegion = async (data: RegionCreate): Promise<RegionItem> => {
  const response = await apiClient.post<RegionItem>('/restaurants/regions', data);
  return response.data;
};

// ---- VNC & KDS Ping ----

export interface PingResult {
  status: string;
  results: Record<string, boolean>;
}

export const pingVnc = async (ipPrefix: string): Promise<PingResult> => {
  const response = await apiClient.get<PingResult>(`/restaurants/ping-vnc/${ipPrefix}`);
  return response.data;
};

export const pingKds = async (ipPrefix: string): Promise<PingResult> => {
  const response = await apiClient.get<PingResult>(`/restaurants/ping-kds/${ipPrefix}`);
  return response.data;
};

export const downloadScrcpyPackage = () => {
  const downloadUrl = '/api/v1/restaurants/download/scrcpy';
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'scrcpy.rar');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const downloadVncScrcpyReg = (vncPassword: string = '1234a@') => {
  const origin = window.location.origin;
  const pwd = vncPassword.trim() || '1234a@';
  const regContent =
    `Windows Registry Editor Version 5.00\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\vnc]\r\n` +
    `@="URL:VNC Connection"\r\n` +
    `"URL Protocol"=""\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\vnc\\shell]\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\vnc\\shell\\open]\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\vnc\\shell\\open\\command]\r\n` +
    `@="cmd /V:ON /c \\"set url=%1&&set url=!url:vnc://=!&&set url=!url:/=!&&start \\"\\" \\"C:\\\\Program Files\\\\TightVNC\\\\tvnviewer.exe\\" !url! -password=${pwd}\\""\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\scrcpy]\r\n` +
    `@="URL:scrcpy Connection"\r\n` +
    `"URL Protocol"=""\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\scrcpy\\shell]\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\scrcpy\\shell\\open]\r\n\r\n` +
    `[HKEY_CLASSES_ROOT\\scrcpy\\shell\\open\\command]\r\n` +
    `@="cmd /c \\"set KDS_URL=%1&&powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand JAB1ACAAPQAgACQAZQBuAHYAOgBLAEQAUwBfAFUAUgBMAAoAJABpAHAAIAA9ACAAKAAkAHUAIAAtAHIAZQBwAGwAYQBjAGUAIABbAHMAdAByAGkAbgBnAF0AWwBjAGgAYQByAF0AMwA0ACwAIAAnACcAIAAtAHIAZQBwAGwAYQBjAGUAIAAnAHMAYwByAGMAcAB5ADoALwAvACcALAAgACcAJwAgAC0AcgBlAHAAbABhAGMAZQAgACcALwAnACwAIAAnACcAKQAuAFQAcgBpAG0AKAApAAoAaQBmACAAKAAtAG4AbwB0ACAAKABUAGUAcwB0AC0AUABhAHQAaAAgACcAQwA6AFwAcwBjAHIAYwBwAHkAJwApACkAIAB7AAoAIAAgACAAIABXAHIAaQB0AGUALQBIAG8AcwB0ACAAJwBMAG8AaQA6ACAAVABoAHUAIABtAHUAYwAgAEMAOgBcAHMAYwByAGMAcAB5ACAAawBoAG8AbgBnACAAdABvAG4AIAB0AGEAaQAhACcAIAAtAEYAbwByAGUAZwByAG8AdQBuAGQAQwBvAGwAbwByACAAUgBlAGQACgAgACAAIAAgAFcAcgBpAHQAZQAtAEgAbwBzAHQAIAAnAFYAdQBpACAAbABvAG4AZwAgAGcAaQBhAGkAIABuAGUAbgAgAGIAbwAgAGMAYQBpACAAcwBjAHIAYwBwAHkAIAB2AGEAbwAgAHQAaAB1ACAAbQB1AGMAIABDADoAXABzAGMAcgBjAHAAeQAnAAoAIAAgACAAIABSAGUAYQBkAC0ASABvAHMAdAAgACcATgBoAGEAbgAgAEUAbgB0AGUAcgAgAGQAZQAgAGQAbwBuAGcALgAuAC4AJwAKACAAIAAgACAAZQB4AGkAdAAKAH0ACgBjAGQAIAAnAEMAOgBcAHMAYwByAGMAcAB5ACcACgAuAFwAYQBkAGIALgBlAHgAZQAgAGQAaQBzAGMAbwBuAG4AZQBjAHQAIAAiACQAewBpAHAAfQA6ADUANQA1ADUAIgAgADIAPgAkAG4AdQBsAGwAIAB8ACAATwB1AHQALQBOAHUAbABsAAoALgBcAGEAZABiAC4AZQB4AGUAIABjAG8AbgBuAGUAYwB0ACAAIgAkAHsAaQBwAH0AOgA1ADUANQA1ACIACgAuAFwAcwBjAHIAYwBwAHkALgBlAHgAZQAgAC0AcwAgACIAJAB7AGkAcAB9ADoANQA1ADUANQAiACAALQAtAHcAaQBuAGQAbwB3AC0AdABpAHQAbABlACAAIgBLAEQAUwAtACQAewBpAHAAfQAiAAoAaQBmACAAKAAkAEwAQQBTAFQARQBYAEkAVABDAE8ARABFACAALQBuAGUAIAAwACkAIAB7AAoAIAAgACAAIABSAGUAYQBkAC0ASABvAHMAdAAgACcATgBoAGEAbgAgAEUAbgB0AGUAcgAgAGQAZQAgAGQAbwBuAGcALgAuAC4AJwAKAH0A\\"\"\r\n\r\n` +
    `[HKEY_CURRENT_USER\\Software\\Policies\\Google\\Chrome]\r\n` +
    `"AutoLaunchProtocolsFromOrigins"="[{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"vnc\\"},{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"scrcpy\\"}]"\r\n\r\n` +
    `[HKEY_CURRENT_USER\\Software\\Policies\\Microsoft\\Edge]\r\n` +
    `"AutoLaunchProtocolsFromOrigins"="[{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"vnc\\"},{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"scrcpy\\"}]"\r\n\r\n` +
    `[HKEY_LOCAL_MACHINE\\Software\\Policies\\Google\\Chrome]\r\n` +
    `"AutoLaunchProtocolsFromOrigins"="[{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"vnc\\"},{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"scrcpy\\"}]"\r\n\r\n` +
    `[HKEY_LOCAL_MACHINE\\Software\\Policies\\Microsoft\\Edge]\r\n` +
    `"AutoLaunchProtocolsFromOrigins"="[{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"vnc\\"},{\\"allowed_origins\\":[\\"${origin}\\"],\\"protocol\\":\\"scrcpy\\"}]"\r\n`;

  const blob = new Blob([regContent], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'vnc_scrcpy_protocol.reg';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

export const getVncConfig = async (): Promise<{ default_password: string }> => {
  const response = await apiClient.get<{ default_password: string }>('/restaurants/vnc-config');
  return response.data;
};

export const updateVncConfig = async (password: string): Promise<{ default_password: string }> => {
  const response = await apiClient.post<{ default_password: string }>('/restaurants/vnc-config', { password });
  return response.data;
};

export const getRestaurantLogs = async (
  params: RestaurantAuditLogsParams = {}
): Promise<RestaurantAuditLogsResponse> => {
  const response = await apiClient.get<RestaurantAuditLogsResponse>('/restaurants/logs', {
    params,
  });
  return response.data;
};

export const exportRestaurantLogsExcel = async (
  params: RestaurantAuditLogsParams = {}
): Promise<Blob> => {
  const response = await apiClient.get('/restaurants/logs/export/excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

