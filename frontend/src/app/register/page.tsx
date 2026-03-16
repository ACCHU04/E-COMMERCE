"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { registerUser } from "@/lib/api";
import { setAuthUser } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      setIsLoading(true);
      const response = await registerUser(email.trim(), password);
      setAuthUser(response.user.email, response.access_token);
      router.replace("/");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 flow-fade">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <BarChart3 size={18} color="#fff" />
          </div>
          <h1 className="font-head text-xl text-slate-100">Create Account</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md bg-slate-900/70 border border-white/10 text-slate-100"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md bg-slate-900/70 border border-white/10 text-slate-100"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-md px-2.5 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-60"
          >
            {isLoading ? "Creating..." : "Create Account"}
            {!isLoading && <ArrowRight size={14} />}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Already have an account? <Link href="/login" className="text-violet-300">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
