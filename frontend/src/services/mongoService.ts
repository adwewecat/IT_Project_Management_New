import api from './api';

export interface MongoCandidateStatus {
  ip: string;
  port: number;
  status: 'OPEN' | 'CLOSED';
  message: string;
  is_kds?: boolean;
  kds_dish_count?: number;
  role_hint?: string;
}

export interface MongoConnectionCheckResponse {
  restaurant_id?: number;
  restaurant_name?: string;
  subnet: string;
  candidates: MongoCandidateStatus[];
  connected_ip?: string;
  connected_ips?: string[];
  is_connected: boolean;
  error_message?: string;
}

export interface AppParamItem {
  id?: string;
  paramCode: string;
  paramName?: string;
  paramType: 'FUNCTION' | 'CONFIG' | string;
  status: number; // 1: Bật, 0: Tắt
  value?: string;
  note?: string;
  checkTimeRange?: any;
}

export interface AppParamUpdateRequest {
  host: string;
  port?: number;
  paramName?: string;
  paramType: 'FUNCTION' | 'CONFIG';
  status: number;
  value?: string;
  note?: string;
}

export interface AppParamCreateRequest {
  host: string;
  port?: number;
  paramCode: string;
  paramName?: string;
  paramType: 'FUNCTION' | 'CONFIG';
  status: number;
  value?: string;
  note?: string;
}

export interface StandardAppParamItem {
  id?: number;
  param_code: string;
  param_name: string;
  param_type: 'FUNCTION' | 'CONFIG' | string;
  status: number; // 1: Bật, 0: Tắt
  param_value?: string;
  note?: string;
  category?: string;
  priority?: number;
  nguoi_tao?: string;
  nguoi_update?: string;
  ngay_tao?: string;
  ngay_update?: string;
}

export interface StandardAppParamCreateRequest {
  param_code: string;
  param_name: string;
  param_type: 'FUNCTION' | 'CONFIG';
  status: number;
  param_value?: string;
  note?: string;
  category?: string;
  priority?: number;
}

export interface StandardAppParamUpdateRequest {
  param_name?: string;
  param_type?: 'FUNCTION' | 'CONFIG';
  status?: number;
  param_value?: string;
  note?: string;
  category?: string;
  priority?: number;
}

export interface SaveStandardParamsFromRestaurantRequest {
  host: string;
  port?: number;
  selected_param_codes?: string[];
}

export interface ApplyStandardParamsToRestaurantRequest {
  host: string;
  port?: number;
  mode: 'overwrite' | 'skip_existing';
  selected_param_codes?: string[];
}

export interface ApplyStandardParamsResponse {
  success: boolean;
  message: string;
  inserted_count: number;
  overwritten_count: number;
  skipped_count: number;
  total_standard: number;
  restaurant_host: string;
}

export interface SaveSingleStandardParamRequest {
  param_code: string;
  param_name: string;
  param_type?: string;
  status: number;
  param_value?: string;
  note?: string;
  category?: string;
  priority?: number;
}

export interface BatchTargetRestaurantItem {
  name?: string;
  ip: string;
  port?: number;
  sap_code?: string;
  rk7_code?: string;
}

export interface BatchApplyParamsRequest {
  target_restaurants: BatchTargetRestaurantItem[];
  selected_param_codes?: string[];
  mode: 'upsert' | 'overwrite' | 'skip_existing' | string;
  custom_params?: Record<string, any>[];
}

export interface BatchApplyRestaurantResult {
  restaurant_name: string;
  ip: string;
  sap_code?: string;
  rk7_code?: string;
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  error?: string;
}

export interface BatchApplyParamsResponse {
  success: boolean;
  message: string;
  total_restaurants: number;
  success_count: number;
  failed_count: number;
  details: BatchApplyRestaurantResult[];
}

export interface ScheduledParamJobItem {
  id: number;
  job_title: string;
  run_date: string;
  run_time: string;
  mode: string;
  target_restaurants: BatchTargetRestaurantItem[];
  params_payload: Record<string, any>[];
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string;
  total_restaurants: number;
  success_count: number;
  failed_count: number;
  result_summary?: any;
  created_by?: string;
  created_at?: string;
  executed_at?: string;
}

export interface ScheduledParamJobCreateRequest {
  job_title: string;
  run_date: string;
  run_time: string;
  mode?: 'upsert' | 'overwrite' | 'skip_existing' | string;
  target_restaurants: BatchTargetRestaurantItem[];
  selected_param_codes?: string[];
  custom_params?: Record<string, any>[];
}

export interface MongoKitchenCollectionInfo {
  name: string;
  count: number;
}

export interface KitchenOverviewResponse {
  host: string;
  port: number;
  collections: MongoKitchenCollectionInfo[];
  total_collections: number;
}

export interface KitchenAccountGroup {
  account_id: string;
  account_name: string;
  acc_pass?: string;          // mật khẩu đăng nhập quầy bếp
  place_ids: number[];
  dish_count: number;
  role?: number;
  is_orphan?: boolean;
}

export interface KdsItemDish {
  menu_item_code: string;
  sap_code?: string;
  menu_item_name: string;
  single_cooking_time: number;
  cooking_time_display: string;
  group_type_kds?: string;
  place_ids?: number[];
  quays?: string[];
  printers?: string[];
  printer_display?: string;
  price_order?: number;
  price_show_hide?: number;
  price_out_of_dish?: number;
  final_price?: number;
  price_status: 'MATCH' | 'DIFF' | 'NO_PRICE' | string;
  note?: string;
}

export interface KdsItemsResponse {
  host: string;
  port: number;
  total: number;
  configured_time_count: number;
  diff_price_count: number;
  match_price_count: number;
  no_price_count: number;
  accounts_summary: KitchenAccountGroup[];
  kds_master_status?: number;
  kds_master_enabled?: boolean;
  items: KdsItemDish[];
}

export interface KdsCookingTimeUpdateRequest {
  host: string;
  port?: number;
  menu_item_code: string;
  single_cooking_time: number;
  sap_code?: string;
}

export interface KdsCookingTimeUpdateResponse {
  host: string;
  menu_item_code: string;
  single_cooking_time: number;
  cooking_time_display: string;
  message: string;
  modified_count: number;
}


export interface MasterDataSyncLogItem {
  id?: number;
  collection: string;
  date_timestamp?: number;
  date_formatted: string;
  time_ago?: string;
  log_mess: string;
  total_time_ms?: number;
  total_time_display: string;
  is_success: boolean;
}

export interface MasterDataSyncLogResponse {
  host: string;
  port: number;
  db_name: string;
  available_dbs: string[];
  total_records: number;
  returned_records: number;
  latest_sync_time?: string;
  latest_sync_status?: string;
  success_count: number;
  error_count: number;
  items: MasterDataSyncLogItem[];
}

export interface TableReportItem {
  restaurant_id: number;
  sap_code: string;
  restaurant_name: string;
  mongo_ip: string;
  total_tables: number;
  hall_name: string;
  hall_id?: number | null;
  tables_sample: string;
  table_names: string[];
  error?: string | null;
}

export interface TableReportResponse {
  total_restaurants: number;
  total_records: number;
  total_tables_sum: number;
  split_by_hall: boolean;
  items: TableReportItem[];
}

export interface MongoCollectionInfo {
  name: string;
  count: number;
  sample_fields: string[];
}

export interface MongoDbOverviewResponse {
  host: string;
  port: number;
  db_name: string;
  available_dbs: string[];
  collections: MongoCollectionInfo[];
  total_collections: number;
}

export interface MongoCollectionPreviewResponse {
  host: string;
  port: number;
  db_name: string;
  collection_name: string;
  total_count: number;
  documents: Record<string, any>[];
}

export interface LockedTableItem {
  order_id?: number | null;
  guid: string;
  table_name: string;
  status: number;
  status_desc: string;
  lock_order: boolean;
  locked?: string | null;
  is_lock: boolean;
  locked_by_user_code?: string | null;
  locked_by_user_name?: string | null;
  active_users: string[];
  open_time?: number | null;
  open_time_str?: string | null;
}

export interface RestaurantLockStatusResponse {
  restaurant_id?: number | null;
  sap_code: string;
  restaurant_name: string;
  mongo_ip: string;
  is_connected: boolean;
  password_exit_table?: string | null;
  role_unlock_order?: string | null;
  total_locked_tables: number;
  locked_orders_in_lock_order_col: number;
  locked_tables: LockedTableItem[];
  message?: string | null;
  date_filter?: string;
  filter_date_str?: string | null;
  overnight_hanging_count?: number;
  overnight_tables?: string[];
  orphan_locks_count?: number;
}

export interface ClearTableLockRequest {
  restaurant_id?: number | null;
  host?: string | null;
  port?: number;
  guid?: string | null;
  table_name?: string | null;
  reopen_pre_payment?: boolean;
  clean_orphan_locks?: boolean;
  action?: 'clear_locks' | 'clean_orphans_only';
}

