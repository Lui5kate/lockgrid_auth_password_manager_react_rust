import { useState, useEffect } from "react";
import { credentialService } from "@/services/credentialService";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const [strength, setStrength] = useState(0);

  useEffect(() => {
    if (!password) {
      setStrength(0);
      return;
    }
    credentialService.calculateStrength(password).then(setStrength).catch(() => {});
  }, [password]);

  if (!password) return null;

  const label =
    strength < 25
      ? "Weak"
      : strength < 50
        ? "Fair"
        : strength < 75
          ? "Good"
          : "Strong";

  const color =
    strength < 25
      ? "bg-red-500"
      : strength < 50
        ? "bg-orange-500"
        : strength < 75
          ? "bg-yellow-500"
          : "bg-green-500";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${strength}%` }}
        />
      </div>
      <span className="text-2xs text-gray-500">{label}</span>
    </div>
  );
}
