export interface PersonalTaskItem {
  id: number;
  username: string;
  noi_dung: string;
  images?: string | null;
  files?: string | null;
  trang_thai: string; // 'PENDING' | 'COMPLETED'
  ngay_tao?: string | null;
  ngay_hoan_thanh?: string | null;
  sort_order: number;
  active: boolean;
}

export interface PersonalTaskCreatePayload {
  noi_dung: string;
  images?: string;
  files?: string;
}

export interface PersonalTaskBatchCreatePayload {
  tasks: string[];
}

export interface PersonalTaskUpdatePayload {
  noi_dung?: string;
  trang_thai?: string;
  images?: string;
  files?: string;
}

export interface PersonalTaskListResponse {
  items: PersonalTaskItem[];
  total_pending: number;
  total_completed: number;
}

export interface AITaskExtractRequest {
  text_content?: string;
  image_base64?: string;
  ai_key?: string;
}