export interface ClearTableLockResponse {
  success: boolean;
  message: string;
  deleted_from_lock_order: number;
  updated_orders: number;
  orphan_cleaned_count?: number;
  cleared_tables: string[];
  host: string;
}

export interface TabletUserItem {
  code: string;
  name: string;
  is_login: boolean;
  status: number;
  locked_tables: string[];
  lock_order_guids: string[];
}

export interface TabletUsersResponse {
  restaurant_id?: number | null;
  sap_code: string;
  restaurant_name: string;
  mongo_ip: string;
  is_connected: boolean;
  total_employees: number;
  total_logged_in: number;
  total_in_lock_order: number;
  users: TabletUserItem[];
  message?: string | null;
}

export interface UnlockTabletUserRequest {
  host?: string | null;
  port?: number;
  restaurant_id?: number | null;
  user_code?: string | null;
  user_name?: string | null;
  unlock_all?: boolean;
}

export interface UnlockTabletUserResponse {
  success: boolean;
  message: string;
  unlocked_user_codes: string[];
  cleared_lock_orders: number;
  updated_employees: number;
  host: string;
}

export interface VoucherItem {
  code: string;
  name?: string | null;
  discount_amount?: number;
  partner_name?: string | null;
  channel?: string | null;
  kind?: string | null;
  campaign_name?: string | null;
  source?: string | null;
}

export interface CustomerInfoItem {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  member_code?: string | null;
  card_number?: string | null;
  guest_count?: number | null;
  adult_count?: number | null;
  child_count?: number | null;
}

export interface PaymentInfoItem {
  is_paid: boolean;
  paid_time?: number | null;
  paid_time_str?: string | null;
  paid_amount: number;
  payment_method?: string | null;
  payment_code?: string | null;
  channel?: string | null;
  print_bill_from?: number | null;
  qr_payments: Record<string, any>[];
}

export interface VatInfoItem {
  has_vat_request: boolean;
  vat_status_desc: string;
  vat_amount: number;
  qr_vat_url?: string | null;
  qr_vat_desc?: string | null;
}

export interface ActionLogSessionItem {
  guid: string;
  table_name?: string | null;
  order_id?: number | null;
  status?: number | null;
  status_desc?: string | null;
  total_amount?: number;
  waiter_name?: string | null;
  customer_name?: string | null;
  payment_method?: string | null;
  paid_time_str?: string | null;
  take_tax?: boolean;
  has_voucher?: boolean;
  voucher_count?: number;
  first_time?: number | null;
  first_time_str?: string | null;
  last_time?: number | null;
  last_time_str?: string | null;
  action_count: number;
  apps: string[];
  users: string[];
  actions_summary: string[];
}

export interface ActionLogSessionsResponse {
  host: string;
  port: number;
  date: string;
  total_sessions: number;
  items: ActionLogSessionItem[];
}

export interface ActionLogRecordItem {
  id: string;
  time: number;
  time_str: string;
  action_name: string;
  app_code?: string | null;
  user_code?: string | null;
  total_time_ms?: number | null;
  req_data?: any;
  res_data?: any;
  guid?: string | null;
  source: string;
}

export interface ActionLogSessionDetailResponse {
  guid: string;
  order_info?: Record<string, any> | null;
  payment_info?: PaymentInfoItem | null;
  vat_info?: VatInfoItem | null;
  customer_info?: CustomerInfoItem | null;
  vouchers: VoucherItem[];
  total_discount: number;
  total_actions: number;
  actions: ActionLogRecordItem[];
}



