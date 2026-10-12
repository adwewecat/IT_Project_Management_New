export interface MemberTask {
  TaskID: number;
  MemberID: number;
  TaskName: string;
  Done: boolean;
  CompletedAt: string | null;
  LastChangedBy: string | null;
  LastChangedAt: string | null;
  Attachment?: string | null;
  ReviewStatus?: 'ok' | 'fail' | null;
  ReviewNote?: string | null;
  ReviewedBy?: string | null;
  ReviewedAt?: string | null;
}

export interface ProjectMember {
  MemberID: number;
  ProjectID: number;
  MemberName: string;
  MemberCode: string | null;
  CompletedAt: string | null;
  tasks: MemberTask[];
}

export interface Project {
  ProjectID: number;
  ProjectName: string;
  Status: 'in-progress' | 'completed';
  Deadline: string | null;
  ProjectCode: string | null;
  Description?: string | null;
  Images?: string | null;
  Files?: string | null;
  DescriptionUpdatedAt?: string | null;
  DescriptionUpdatedBy?: string | null;
  members: ProjectMember[];
  total_tasks: number;
  done_tasks: number;
  progress_percent: number;
}

export interface ProjectActivityLog {
  LogID: number;
  ProjectID: number;
  ProjectName: string | null;
  MemberID: number | null;
  TaskID: number | null;
  ActionTime: string;
  ActionBy: string;
  ActionType: string;
  Message: string | null;
}

export interface ProjectCreate {
  ProjectName: string;
  Deadline?: string | null;
  ProjectCode?: string | null;
  Description?: string | null;
  Images?: string | null;
  Files?: string | null;
}

export interface ProjectUpdate {
  ProjectName?: string;
  Deadline?: string | null;
  Status?: 'in-progress' | 'completed';
  ProjectCode?: string | null;
  Description?: string | null;
  Images?: string | null;
  Files?: string | null;
}

export interface MemberCreate {
  MemberName: string;
  MemberCode?: string | null;
}

export interface TaskCreate {
  TaskName: string;
}

export interface ImportResult {
  success: boolean;
  projects_count: number;
  members_count: number;
  tasks_count: number;
  message: string;
  errors: string[];
}

export interface AppPmItem {
  id: number;
  project_name: string;
  pm_project: string | null;
  ngay_trienkhai: string | null;
  ngay_update: string | null;
  note_them: string | null;
  active: boolean;
}

export interface AppPmCreate {
  project_name: string;
  pm_project?: string;
  note_them?: string;
}

export interface AppPmUpdate {
  project_name?: string;
  pm_project?: string;
  note_them?: string;
  active?: boolean;
}

export interface QuickAssignTaskRequest {
  project_id?: number;
  project_name?: string;
  member_id?: number;
  member_name?: string;
  task_name: string;
  deadline?: string | null;
  attachment?: string | null;
}

export interface QuickAssignResult {
  success: boolean;
  message: string;
  task_id: number;
  member_id: number;
  member_name: string;
  project_id: number;
  project_name: string;
  attachment?: string | null;
}

export interface TeamMemberItem {
  id: number;
  username: string;
  full_name: string;
  label: string;
  role_name?: string;
}

export interface UploadAttachmentResult {
  file_url: string;
  file_name: string;
  saved_name: string;
}


