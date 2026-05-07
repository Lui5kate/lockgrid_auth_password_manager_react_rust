import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "../stores/authStore";

export function LockScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { unlock, verifyPin, status, isLoading } = useAuthStore();
  const [mode, setMode] = useState<"password" | "pin">(
    status?.has_pin ? "pin" : "password",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      if (mode === "pin") {
        await verifyPin(password);
      } else {
        await unlock(password);
      }
    } catch {
      setError(mode === "pin" ? "Invalid PIN" : "Invalid password");
      setPassword("");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-lockgrid-950 via-gray-900 to-gray-950">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm mx-auto p-8 text-center"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 mb-4"
        >
          <Lock size={28} className="text-amber-400" />
        </motion.div>

        <h2 className="text-lg font-semibold text-white mb-1">Vault Locked</h2>
        <p className="text-gray-500 text-sm mb-6">
          {mode === "pin" ? "Enter your PIN" : "Enter master password"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "pin" ? "PIN" : "Master password"}
            maxLength={mode === "pin" ? 8 : undefined}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lockgrid-500/50 text-center tracking-widest"
            autoFocus
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3 rounded-xl"
          >
            Unlock
          </Button>

          {status?.has_pin && (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "pin" ? "password" : "pin");
                setPassword("");
                setError("");
              }}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              {mode === "pin"
                ? "Use master password instead"
                : "Use PIN instead"}
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