export const mongoService = {
  checkConnection: async (restaurantId?: number, ip?: string | null): Promise<MongoConnectionCheckResponse> => {
    const res = await api.post<MongoConnectionCheckResponse>('/mongodb/check-connection', {
      restaurant_id: restaurantId,
      ip: ip || undefined
    });
    return res.data;
  },

  getAppParams: async (
    host: string,
    port: number = 27017,
    search?: string,
    paramType?: string,
    status?: number
  ): Promise<AppParamItem[]> => {
    const params: Record<string, any> = { host, port };
    if (search) params.search = search;
    if (paramType && paramType !== 'ALL') params.param_type = paramType;
    if (status !== undefined && status !== null && status !== -1) params.status = status;

    const res = await api.get<AppParamItem[]>('/mongodb/params', { params });
    return res.data;
  },

  updateAppParam: async (
    paramCode: string,
    payload: AppParamUpdateRequest
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.put<{ success: boolean; message: string }>(
      `/mongodb/params/${encodeURIComponent(paramCode)}`,
      payload
    );
    return res.data;
  },

  createAppParam: async (
    payload: AppParamCreateRequest
  ): Promise<{ success: boolean; message: string; id?: string }> => {
    const res = await api.post<{ success: boolean; message: string; id?: string }>(
      '/mongodb/params',
      payload
    );
    return res.data;
  },

  deleteAppParam: async (
    paramCode: string,
    host: string,
    port: number = 27017
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/mongodb/params/${encodeURIComponent(paramCode)}`,
      { params: { host, port } }
    );
    return res.data;
  },

  getStandardAppParams: async (
    search?: string,
    paramType?: string,
    status?: number
  ): Promise<StandardAppParamItem[]> => {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (paramType && paramType !== 'ALL') params.param_type = paramType;
    if (status !== undefined && status !== null && status !== -1) params.status = status;

    const res = await api.get<StandardAppParamItem[]>('/mongodb/standard-params', { params });
    return res.data;
  },

  createStandardAppParam: async (
    payload: StandardAppParamCreateRequest
  ): Promise<StandardAppParamItem> => {
    const res = await api.post<StandardAppParamItem>('/mongodb/standard-params', payload);
    return res.data;
  },

  updateStandardAppParam: async (
    paramCode: string,
    payload: StandardAppParamUpdateRequest
  ): Promise<StandardAppParamItem> => {
    const res = await api.put<StandardAppParamItem>(
      `/mongodb/standard-params/${encodeURIComponent(paramCode)}`,
      payload
    );
    return res.data;
  },

  deleteStandardAppParam: async (
    paramCode: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/mongodb/standard-params/${encodeURIComponent(paramCode)}`
    );
    return res.data;
  },

  saveStandardParamsFromRestaurant: async (
    payload: SaveStandardParamsFromRestaurantRequest
  ): Promise<{ success: boolean; message: string; inserted_count: number; updated_count: number; total_count: number }> => {
    const res = await api.post<{ success: boolean; message: string; inserted_count: number; updated_count: number; total_count: number }>(
      '/mongodb/standard-params/save-from-restaurant',
      payload
    );
    return res.data;
  },

  applyStandardParamsToRestaurant: async (
    payload: ApplyStandardParamsToRestaurantRequest
  ): Promise<ApplyStandardParamsResponse> => {
    const res = await api.post<ApplyStandardParamsResponse>(
      '/mongodb/standard-params/apply-to-restaurant',
      payload
    );
    return res.data;
  },

  saveSingleStandardParam: async (
    payload: SaveSingleStandardParamRequest
  ): Promise<StandardAppParamItem> => {
    const res = await api.post<StandardAppParamItem>(
      '/mongodb/standard-params/save-single',
      payload
    );
    return res.data;
  },

  batchApplyParams: async (
    payload: BatchApplyParamsRequest
  ): Promise<BatchApplyParamsResponse> => {
    const res = await api.post<BatchApplyParamsResponse>(
      '/mongodb/batch-apply-params',
      payload
    );
    return res.data;
  },

  getScheduledParamJobs: async (
    status?: string
  ): Promise<ScheduledParamJobItem[]> => {
    const params: Record<string, any> = {};
    if (status && status !== 'ALL') params.status = status;
    const res = await api.get<ScheduledParamJobItem[]>('/mongodb/scheduled-param-jobs', { params });
    return res.data;
  },

  createScheduledParamJob: async (
    payload: ScheduledParamJobCreateRequest
  ): Promise<ScheduledParamJobItem> => {
    const res = await api.post<ScheduledParamJobItem>(
      '/mongodb/scheduled-param-jobs',
      payload
    );
    return res.data;
  },

  deleteScheduledParamJob: async (
    jobId: number
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/mongodb/scheduled-param-jobs/${jobId}`
    );
    return res.data;
  },

  runScheduledParamJobNow: async (
    jobId: number
  ): Promise<ScheduledParamJobItem> => {
    const res = await api.post<ScheduledParamJobItem>(
      `/mongodb/scheduled-param-jobs/${jobId}/run-now`
    );
    return res.data;
  },

  getKitchenOverview: async (
    host: string,
    port: number = 27017
  ): Promise<KitchenOverviewResponse> => {
    const res = await api.get<KitchenOverviewResponse>('/mongodb/kitchen-overview', {
      params: { host, port }
    });
    return res.data;
  },

  getKdsItems: async (
    host: string,
    port: number = 27017,
    search?: string,
    priceStatus?: string,
    groupKds?: string,
    quay?: string
  ): Promise<KdsItemsResponse> => {
    const params: Record<string, any> = { host, port };
    if (search) params.search = search;
    if (priceStatus && priceStatus !== 'ALL') params.price_status = priceStatus;
    if (groupKds && groupKds !== 'ALL') params.group_kds = groupKds;
    if (quay && quay !== 'ALL') params.quay = quay;

    const res = await api.get<KdsItemsResponse>('/mongodb/kds-items', { params });
    return res.data;
  },

  updateKdsCookingTime: async (payload: KdsCookingTimeUpdateRequest): Promise<KdsCookingTimeUpdateResponse> => {
    const res = await api.post<KdsCookingTimeUpdateResponse>('/mongodb/kds-items/cooking-time', {
      port: 27017,
      ...payload,
    });
    return res.data;
  },


  getMasterDataSyncLogs: async (
    host: string,
    port: number = 27017,
    dbName: string = 'G_ORDER',
    search?: string,
    fromDate?: string,
    toDate?: string,
    limit: number = 200
  ): Promise<MasterDataSyncLogResponse> => {
    const params: Record<string, any> = { host, port, db_name: dbName, limit };
    if (search) params.search = search;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    const res = await api.get<MasterDataSyncLogResponse>('/mongodb/master-data-sync-logs', { params });
    return res.data;
  },

  getTableReport: async (params: {
    restaurant_id?: number;
    host?: string;
    split_by_hall?: boolean;
    search?: string;
  }): Promise<TableReportResponse> => {
    const res = await api.get<TableReportResponse>('/mongodb/table-report', {
      params,
      timeout: 120000 // 2 phút cho quét all
    });
    return res.data;
  },

  getDatabaseOverview: async (
    host: string,
    port: number = 27017,
    dbName: string = 'G_ORDER'
  ): Promise<MongoDbOverviewResponse> => {
    const res = await api.get<MongoDbOverviewResponse>('/mongodb/database-overview', {
      params: { host, port, db_name: dbName }
    });
    return res.data;
  },

  getCollectionPreview: async (
    host: string,
    port: number = 27017,
    dbName: string = 'G_ORDER',
    collectionName: string = 'TABLE',
    limit: number = 20
  ): Promise<MongoCollectionPreviewResponse> => {
    const res = await api.get<MongoCollectionPreviewResponse>('/mongodb/collection-preview', {
      params: { host, port, db_name: dbName, collection_name: collectionName, limit }
    });
    return res.data;
  },
  
  getLockedTables: async (
    host: string,
    port: number = 27017,
    restaurantId?: number,
    dateScope: string = 'today',
    includeOvernight: boolean = false,
    customDate?: string
  ): Promise<RestaurantLockStatusResponse> => {
    const params: Record<string, any> = {
      host,
      port,
      restaurant_id: restaurantId,
      date_scope: dateScope,
      include_overnight: includeOvernight
    };
    if (customDate) params.custom_date = customDate;
    const res = await api.get<RestaurantLockStatusResponse>('/mongodb/locked-tables', { params });
    return res.data;
  },

  clearTableLocks: async (payload: ClearTableLockRequest): Promise<ClearTableLockResponse> => {
    const res = await api.post<ClearTableLockResponse>('/mongodb/clear-table-locks', payload);
    return res.data;
  },

  getActionLogSessions: async (
    host: string,
    port: number = 27017,
    date?: string,
    search?: string,
    limit: number = 100
  ): Promise<ActionLogSessionsResponse> => {
    const params: Record<string, any> = { host, port, limit };
    if (date) params.date = date;
    if (search) params.search = search;
    const res = await api.get<ActionLogSessionsResponse>('/mongodb/action-log-sessions', { params });
    return res.data;
  },

  getActionLogSessionDetail: async (
    host: string,
    port: number = 27017,
    guid: string = ''
  ): Promise<ActionLogSessionDetailResponse> => {
    const res = await api.get<ActionLogSessionDetailResponse>('/mongodb/action-log-details', {
      params: { host, port, guid }
    });
    return res.data;
  },

  getTabletUsers: async (
    host: string,
    port: number = 27017,
    restaurantId?: number,
    search?: string,
    onlyLoggedIn: boolean = true
  ): Promise<TabletUsersResponse> => {
    const params: Record<string, any> = {
      host,
      port,
      restaurant_id: restaurantId,
      only_logged_in: onlyLoggedIn
    };
    if (search) params.search = search;
    const res = await api.get<TabletUsersResponse>('/mongodb/tablet-users', { params });
    return res.data;
  },

  unlockTabletUser: async (payload: UnlockTabletUserRequest): Promise<UnlockTabletUserResponse> => {
    const res = await api.post<UnlockTabletUserResponse>('/mongodb/unlock-tablet-user', payload);
    return res.data;
  },

  getRestaurantGposInfo: async (
    host: string,
    port: number = 27017,
    restaurantId?: number
  ): Promise<RestaurantGposInfoResponse> => {
    const res = await api.get<RestaurantGposInfoResponse>('/mongodb/restaurant-info', {
      params: { host, port, restaurant_id: restaurantId }
    });
    return res.data;
  },

  getDishShowHide: async (
    host: string,
    port: number = 27017,
    search?: string
  ): Promise<DishShowHideListResponse> => {
    const res = await api.get<DishShowHideListResponse>('/mongodb/dish-show-hide', {
      params: { host, port, search: search || undefined }
    });
    return res.data;
  },

  saveDishShowHide: async (
    payload: DishShowHideSaveRequest
  ): Promise<DishShowHideSaveResponse> => {
    const res = await api.post<DishShowHideSaveResponse>('/mongodb/dish-show-hide', payload);
    return res.data;
  },

  getMenuShowHide: async (
    host: string,
    port: number = 27017
  ): Promise<MenuShowHideListResponse> => {
    const res = await api.get<MenuShowHideListResponse>('/mongodb/menu-show-hide', {
      params: { host, port }
    });
    return res.data;
  },

  saveMenuShowHide: async (
    payload: MenuShowHideSaveRequest
  ): Promise<MenuShowHideSaveResponse> => {
    const res = await api.post<MenuShowHideSaveResponse>('/mongodb/menu-show-hide', payload);
    return res.data;
  },

  getKdsPlaces: async (
    host: string,
    port: number = 27017
  ): Promise<KdsPlaceListResponse> => {
    const res = await api.get<KdsPlaceListResponse>('/mongodb/kds-places', {
      params: { host, port }
    });
    return res.data;
  },

  createKdsPlace: async (
    payload: KdsPlaceCreateRequest
  ): Promise<KdsPlaceCreateResponse> => {
    const res = await api.post<KdsPlaceCreateResponse>('/mongodb/kds-places', payload);
    return res.data;
  },

  createKdsFoodControl: async (
    payload: KdsCreateFoodControlRequest
  ): Promise<KdsCreateFoodControlResponse> => {
    const res = await api.post<KdsCreateFoodControlResponse>('/mongodb/kds-create-food-control', payload);
    return res.data;
  },

  lookupDishForKds: async (
    host: string,
    code: string,
    port: number = 27017
  ): Promise<KdsDishLookupResponse> => {
    const res = await api.get<KdsDishLookupResponse>('/mongodb/kds-dishes/lookup', {
      params: { host, code, port }
    });
    return res.data;
  },

  addDishesToKds: async (
    payload: KdsAddDishesRequest
  ): Promise<KdsAddDishesResponse> => {
    const res = await api.post<KdsAddDishesResponse>('/mongodb/kds-dishes/add', payload);
    return res.data;
  },

  assignDishesToQuay: async (
    payload: KdsAssignDishQuayRequest
  ): Promise<KdsAssignDishQuayResponse> => {
    const res = await api.post<KdsAssignDishQuayResponse>('/mongodb/kds-dishes/assign-quay', payload);
    return res.data;
  },

  transferKdsDishesQuay: async (
    payload: KdsTransferQuayRequest
  ): Promise<KdsTransferQuayResponse> => {
    const res = await api.post<KdsTransferQuayResponse>('/mongodb/kds-dishes/transfer-quay', payload);
    return res.data;
  },

  syncKdsGroupsByQuays: async (
    host: string,
    port: number = 27017
  ): Promise<KdsSyncGroupsByQuaysResponse> => {
    const res = await api.post<KdsSyncGroupsByQuaysResponse>(
      '/mongodb/kds-sync-groups-by-quays',
      { host, port }
    );
    return res.data;
  },

  updateKdsDishGroup: async (
    host: string,
    menuItemCodes: string[],
    newGroupName: string,
    port: number = 27017
  ): Promise<KdsUpdateDishGroupResponse> => {
    const res = await api.post<KdsUpdateDishGroupResponse>(
      '/mongodb/kds-dishes/update-group',
      { host, port, menu_item_codes: menuItemCodes, new_group_name: newGroupName }
    );
    return res.data;
  },

  deleteKdsCookingConfig: async (
    host: string,
    menuItemCodes: string[],
    port: number = 27017
  ): Promise<KdsDeleteCookingConfigResponse> => {
    const res = await api.post<KdsDeleteCookingConfigResponse>(
      '/mongodb/kds-dishes/delete-config',
      { host, port, menu_item_codes: menuItemCodes }
    );
    return res.data;
  },

  getKdsLogs: async (
    payload: KdsLogQueryRequest
  ): Promise<KdsLogQueryResponse> => {
    const res = await api.post<KdsLogQueryResponse>('/mongodb/kds-logs', payload);
    return res.data;
  },

  analyzeKdsKitchenIntake: async (
    payload: KdsKitchenIntakeAnalysisRequest
  ): Promise<KdsKitchenIntakeAnalysisResponse> => {
    const res = await api.post<KdsKitchenIntakeAnalysisResponse>('/mongodb/kds-analyze-intake', payload);
    return res.data;
  },

  getKdsDishHistory: async (
    payload: KdsDishHistoryRequest
  ): Promise<KdsDishHistoryResponse> => {
    const res = await api.post<KdsDishHistoryResponse>('/mongodb/kds-dish-history', payload);
    return res.data;
  },

  updateKdsPlacePrinter: async (
    payload: KdsUpdatePlacePrinterRequest
  ): Promise<KdsUpdatePlacePrinterResponse> => {
    const res = await api.put<KdsUpdatePlacePrinterResponse>('/mongodb/kds-places/printer', payload);
    return res.data;
  },

  renameKdsPlace: async (
    payload: KdsRenamePlaceRequest
  ): Promise<KdsRenamePlaceResponse> => {
    const res = await api.put<KdsRenamePlaceResponse>(`/mongodb/kds-places/${payload.place_id}/rename`, payload);
    return res.data;
  },

  deleteKdsPlace: async (
    host: string,
    placeId: number,
    port: number = 27017
  ): Promise<KdsPlaceDeleteResponse> => {
    const res = await api.delete<KdsPlaceDeleteResponse>(`/mongodb/kds-places/${placeId}`, {
      params: { host, port }
    });
    return res.data;
  },

  toggleKdsFoodControl: async (
    host: string,
    placeId: number,
    action: string,
    port: number = 27017,
    targetRole?: number
  ): Promise<KdsToggleFoodControlResponse> => {
    const res = await api.put<KdsToggleFoodControlResponse>(
      `/mongodb/kds-places/${placeId}/toggle-food-control`,
      { host, port, place_id: placeId, action, target_role: targetRole }
    );
    return res.data;
  },

  getKdsRoleUsers: async (host: string, port: number = 27017, restaurantCode?: string, search?: string, paramCode: string = 'ROLE_SETUP_CONFIG_COOKING'): Promise<KdsRoleUsersResponse> => {
    const res = await api.get<KdsRoleUsersResponse>('/mongodb/kds-role-users', {
      params: { host, port, restaurant_code: restaurantCode, search, param_code: paramCode }
    });
    return res.data;
  },

  addKdsRoleUser: async (host: string, userCode: string, port: number = 27017, paramCode: string = 'ROLE_SETUP_CONFIG_COOKING'): Promise<KdsRoleUsersResponse> => {
    const res = await api.post<KdsRoleUsersResponse>('/mongodb/kds-role-users', {
      host,
      port,
      user_code: userCode,
      param_code: paramCode
    });
    return res.data;
  },

  removeKdsRoleUser: async (host: string, userCode: string, port: number = 27017, paramCode: string = 'ROLE_SETUP_CONFIG_COOKING'): Promise<KdsRoleUsersResponse> => {
    const res = await api.delete<KdsRoleUsersResponse>(`/mongodb/kds-role-users/${encodeURIComponent(userCode)}`, {
      params: { host, port, param_code: paramCode }
    });
    return res.data;
  },

  toggleKdsRoleStatus: async (host: string, status: number, port: number = 27017, paramCode: string = 'ROLE_SETUP_CONFIG_COOKING'): Promise<KdsRoleUsersResponse> => {
    const res = await api.put<KdsRoleUsersResponse>('/mongodb/kds-role-users/toggle-status', {
      host,
      port,
      status,
      param_code: paramCode
    });
    return res.data;
  },

  getKdsMasterStatus: async (host: string, port: number = 27017): Promise<KdsMasterStatusResponse> => {
    const res = await api.get<KdsMasterStatusResponse>('/mongodb/kds-master-status', {
      params: { host, port }
    });
    return res.data;
  },

  toggleKdsMasterStatus: async (host: string, status: number, port: number = 27017): Promise<KdsMasterStatusResponse> => {
    const res = await api.put<KdsMasterStatusResponse>('/mongodb/kds-master-status/toggle', {
      host,
      port,
      status
    });
    return res.data;
  },

  toggleAllowHideItemGroup: async (host: string, status: number, port: number = 27017): Promise<KdsRoleUsersResponse> => {
    const res = await api.put<KdsRoleUsersResponse>('/mongodb/kds/allow-hide-item-group/toggle', {
      host,
      port,
      status
    });
    return res.data;
  },

  addKdsRoleUsersBatch: async (host: string, userCodes: string[], port: number = 27017, paramCode: string = 'ROLE_SETUP_CONFIG_COOKING'): Promise<KdsRoleUsersResponse> => {
    const res = await api.post<KdsRoleUsersResponse>('/mongodb/kds-role-users', {
      host,
      port,
      user_codes: userCodes,
      param_code: paramCode
    });
    return res.data;
  },

  removeKdsRoleUsersBatch: async (host: string, userCodes: string[], port: number = 27017, paramCode: string = 'ROLE_SETUP_CONFIG_COOKING'): Promise<KdsRoleUsersResponse> => {
    let lastRes: any = null;
    for (const uc of userCodes) {
      lastRes = await api.delete<KdsRoleUsersResponse>(`/mongodb/kds-role-users/${encodeURIComponent(uc)}`, {
        params: { host, port, param_code: paramCode }
      });
    }
    return lastRes?.data;
  },

  executeBatchRoleUserAction: async (payload: BatchRoleUserActionRequest): Promise<BatchRoleUserActionResponse> => {
    const res = await api.post<BatchRoleUserActionResponse>('/mongodb/batch-role-user-action', payload);
    return res.data;
  },

  getFixCpuConfig: async (): Promise<MongoFixCpuConfigResponse> => {
    const res = await api.get<MongoFixCpuConfigResponse>('/mongodb/fix-cpu/config');
    return res.data;
  },

  saveFixCpuConfig: async (defaultEmail: string): Promise<MongoFixCpuConfigResponse> => {
    const res = await api.post<MongoFixCpuConfigResponse>('/mongodb/fix-cpu/config', { default_email: defaultEmail });
    return res.data;
  },

  executeFixCpu: async (payload: MongoFixCpuRequest): Promise<MongoFixCpuResponse> => {
    const res = await api.post<MongoFixCpuResponse>('/mongodb/fix-cpu/execute', payload, {
      timeout: 300000 // 5 phút cho quét hàng loạt
    });
    return res.data;
  },

  scanTransferMachines: async (payload: MongoScanMachinesRequest): Promise<MongoScanMachinesResponse> => {
    const res = await api.post<MongoScanMachinesResponse>('/mongodb/transfer/scan-machines', payload);
    return res.data;
  },

  inspectTransferPair: async (payload: MongoInspectPairRequest): Promise<MongoInspectPairResponse> => {
    const res = await api.post<MongoInspectPairResponse>('/mongodb/transfer/inspect-pair', payload);
    return res.data;
  },

  executeTransferDatabases: async (payload: MongoTransferExecuteRequest): Promise<MongoTransferExecuteResponse> => {
    const res = await api.post<MongoTransferExecuteResponse>('/mongodb/transfer/execute', payload, {
      timeout: 300000 // 5 phút
    });
    return res.data;
  },

  getTransferSettings: async (): Promise<MongoTransferSettingsResponse> => {
    const res = await api.get<MongoTransferSettingsResponse>('/mongodb/transfer/settings');
    return res.data;
  },

  saveTransferSettings: async (defaultTails: string[]): Promise<MongoTransferSettingsResponse> => {
    const res = await api.post<MongoTransferSettingsResponse>('/mongodb/transfer/settings', {
      default_tails: defaultTails
    });
    return res.data;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TÁC VỤ 3: MENU SO / CO MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════
  getMenuSoCoCategories: async (host: string, port: number = 27017): Promise<MenuCategoriesResponse> => {
    const res = await api.get<MenuCategoriesResponse>('/mongodb/menu-so-co/menus', {
      params: { host, port }
    });
    return res.data;
  },

  lookupDishInfo: async (host: string, rk7Code: string, port: number = 27017): Promise<DishLookupResponse> => {
    const res = await api.get<DishLookupResponse>('/mongodb/menu-so-co/lookup-dish', {
      params: { host, rk7_code: rk7Code, port }
    });
    return res.data;
  },

  loadMenuSoCoItems: async (payload: LoadMenuItemsRequest): Promise<LoadMenuItemsResponse> => {
    const res = await api.post<LoadMenuItemsResponse>('/mongodb/menu-so-co/load-items', payload);
    return res.data;
  },

  checkMenuSoCoConflicts: async (payload: LoadMenuItemsRequest): Promise<CheckConflictsResponse> => {
    const res = await api.post<CheckConflictsResponse>('/mongodb/menu-so-co/check-conflicts', payload);
    return res.data;
  },

  resolveMenuSoCoConflict: async (payload: ResolveConflictRequest): Promise<ResolveConflictResponse> => {
    const res = await api.post<ResolveConflictResponse>('/mongodb/menu-so-co/resolve-conflict', payload);
    return res.data;
  },

  activateDishesToCo: async (payload: ActivateCoRequest): Promise<ActivateCoResponse> => {
    const res = await api.post<ActivateCoResponse>('/mongodb/menu-so-co/activate-co', payload);
    return res.data;
  },

  deactivateDishesFromCo: async (payload: DeactivateCoRequest): Promise<DeactivateCoResponse> => {
    const res = await api.post<DeactivateCoResponse>('/mongodb/menu-so-co/deactivate-co', payload);
    return res.data;
  },

  toggleGroupCo: async (payload: ToggleGroupCoRequest): Promise<ToggleGroupCoResponse> => {
    const res = await api.post<ToggleGroupCoResponse>('/mongodb/menu-so-co/toggle-group-co', payload);
    return res.data;
  },

  getMenuGroupsCo: async (params: { host: string; menu_code: string; port?: number; file2_path?: string }): Promise<MenuGroupsCoDetailResponse> => {
    const res = await api.get<MenuGroupsCoDetailResponse>('/mongodb/menu-so-co/menu-groups-co', { params });
    return res.data;
  },

  bulkSyncMenuGroupsCo: async (payload: BulkSyncMenuGroupsCoRequest): Promise<BulkSyncMenuGroupsCoResponse> => {
    const res = await api.post<BulkSyncMenuGroupsCoResponse>('/mongodb/menu-so-co/sync-menu-groups-co', payload);
    return res.data;
  },

  getFile2Summary: async (params?: { file_path?: string }): Promise<ReadFile2Response> => {
    const res = await api.get<ReadFile2Response>('/mongodb/menu-so-co/file2-summary', { params });
    return res.data;
  },

  getExportFile2Url: (host: string, port: number = 27017): string => {
    return `${api.defaults.baseURL || '/api/v1'}/mongodb/menu-so-co/export-file2?host=${encodeURIComponent(host)}&port=${port}`;
  },

  bulkAddMenuDishes: async (payload: BulkAddDishesRequest): Promise<BulkAddDishesResponse> => {
    const res = await api.post<BulkAddDishesResponse>('/mongodb/menu-so-co/bulk-add', payload);
    return res.data;
  },

  updateMenuDishItem: async (payload: UpdateDishItemRequest): Promise<UpdateDishItemResponse> => {
    const res = await api.put<UpdateDishItemResponse>('/mongodb/menu-so-co/update-item', payload);
    return res.data;
  },

  deleteMenuDishItems: async (payload: DeleteDishesRequest): Promise<DeleteDishesResponse> => {
    const res = await api.post<DeleteDishesResponse>('/mongodb/menu-so-co/delete-items', payload);
    return res.data;
  },

  moveOrCloneMenuDishItems: async (payload: MoveCloneDishesRequest): Promise<MoveCloneDishesResponse> => {
    const res = await api.post<MoveCloneDishesResponse>('/mongodb/menu-so-co/move-clone-items', payload);
    return res.data;
  },

  syncAllSoCo: async (host: string, port: number = 27017, restaurant_code?: string): Promise<SyncAllSoCoResponse> => {
    const res = await api.post<SyncAllSoCoResponse>('/mongodb/menu-so-co/sync-all', {
      host,
      port,
      restaurant_code
    });
    return res.data;
  },

  saveMenuSnapshot: async (payload: SaveMenuSnapshotRequest): Promise<SaveMenuSnapshotResponse> => {
    const res = await api.post<SaveMenuSnapshotResponse>('/mongodb/menu-so-co/snapshots/save', payload);
    return res.data;
  },

  listMenuSnapshots: async (): Promise<MenuSnapshotItem[]> => {
    const res = await api.get<MenuSnapshotItem[]>('/mongodb/menu-so-co/snapshots');
    return res.data;
  },

  getMenuSnapshotDetail: async (snapshotId: string): Promise<MenuSnapshotDetail> => {
    const res = await api.get<MenuSnapshotDetail>(`/mongodb/menu-so-co/snapshots/${snapshotId}`);
    return res.data;
  },

  deleteMenuSnapshot: async (snapshotId: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/mongodb/menu-so-co/snapshots/${snapshotId}`);
    return res.data;
  },

  deployMenuSnapshot: async (snapshotId: string, payload: DeployMenuSnapshotRequest): Promise<DeployMenuSnapshotResponse> => {
    const res = await api.post<DeployMenuSnapshotResponse>(`/mongodb/menu-so-co/snapshots/${snapshotId}/deploy`, payload);
    return res.data;
  },

  directSyncMenu: async (payload: DirectSyncMenuRequest): Promise<DirectSyncMenuResponse> => {
    const res = await api.post<DirectSyncMenuResponse>('/mongodb/menu-so-co/sync-to-restaurant', payload);
    return res.data;
  },

  checkSingleDishImage: async (payload: {
    raw_path: string;
    dish_name?: string;
    rk7_code?: string;
    sap_code?: string;
  }): Promise<CheckDishImageResult> => {
    const res = await api.post<CheckDishImageResult>('/mongodb/image-server/check-dish', payload);
    return res.data;
  },

  checkMenuDishImages: async (payload: {
    host: string;
    port?: number;
    menu_code: string;
    force_refresh?: boolean;
    dishes?: any[];
  }): Promise<CheckMenuImagesResponse> => {
    const res = await api.post<CheckMenuImagesResponse>('/mongodb/image-server/check-menu', payload);
    return res.data;
  },

  syncDishImagesToMongo: async (payload: SyncDishImagesRequest): Promise<SyncDishImagesResponse> => {
    const res = await api.post<SyncDishImagesResponse>('/mongodb/image-server/sync-images', payload);
    return res.data;
  },

  getImageServerConfig: async (): Promise<ImageServerConfig> => {
    const res = await api.get<ImageServerConfig>('/mongodb/image-server/config');
    return res.data;
  },

  saveImageServerConfig: async (payload: UpdateImageServerConfigRequest): Promise<ImageServerConfig> => {
    const res = await api.post<ImageServerConfig>('/mongodb/image-server/config', payload);
    return res.data;
  },

  testImageServerConnection: async (payload: TestImageServerConnectionRequest): Promise<TestImageServerConnectionResponse> => {
    const res = await api.post<TestImageServerConnectionResponse>('/mongodb/image-server/test-connection', payload);
    return res.data;
  },

  exportMismatchedDishesExcel: async (payload: {
    host: string;
    port?: number;
    menu_code: string;
    menu_name?: string;
    restaurant_name?: string;
    force_refresh?: boolean;
  }): Promise<{ blob: Blob; filename: string; mismatchedCount: number }> => {
    const res = await api.post('/mongodb/image-server/export-mismatches', payload, {
      responseType: 'blob'
    });
    const disposition = (res.headers && (res.headers['content-disposition'] || res.headers['Content-Disposition'])) || '';
    let filename = `Mon_Sai_Link_Anh_Menu_${payload.menu_code}.xlsx`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '').trim();
      }
    }
    const countHeader = (res.headers && (res.headers['x-mismatched-count'] || res.headers['X-Mismatched-Count'])) || '0';
    const mismatchedCount = parseInt(countHeader, 10) || 0;
    return { blob: res.data, filename, mismatchedCount };
  }
};

