import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "../stores/authStore";

export function SetupScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { setupMasterPassword, isLoading } = useAuthStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await setupMasterPassword(password);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-lockgrid-950 via-gray-900 to-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lockgrid-600/20 mb-4"
          >
            <Shield size={32} className="text-lockgrid-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome to LockGrid Auth
          </h1>
          <p className="text-gray-400 text-sm">
            Create a master password to protect your vault.
            <br />
            This password encrypts all your data locally.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
              Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong master password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lockgrid-500/50 focus:border-lockgrid-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your master password"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lockgrid-500/50 focus:border-lockgrid-500 transition-colors"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm"
            >
              {error}
            </motion.p>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full py-3 text-base rounded-xl"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating vault...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock size={16} />
                  Create Vault
                </span>
              )}
            </Button>
          </div>

          <p className="text-center text-2xs text-gray-500 mt-4">
            Your password never leaves this device.
            <br />
            All data is encrypted with AES-256-GCM.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
