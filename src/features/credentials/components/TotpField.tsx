import { Copy, Check, ShieldAlert, KeyRound } from "lucide-react";
import { useTotp } from "../hooks/useTotp";
import { useClipboard } from "@/hooks/useClipboard";

interface TotpFieldProps {
  secret: string;
}

export function TotpField({ secret }: TotpFieldProps) {
  const { code, progress, secondsRemaining, isValid, error } = useTotp(secret);
  const { copy, copiedField } = useClipboard();
  const copied = copiedField === "totp";

  const urgent = secondsRemaining <= 5;

  return (
    <div className="group">
      <p className="text-2xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <KeyRound size={10} />
        One-time code (TOTP)
      </p>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-secondary dark:bg-surface-dark-secondary">
        <span
          className={`flex-1 text-lg font-mono tracking-[0.35em] select-text ${
            urgent && isValid
              ? "text-amber-500"
              : isValid
                ? "text-lockgrid-600 dark:text-lockgrid-400"
                : "text-gray-400"
          }`}
        >
          {formatCode(code)}
        </span>

        {isValid ? (
          <CountdownRing progress={progress} seconds={secondsRemaining} urgent={urgent} />
        ) : error ? (
          <span title={error} className="text-red-400">
            <ShieldAlert size={14} />
          </span>
        ) : null}

        <button
          onClick={() => isValid && copy(code, "totp")}
          disabled={!isValid}
          className="p-1 text-gray-400 hover:text-lockgrid-500 transition-colors disabled:opacity-40"
          title="Copy code"
        >
          {copied ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>
      {error && (
        <p className="text-2xs text-red-500 mt-1">Invalid TOTP secret</p>
      )}
    </div>
  );
}

function CountdownRing({
  progress,
  seconds,
  urgent,
}: {
  progress: number;
  seconds: number;
  urgent: boolean;
}) {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * progress;
  return (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 20 20" className="rotate-[-90deg]">
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={urgent ? "text-amber-500" : "text-lockgrid-500"}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="absolute text-[8px] font-mono text-gray-400">
        {seconds}
      </span>
    </div>
  );
}

function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  return code;
}