export interface ImageServerConfig {
  server_type: 'SSH_SFTP' | 'FTP';
  host: string;
  port: number;
  username: string;
  password?: string;
  remote_dir: string;
  standard_prefix: string;
  is_privileged: boolean;
  can_edit: boolean;
  updated_at?: string;
  updated_by?: string;
}

export interface UpdateImageServerConfigRequest {
  server_type?: 'SSH_SFTP' | 'FTP';
  host: string;
  port: number;
  username: string;
  password?: string;
  remote_dir: string;
  standard_prefix: string;
}

export interface TestImageServerConnectionRequest {
  server_type?: 'SSH_SFTP' | 'FTP';
  host: string;
  port: number;
  username: string;
  password?: string;
  remote_dir: string;
}

export interface TestImageServerConnectionResponse {
  success: boolean;
  total_files: number;
  message: string;
  latency_ms?: number;
}

export interface RestaurantGposInfoResponse {
  restaurant_name: string;
  rk7_code: string;
  sap_code: string;
  gpos_version_co_so: string;
  gpos_version_kds: string;
  menu_version_co?: string;
  menu_version_so?: string;
  is_connected: boolean;
  host: string;
  message?: string;
}

export interface DishShowHideItem {
  item_code: string;
  name: string;
  price: number;
  sap_code?: string;
  show_in_co: boolean;
  show_in_so: boolean;
  show_in_qr_order: boolean;
  is_hidden: boolean;
}

