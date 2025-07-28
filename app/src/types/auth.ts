export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'board_member';
  avatar_url?: string;
  position?: string;
  phone?: string;
  bio?: string;
  is_active: boolean;
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  profile: User | null;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role?: 'admin' | 'board_member';
}
