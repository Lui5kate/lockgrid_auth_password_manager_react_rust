import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Unlock } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "../stores/authStore";

export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { unlock, isLoading } = useAuthStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await unlock(password);
    } catch {
      setError("Invalid master password");
      setPassword("");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-lockgrid-950 via-gray-900 to-gray-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm mx-auto p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lockgrid-600/20 mb-4"
          >
            <Shield size={32} className="text-lockgrid-400" />
          </motion.div>
          <h1 className="text-xl font-bold text-white mb-1">LockGrid Auth</h1>
          <p className="text-gray-500 text-sm">Enter your master password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master password"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lockgrid-500/50 focus:border-lockgrid-500 transition-colors text-center"
            autoFocus
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={isLoading || !password}
            className="w-full py-3 rounded-xl"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Unlocking...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Unlock size={16} />
                Unlock
              </span>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