export interface DishShowHideListResponse {
  host: string;
  port: number;
  total_all: number;
  total_visible: number;
  total_hidden: number;
  visible_dishes: DishShowHideItem[];
  hidden_dishes: DishShowHideItem[];
}

export interface DishShowHideSaveAction {
  item_code: string;
  name: string;
  price: number;
  sap_code?: string;
  is_hidden: boolean;
  show_in_co: boolean;
  show_in_so: boolean;
  show_in_qr_order: boolean;
}

export interface DishShowHideSaveRequest {
  host: string;
  port?: number;
  restaurant_id?: number;
  dishes: DishShowHideSaveAction[];
}

export interface DishShowHideSaveResponse {
  success: boolean;
  message: string;
  updated_count: number;
}

export interface MenuShowHideItem {
  id: number;
  code: string;
  name: string;
  subtitle?: string;
  sap_code?: string;
  rk7_code?: string;
  show_in_co: boolean;
  show_in_so: boolean;
  show_in_qr_order: boolean;
  auto_delivery_in_so: boolean;
}

export interface MenuShowHideListResponse {
  host: string;
  port: number;
  total: number;
  total_auto_kds: number;
  total_manual_kds: number;
  menus: MenuShowHideItem[];
}

export interface MenuShowHideSaveItem {
  id: number;
  code: string;
  show_in_co: boolean;
  show_in_so: boolean;
  show_in_qr_order: boolean;
  auto_delivery_in_so: boolean;
}

