// User types
export interface User {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  title?: string;
  org?: string;
  industry?: string;
  admin: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
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
  engine_id: number;
  status:
    | "uploading"
    | "uploaded"
    | "aligned"
    | "completed"
    | "failed"
    | "cancelled";
  anonymous: boolean;
  transcription_choice: "var-ling" | "comp-ling" | "exp-a" | "exp-b";
  language_code: string;
  task_path: string;
  log_path?: string;
  file_count: number;
  words_count?: number;
  missing_words?: number;
  duration?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskStatus {
  task_id: string;
  status: Task["status"];
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

export interface LanguagesResponse {
  languages: LanguageHomepage[];
  grouped_languages: {
    nordic: LanguageHomepage[];
    other: LanguageHomepage[];
  };
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
