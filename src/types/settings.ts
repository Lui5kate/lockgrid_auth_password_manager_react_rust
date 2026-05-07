export interface AuthStatus {
  is_locked: boolean;
  is_first_run: boolean;
  has_pin: boolean;
}

export interface PasswordGenConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  exclude_ambiguous: boolean;
}