export interface MenuShowHideSaveRequest {
  host: string;
  port?: number;
  restaurant_id?: number;
  menus: MenuShowHideSaveItem[];
}

export interface MenuShowHideSaveResponse {
  success: boolean;
  message: string;
  updated_count: number;
}

export interface KdsPlaceItem {
  id: number;
  name: string;
  place_code: string;
  printer: string;
  driver_name?: string;
  type: string;
  hall_plan_ids: number[];
  account_names: string[];
  dish_count: number;
  is_in_food_control?: boolean;
  is_orphan?: boolean;
  role?: number;
  role_desc?: string;
  print_on_done?: boolean;
  account_id?: string;
}

export interface KdsToggleFoodControlResponse {
  success: boolean;
  place_id: number;
  place_name: string;
  is_in_food_control: boolean;
  role?: number;
  print_on_done?: boolean;
  message: string;
}

export interface KdsRoleUserItem {
  user_code: string;
  employee_id?: number;
  employee_name?: string;
  status?: number;
  status_desc?: string;
  is_in_role?: boolean;
}

export interface KdsRoleUsersResponse {
  param_code: string;
  param_name?: string;
  param_type?: string;
  status: number;
  is_enabled: boolean;
  raw_value: string;
  total_users: number;
  note?: string;
  show_kds_status?: number;
  show_kds_enabled?: boolean;
  allow_hide_item_group_status?: number;
  allow_hide_item_group_enabled?: boolean;
  allow_hide_item_group_value?: string;
  restaurant_users: KdsRoleUserItem[];
  authorized_users?: KdsRoleUserItem[];
  available_employees?: KdsRoleUserItem[];
}

export interface BatchRoleUserActionRequest {
  restaurant_ids: number[];
  param_code?: string;
  status_action: 'ENABLE' | 'DISABLE' | 'KEEP';
  user_action: 'NONE' | 'APPEND' | 'REPLACE' | 'REMOVE';
  user_codes?: string[];
}

export interface BatchRoleUserRestaurantResult {
  restaurant_id: number;
  restaurant_sap?: string;
  restaurant_name?: string;
  host?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  message: string;
  old_status?: number;
  new_status?: number;
  old_users_count?: number;
  new_users_count?: number;
  raw_value?: string;
}

export interface BatchRoleUserActionResponse {
  total_requested: number;
  total_processed: number;
  success_count: number;
  failed_count: number;
  param_code: string;
  status_action: string;
  user_action: string;
  items: BatchRoleUserRestaurantResult[];
}

export interface KdsMasterStatusResponse {
  host: string;
  port: number;
  param_code: string;
  param_name?: string;
  param_type?: string;
  status: number;
  value: string;
  is_enabled: boolean;
  note?: string;
  message?: string;
}

export interface KdsPlaceDeleteResponse {
  success: boolean;
  place_id: number;
  place_name: string;
  deleted_account: boolean;
  dishes_cleared_count: number;
  message: string;
}

export interface KdsPlaceListResponse {
  host: string;
  port: number;
  places: KdsPlaceItem[];
  printers: string[];
}

export interface KdsPlaceCreateRequest {
  host: string;
  port?: number;
  place_name: string;
  place_code?: string;
  group_kds?: string;
  printer: string;
  account_name?: string;
  account_id?: string;
  password?: string;
}

export interface KdsPlaceCreateResponse {
  success: boolean;
  place_id: number;
  place_name: string;
  place_code: string;
  printer: string;
  account_name: string;
  account_id: string;
  message: string;
}

export interface KdsSyncGroupsByQuaysResponse {
  success: boolean;
  modified_count: number;
  deleted_count?: number;
  message: string;
}

export interface KdsUpdateDishGroupResponse {
  success: boolean;
  modified_count: number;
  message: string;
}

export interface KdsDeleteCookingConfigResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

export interface KdsCreateFoodControlRequest {
  host: string;
  port?: number;
  account_name?: string;
  account_id?: string;
  password?: string;
  place_name?: string;
  place_code?: string;
  printer?: string;
}

export interface KdsCreateFoodControlResponse {
  success: boolean;
  account_id: string;
  account_name: string;
  place_id: number;
  linked_places_count: number;
  message: string;
}

export interface KdsAssignDishQuayRequest {
  host: string;
  port?: number;
  menu_item_codes: string[];
  place_ids: number[];
  mode?: 'replace' | 'append';
  group_type_kds?: string;
}

export interface KdsAssignDishQuayResponse {
  success: boolean;
  modified_count: number;
  message: string;
}

export interface KdsDishLookupResponse {
  code: string;
  found: boolean;
  name?: string;
  sap_code?: string;
  price?: number;
  group_name?: string;
  menu_name?: string;
  in_kds: boolean;
  kds_id?: number;
  kds_place_ids: number[];
  kds_place_names: string[];
  kds_group_type?: string;
  kds_cooking_time?: number;
  kds_cooking_time_str?: string;
  message?: string;
}

export interface KdsAddDishItem {
  menu_item_code: string;
  menu_item_name?: string;
  place_ids: number[];
  single_cooking_time?: number; // seconds (default 600)
  group_type_kds?: string;
  sap_code?: string;
}

export interface KdsAddDishesRequest {
  host: string;
  port?: number;
  dishes: KdsAddDishItem[];
  overwrite_if_exists?: boolean;
}

export interface KdsAddDishesResponse {
  success: boolean;
  message: string;
  added_count: number;
  updated_count: number;
  total_count: number;
  details: Array<{
    code: string;
    name: string;
    action: 'ADDED' | 'UPDATED';
    id?: number;
    place_ids: number[];
    group_type: string;
    cooking_time: number;
  }>;
}

export interface KdsTransferQuayRequest {
  host: string;
  port?: number;
  from_place_id: number;
  to_place_id: number;
  menu_item_codes?: string[];
  keep_source?: boolean;
}

export interface KdsTransferQuayResponse {
  success: boolean;
  modified_count: number;
  from_place_name: string;
  to_place_name: string;
  message: string;
}

export interface KdsLogQueryRequest {
  host: string;
  port?: number;
  date: string; // YYYY-MM-DD
  table?: string;
  query?: string;
  from_time?: string;
  to_time?: string;
  limit?: number;
}

export interface KdsLogItem {
  id: string;
  table_name: string;
  dish_name: string;
  menu_item_code: string;
  sap_code: string;
  place_name: string;
  group_name?: string | null;
  historical_place_ids?: number[] | null;
  is_unassigned?: boolean;
  account_name?: string | null;
  order_time?: string | null;
  done_time?: string | null;
  actual_minutes: number;
  config_minutes: number;
  delay_minutes: number;
  status_label: string;
  source_collection: string;
  printer_name?: string | null;
  print_status?: string | null;
  print_message?: string | null;
}

