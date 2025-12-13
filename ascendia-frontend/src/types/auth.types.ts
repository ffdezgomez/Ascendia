// Definición de tipos y modelos para autenticación y usuarios

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  profile?: Profile | string;
  friends?: string[];
  isActive?: boolean;
  createdAt?: string;
}

export interface Profile {
  _id: string;
  user: string | User;
  avatar?: string;
  bio?: string;
  habits?: string[];
  stats?: {
    readingHours?: number;
    workoutHours?: number;
    streak?: number;
  };
  challenges?: string[];
  preferences?: {
    notifications?: boolean;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
  profile?: Profile;
}
