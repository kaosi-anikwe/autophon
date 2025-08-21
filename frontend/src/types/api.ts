// User types
export interface User {
  id: number;
  uuid?: string;
  email: string;
  first_name: string;
  last_name: string;
  title?: string;
  edited?: boolean;
  org?: string;
  industry?: string;
  display_name?: string;
  profile_image?: string;
  trans_default?: string;
  dict_default?: string;
  admin: boolean;
  verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
  bio: string;
}

export interface TeamCategoryData {
  name: string;
  members: TeamMember[];
}

export interface TeamResponse {
  team: TeamCategoryData[];
}

// App Config types
export interface AppConfig {
  userLimits: {
    size_limit: number;
    file_pair_limit: number;
    user_dict_limit: number;
    a_size_limit: number;
    a_upload_limit: number;
  };
  audioExtensions: string[];
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  title?: string;
  org?: string;
  industry?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  // Note: access_token and refresh_token are now set as HTTP-only cookies
}

// Task types
export interface Task {
  id: string;
  user_id?: number;
  task_id: string;
  language_id: number;
  engine: Engine | null;
  download_title?: string;
  download_date?: string;
  no_of_tiers?: number;
  size?: number;
  batch?: boolean;
  task_status:
    | "uploading"
    | "uploaded"
    | "aligned"
    | "completed"
    | "failed"
    | "processing"
    | "cancelled"
    | "expired";
  pre_error?: boolean;
  anonymous: boolean;
  trans_choice: "var-ling" | "comp-ling" | "exp-a" | "exp-b";
  language: Language | null;
  task_path: string;
  deleted: string | null;
  log_path?: string;
  file_count: number;
  words?: number;
  missing_words?: number;
  missingpronhtml?: string;
  cite?: string;
  duration?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  task_id: string;
  status: Task["task_status"];
  progress?: number;
  message?: string;
  estimated_completion?: string;
}

// Language types
export interface Language {
  id: number;
  code: string;
  display_name: string;
  language_name: string;
  type: string;
  alphabet: string;
  priority: number;
  homepage: boolean;
  is_active: boolean;
}

export interface LanguageHomepage {
  id: number;
  code: string;
  display_name: string;
  language_name: string;
  alphabet: string;
  priority: number;
}
export interface Language {
  id: number;
  code: string;
  display_name: string;
  language_name: string;
  type: string;
}

export interface LanguagesResponse {
  languages: LanguageHomepage[];
  grouped_languages: {
    nordic: LanguageHomepage[];
    other: LanguageHomepage[];
  };
  count: number;
}

export interface DictionaryLanguagesResponse {
  languages: Language[];
  count: number;
}

// Engine types
export interface Engine {
  id: number;
  code: string;
  name: string;
  documentation_link?: string;
  is_active: boolean;
}

export interface EngineHomepage {
  id: number;
  code: string;
  name: string;
  documentation_link?: string;
}

export interface EnginesResponse {
  engines: EngineHomepage[];
  count: number;
}

export interface Dictionary {
  content: string;
  language: string;
  phones: string[];
  word_count: number;
}

// API Response types
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  code?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export interface HistoryTotals {
  task_count: number;
  file_count: number;
  total_size: number;
  total_words: number;
  language_counts: Record<string, number>;
}

export interface AdminDashboardStats {
  total_users: number;
  total_file_size: {
    size_mb: number;
    display: string;
  };
  currently_logged_in: number;
  tasks_processed_today: {
    completed: number;
    pending: number;
    failed: number;
    processing: number;
    count: number;
    size_mb: number;
    size_display: string;
  };
  additional_stats: {
    total_tasks_all_time: number;
    new_users_today: number;
  };
  generated_at: string;
  date: string;
}

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  title?: string;
  org?: string;
  industry?: string;
  admin: boolean;
  verified: boolean;
  created_at: string;
  last_login?: string;
  uuid: string;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_num?: number;
  prev_num?: number;
}

export interface PaginatedUsersResponse {
  users: AdminUser[];
  pagination: PaginationInfo;
}

export interface UserActionRequest {
  email: string;
  action: "verify" | "make_admin" | "block" | "delete";
}

export interface UserActionResponse {
  message: string;
  action: string;
  success: boolean;
  user_email: string;
  user_logged_out?: boolean;
  already_blocked?: boolean;
}

export interface GenerateUserReportRequest {
  user_limit?: string; // Date in YYYY-MM-DD format
  include_deleted: boolean;
}

export interface HistoryFile {
  filename: string;
  size: number;
  date: string;
  type: "xlsx" | "zip";
}

export interface DownloadHistoryFileRequest {
  filename: string;
}

export interface SiteStatus {
  active: boolean;
  start_date?: string;
  end_date?: string;
  inactive_message?: string;
}

export interface UpdateSiteStatusRequest {
  active: boolean;
  start_date?: string;
  end_date?: string;
  inactive_message?: string;
}

export interface BlockedEmailAction {
  email: string;
  action: "add" | "remove";
}