export interface KdsKitchenIntakeAnalysisRequest {
  host: string;
  port?: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  place_id?: number | null;
}

export interface KdsKitchenIntakePlaceStat {
  place_id?: number | null;
  place_name: string;
  total_dishes: number;
  total_batches: number;
  avg_dishes_per_batch: number;
  percentage: number;
}

export interface KdsKitchenIntakeDateStat {
  date: string;
  total_dishes: number;
  total_batches: number;
  avg_dishes_per_batch: number;
}

export interface KdsKitchenIntakeHourStat {
  hour: number;
  hour_label: string;
  total_dishes: number;
  total_batches: number;
}

export interface KdsKitchenIntakeAnalysisResponse {
  success: boolean;
  message: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_dishes: number;
  total_batches: number;
  avg_dishes_per_batch: number;
  by_places: KdsKitchenIntakePlaceStat[];
  by_dates: KdsKitchenIntakeDateStat[];
  by_hours: KdsKitchenIntakeHourStat[];
  source_collection: string;
}

export interface KdsDishHistoryRequest {
  host: string;
  port?: number;
  item_code: string;
  sap_code?: string;
  dish_name?: string;
}

export interface KdsDishHistoryTimelineItem {
  id: string;
  order_time: string;
  done_time: string;
  table_name: string;
  place_ids: number[];
  place_name: string;
  group_name: string;
  config_minutes: number;
  actual_minutes: number;
  delay_minutes: number;
  status_label: string;
  printer_name?: string | null;
  source: string;
}

export interface KdsDishHistoryResponse {
  success: boolean;
  dish_name: string;
  item_code: string;
  sap_code: string;
  is_in_config_cooking: boolean;
  current_place_ids: number[];
  current_place_names: string[];
  current_group_name: string;
  current_config_minutes: number;
  is_hidden: boolean;
  is_out_of_stock: boolean;
  total_timeline_orders: number;
  timeline: KdsDishHistoryTimelineItem[];
  smart_analysis: string;
  message: string;
}

export interface KdsLogQueryResponse {
  success: boolean;
  total: number;
  date: string;
  table_filter?: string | null;
  query_filter?: string | null;
  logs: KdsLogItem[];
  message?: string;
}

export interface KdsUpdatePlacePrinterRequest {
  host: string;
  port?: number;
  place_id: number;
  printer: string;
}

export interface KdsUpdatePlacePrinterResponse {
  success: boolean;
  place_id: number;
  printer: string;
  message: string;
}

export interface KdsRenamePlaceRequest {
  host: string;
  port?: number;
  place_id: number;
  new_name: string;
}

export interface KdsRenamePlaceResponse {
  success: boolean;
  place_id: number;
  old_name: string;
  new_name: string;
  new_place_code: string;
  message: string;
}

export interface MongoFixCpuIpResult {
  ip: string;
  port: number;
  connected: boolean;
  created_indexes: string[];
  existing_indexes: string[];
  cleaned_logs?: Record<string, number>;
  total_cleaned_logs?: number;
  duration_seconds: number;
  error_message?: string;
}

export interface MongoFixCpuRestaurantResult {
  restaurant_id: number;
  sap?: string;
  restaurant_name?: string;
  trangthai?: string;
  subnet?: string;
  status: 'SUCCESS' | 'FAILED' | 'OFFLINE';
  processed_ips: string[];
  ip_results: MongoFixCpuIpResult[];
  total_cleaned_logs?: number;
  message: string;
  error_message?: string;
}

export interface MongoFixCpuRequest {
  restaurant_ids: number[];
  default_email?: string;
  user_email?: string;
  send_email?: boolean;
}

export interface MongoFixCpuResponse {
  total_restaurants: number;
  success_count: number;
  failed_count: number;
  total_cleaned_logs?: number;
  results: MongoFixCpuRestaurantResult[];
  email_sent: boolean;
  email_error?: string;
  recipients: string[];
  message: string;
}

export interface MongoFixCpuConfigResponse {
  default_email?: string;
  is_privileged: boolean;
}

// ══════════════════════════════════════════════════════════════════════════
// MONGO TRANSFER / MIGRATE INTERFACES
// ══════════════════════════════════════════════════════════════════════════

export interface MongoMachineStatus {
  ip: string;
  port: number;
  connected: boolean;
  ping_ms?: number;
  databases: string[];
  error?: string;
}

export interface MongoScanMachinesRequest {
  restaurant_id?: number;
  target_ip?: string;
  extra_ips?: string[];
}

export interface MongoScanMachinesResponse {
  restaurant_id?: number;
  restaurant_name?: string;
  subnet: string;
  machines: MongoMachineStatus[];
}

export interface MongoDatabaseDetail {
  name: string;
  collections_count: number;
  data_size_bytes: number;
  data_size_mb: number;
  storage_size_mb: number;
  estimated_docs: number;
  action_log_docs: number;
  action_log_size_mb: number;
  action_log_bk_docs: number;
  action_log_bk_size_mb: number;
}

export interface MongoMachineInspection {
  ip: string;
  port: number;
  connected: boolean;
  databases: MongoDatabaseDetail[];
  total_docs: number;
  total_size_mb: number;
  error?: string;
}

export interface MongoInspectPairRequest {
  source_ip: string;
  source_port?: number;
  dest_ip: string;
  dest_port?: number;
}

export interface MongoInspectPairResponse {
  source: MongoMachineInspection;
  dest: MongoMachineInspection;
  has_conflicts: boolean;
  conflicting_databases: string[];
  warning_message?: string;
  estimated_transfer_size_mb: number;
  action_log_savings_mb: number;
}

export interface MongoTransferExecuteRequest {
  source_ip: string;
  source_port?: number;
  dest_ip: string;
  dest_port?: number;
  selected_databases: string[];
  clean_action_log?: boolean;
  clean_action_log_bk?: boolean;
  clean_kitchen_action_log?: boolean;
  drop_dest_existing?: boolean;
}

export interface MongoTransferStepLog {
  step: string;
  status: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  timestamp: string;
}

export interface MongoTransferCollectionResult {
  database: string;
  collection: string;
  docs_count: number;
  indexes_count: number;
  duration_seconds: number;
}

export interface MongoTransferExecuteResponse {
  success: boolean;
  message: string;
  total_duration_seconds: number;
  cleaned_logs_summary: Record<string, number>;
  dropped_databases: string[];
  transferred_databases: string[];
  collections_transferred: MongoTransferCollectionResult[];
  verification_results: Array<{
    database: string;
    source_collections?: number;
    dest_collections?: number;
    source_docs: number;
    dest_docs: number;
    match: boolean;
  }>;
  logs: MongoTransferStepLog[];
}

export interface MongoTransferSettingsResponse {
  default_tails: string[];
}

export interface MenuGroupBrief {
  code: string;
  name: string;
  level: number;
  count: number;
  parent_code?: string;
  is_co?: boolean;
  channel?: 'CO' | 'SO_ONLY';
}

export interface ToggleGroupCoRequest {
  host: string;
  port?: number;
  menu_code: string;
  group_code: string;
  action: 'ADD' | 'REMOVE';
}

export interface ToggleGroupCoResponse {
  success: boolean;
  message: string;
  menu_code: string;
  group_code: string;
  action: string;
  menuGroupCodes: string[];
}

export interface MenuSoGroupItem {
  code: string;
  name: string;
  level: number;
  dish_count: number;
  is_co: boolean;
  in_file2?: boolean | null;
}

export interface MenuGroupsCoDetailResponse {
  success: boolean;
  message: string;
  menu_code: string;
  menu_name: string;
  so_groups: MenuSoGroupItem[];
  co_group_codes: string[];
  file2_available: boolean;
  file2_group_codes: string[];
  file2_path?: string | null;
  extra_co_groups: string[];
}

export interface BulkSyncMenuGroupsCoRequest {
  host: string;
  port?: number;
  menu_code: string;
  group_codes: string[];
  action: 'ADD' | 'SET' | 'REMOVE';
  update_file2?: boolean;
  file2_path?: string | null;
}

export interface BulkSyncMenuGroupsCoResponse {
  success: boolean;
  message: string;
  menu_code: string;
  action: string;
  updated_count: number;
  current_co_groups: string[];
  file2_updated: boolean;
}

export interface File2MenuSummaryItem {
  menu_code: string;
  menu_name: string;
  group_count: number;
  group_codes: string[];
  raw_groups: string;
}

export interface ReadFile2Response {
  success: boolean;
  message: string;
  file_path: string;
  menus: File2MenuSummaryItem[];
}

export interface DishLookupResponse {
  found: boolean;
  rk7_code: string;
  name?: string | null;
  sap_code?: string | null;
  price?: number | null;
  image_url?: string | null;
  source?: string | null;
  message?: string | null;
}

export interface MenuCategoryItem {
  code: string;
  id?: number;
  name: string;
  show_in_so: boolean;
  show_in_co: boolean;
  show_in_qr_order: boolean;
  auto_delivery_in_so: boolean;
  group_count: number;
  co_group_count?: number;
  so_only_group_count?: number;
  dish_count: number;
  groups?: MenuGroupBrief[];
}

export interface MenuCategoriesResponse {
  host: string;
  menus: MenuCategoryItem[];
  total_menus: number;
}

export interface DishMenuItem {
  menu_code: string;
  menu_name: string;
  group_code: string;
  group_name: string;
  parent_group_code?: string;
  group_is_co?: boolean;
  group_channel?: 'CO' | 'SO_ONLY';
  co_status_detail?: 'ACTIVE_ON_CO' | 'DISH_IN_CO_BUT_GROUP_NOT_IN_CO' | 'NOT_IN_CO' | string;
  level: number; // -1: Food/Thường, 0: Drink/Nước
  rk7_code: string;
  name: string;
  sap_code: string;
  sort_order: number;
  price: number;
  vat: number;
  image_url: string;
  src_img?: string;
  url_img_qr?: string;
  is_so: boolean;
  is_co: boolean;
  co_kalo?: number | null;
}

export interface LoadMenuItemsRequest {
  host: string;
  port?: number;
  menu_codes?: string[];
  search_all?: boolean;
  query?: string;
  rk7_codes?: string[];
  sap_codes?: string[];
  names?: string[];
}

export interface LoadMenuItemsResponse {
  host: string;
  items: DishMenuItem[];
  total_items: number;
  menus_loaded: string[];
}

export interface BulkAddDishRow {
  rk7_code: string;
  name: string;
  sap_code?: string;
  sort_order?: number;
  price?: number;
  image_url?: string;
  level?: number;
}

export interface BulkAddDishesRequest {
  host: string;
  port?: number;
  target_menu_codes: string[];
  group_mode: 'existing' | 'new';
  group_code?: string;
  group_name: string;
  group_name_en?: string;
  level: number;
  items: BulkAddDishRow[];
  menu_group_map?: Record<string, {
    group_mode: 'existing' | 'new';
    group_code?: string;
    group_name: string;
    group_name_en?: string;
    level?: number;
  }>;
}

export interface BulkAddDishesResponse {
  success: boolean;
  message: string;
  added_count: number;
  warnings: string[];
}

export interface UpdateDishItemRequest {
  host: string;
  port?: number;
  menu_code: string;
  group_code: string;
  original_rk7_code: string;
  new_rk7_code: string;
  new_name: string;
  new_sap_code?: string;
  new_sort_order: number;
  new_price: number;
  new_image_url?: string;
  new_level: number;
}

export interface UpdateDishItemResponse {
  success: boolean;
  message: string;
}

export interface DeleteDishesRequest {
  host: string;
  port?: number;
  items: Array<{ menu_code: string; group_code: string; rk7_code: string }>;
  delete_from_all_menus?: boolean;
}

export interface DeleteDishesResponse {
  success: boolean;
  message: string;
  deleted_count: number;
}

export interface MoveCloneDishesRequest {
  host: string;
  port?: number;
  action: 'move' | 'clone';
  source_items: Array<{ menu_code: string; group_code: string; rk7_code: string }>;
  target_menu_code: string;
  target_group_code: string;
}

export interface MoveCloneDishesResponse {
  success: boolean;
  message: string;
  processed_count: number;
}

export interface ConflictOccurrence {
  menu_code: string;
  menu_name?: string;
  group_code: string;
  group_name: string;
  name?: string;
  rk7_code?: string;
  sap_code?: string;
  price?: number;
}

export interface ConflictRk7Breakdown {
  rk7_code: string;
  names: string[];
  sap_codes: string[];
  menus: string[];
  prices: number[];
}

export interface ConflictItem {
  key: string;
  type: 'same_rk7_diff_name' | 'same_name_diff_rk7';
  rk7_code?: string;
  name?: string;
  distinct_values: string[];
  distinct_saps?: string[];
  sap_status?: 'SAME_SAP' | 'DIFF_SAP' | 'NO_SAP' | 'PARTIAL_SAP';
  sap_summary?: string;
  rk7_breakdown?: ConflictRk7Breakdown[];
  occurrences: ConflictOccurrence[];
}

export interface CheckConflictsResponse {
  host: string;
  same_rk7_diff_name: ConflictItem[];
  same_name_diff_rk7: ConflictItem[];
  total_conflicts: number;
}

export interface ResolveConflictRequest {
  host: string;
  port?: number;
  conflict_type: 'same_rk7_diff_name' | 'same_name_diff_rk7';
  unified_rk7_code: string;
  unified_name: string;
  affected_rk7_codes?: string[];
  affected_names?: string[];
}

export interface ResolveConflictResponse {
  success: boolean;
  message: string;
  updated_count: number;
}

export interface ActivateCoRequest {
  host: string;
  port?: number;
  items: Array<{
    rk7_code: string;
    name: string;
    sap_code?: string;
    price?: number;
    image_url?: string;
  }>;
}

export interface ActivateCoResponse {
  success: boolean;
  message: string;
  activated_count: number;
}

export interface DeactivateCoRequest {
  host: string;
  port?: number;
  rk7_codes: string[];
}

export interface DeactivateCoResponse {
  success: boolean;
  message: string;
  deactivated_count: number;
}

export interface SyncAllSoCoResponse {
  success: boolean;
  message: string;
  so_version: number;
  co_version: number;
  config_version: number;
  kds_synced_count: number;
  time_sync: number;
}

export interface SaveMenuSnapshotRequest {
  host: string;
  port?: number;
  source_sap?: string;
  source_name?: string;
  snapshot_name?: string;
  menu_codes?: string[];
}

export interface MenuSnapshotMeta {
  id: string;
  name: string;
  source_sap: string;
  source_name: string;
  source_host: string;
  created_at: string;
  created_by: string;
  total_menus: number;
  total_groups: number;
  total_dishes: number;
  menus_summary: Array<{
    code: string;
    name: string;
    groups_count: number;
    dishes_count: number;
  }>;
}

export interface SaveMenuSnapshotResponse {
  success: boolean;
  message: string;
  snapshot: MenuSnapshotMeta;
}

export type MenuSnapshotItem = MenuSnapshotMeta;

export interface MenuSnapshotDetail {
  meta: MenuSnapshotMeta;
  data: {
    restaurant_categories: any[];
    order_menu_cache_categories: any[];
    menu_groups: any[];
    co_menu_groups: any[];
    co_menu_items: any[];
    show_hide_items?: any[];
  };
}

export interface DeployMenuSnapshotRequest {
  target_host: string;
  target_port?: number;
  target_sap?: string;
  mode?: 'merge_update' | 'clean_overwrite';
  target_menu_codes?: string[];
  sync_co?: boolean;
}

export interface DeployMenuSnapshotResponse {
  success: boolean;
  message: string;
  target_host: string;
  menus_deployed: number;
  so_version: number;
  co_version: number;
}

export interface DirectSyncMenuRequest {
  source_host: string;
  source_port?: number;
  target_host: string;
  target_port?: number;
  source_sap?: string;
  source_name?: string;
  target_sap?: string;
  target_name?: string;
  mode?: 'merge_update' | 'clean_overwrite';
  menu_codes?: string[];
  sync_co?: boolean;
}

export interface DirectSyncMenuResponse {
  success: boolean;
  message: string;
  backup_snapshot_id: string;
  details: any;
}













export interface CheckDishImageResult {
  status: 'MATCH' | 'PREFIX_MISMATCH' | 'CASE_MISMATCH' | 'CANDIDATE_FOUND' | 'NOT_FOUND' | 'NO_IMAGE';
  is_match: boolean;
  is_fixable: boolean;
  message: string;
  given_path: string;
  given_filename: string;
  given_prefix: string;
  server_filename: string;
  suggested_fix_path: string;
}

export interface CheckMenuImagesResponse {
  server_host: string;
  server_dir: string;
  total_dishes: number;
  total_server_files: number;
  match_count: number;
  prefix_mismatch_count: number;
  case_mismatch_count: number;
  candidate_count: number;
  not_found_count: number;
  no_image_count: number;
  fixable_count: number;
  results: (CheckDishImageResult & {
    dish_id: string;
    rk7_code: string;
    sap_code: string;
    name: string;
  })[];
}

export interface DishImageFixItem {
  rk7_code: string;
  sap_code?: string;
  target_image_path: string;
}

export interface SyncDishImagesRequest {
  host: string;
  port?: number;
  fixes: DishImageFixItem[];
  menu_code?: string;
  menu_name?: string;
  restaurant_name?: string;
}

export interface SyncDishImagesResponse {
  success: boolean;
  updated_count: number;
  total_requested: number;
  message: string;
  errors: string[];
}
