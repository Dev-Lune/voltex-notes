"use client";

import React, { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Cloud, Shield, Zap } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/config";
import { isElectron, authClient } from "@/lib/vault/client";

interface AuthModalProps {
  onClose: () => void;
  onAuth: (user: { email: string; displayName: string; uid: string }) => void;
}

export default function AuthModal({ onClose, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const firebaseErrorMessage = (code: string): string => {
    switch (code) {
      case "auth/invalid-email": return "Invalid email address.";
      case "auth/user-disabled": return "This account has been disabled.";
      case "auth/user-not-found": return "No account found with this email.";
      case "auth/wrong-password": return "Incorrect password.";
      case "auth/invalid-credential": return "Invalid email or password.";
      case "auth/email-already-in-use": return "An account with this email already exists.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      case "auth/too-many-requests": return "Too many attempts. Please try again later.";
      case "auth/popup-closed-by-user": return "Sign-in popup was closed.";
      case "auth/network-request-failed": return "Network error. Check your connection.";
      default: return "Authentication failed. Please try again.";
    }
  };

  const completeAuth = (cred: UserCredential) => {
    const u = cred.user;
    onAuth({
      email: u.email || "",
      displayName: u.displayName || u.email?.split("@")[0] || "User",
      uid: u.uid,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !displayName) {
      setError("Please enter a display name.");
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase is not configured.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        completeAuth(cred);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        completeAuth(cred);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase is not configured.");
      return;
    }

    setLoading(true);
    try {
      if (isElectron()) {
        // Electron: open system default browser for Google OAuth
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const clientSecret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          setError("Google OAuth credentials not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_CLIENT_SECRET).");
          setLoading(false);
          return;
        }
        const result = await authClient.googleSignIn(clientId, clientSecret);
        if ("error" in result) {
          setError(result.error);
          setLoading(false);
          return;
        }
        // Exchange the ID token for a Firebase credential
        const credential = GoogleAuthProvider.credential(result.idToken);
        const cred = await signInWithCredential(auth, credential);
        completeAuth(cred);
      } else {
        // Web: use standard Firebase popup
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        completeAuth(cred);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-xl overflow-hidden"
        style={{
          background: "var(--color-obsidian-surface)",
          border: "1px solid var(--color-obsidian-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 border-b"
          style={{ borderColor: "var(--color-obsidian-border)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-md hover:opacity-70"
            style={{ color: "var(--color-obsidian-muted-text)" }}
          >
            <X size={16} />
          </button>

          {/* Firebase branding */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
            >
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
                Firebase Auth
              </div>
              <div className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                Secured by Google
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold" style={{ color: "var(--color-obsidian-text)" }}>
            {mode === "signin" ? "Sign in to sync your vault" : "Create your cloud vault"}
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-obsidian-muted-text)" }}>
            {mode === "signin"
              ? "Your notes will sync across all devices in real-time."
              : "Start syncing your knowledge base to the cloud."}
          </p>
        </div>

        {/* Features */}
        <div
          className="px-6 py-3 grid grid-cols-3 gap-2 border-b"
          style={{ borderColor: "var(--color-obsidian-border)", background: "var(--color-obsidian-bg)" }}
        >
          {[
            { icon: Cloud, label: "Real-time sync" },
            { icon: Shield, label: "End-to-end encryption" },
            { icon: Zap, label: "Offline access" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <Icon size={14} style={{ color: "var(--color-obsidian-accent)" }} />
              <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-3">
          {mode === "signup" && (
            <div className="relative">
              <User
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-obsidian-muted-text)" }}
              />
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--color-obsidian-bg)",
                  border: "1px solid var(--color-obsidian-border)",
                  color: "var(--color-obsidian-text)",
                }}
              />
            </div>
          )}

          <div className="relative">
            <Mail
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-obsidian-bg)",
                border: "1px solid var(--color-obsidian-border)",
                color: "var(--color-obsidian-text)",
              }}
            />
          </div>

          <div className="relative">
            <Lock
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--color-obsidian-bg)",
                border: "1px solid var(--color-obsidian-border)",
                color: "var(--color-obsidian-text)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
              style={{ color: "var(--color-obsidian-muted-text)" }}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#ef4444" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-60"
            style={{
              background: "var(--color-obsidian-accent)",
              color: "#fff",
            }}
          >
            {loading ? "Connecting to Firebase…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-obsidian-border)" }} />
            <span className="text-xs" style={{ color: "var(--color-obsidian-muted-text)" }}>
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--color-obsidian-border)" }} />
          </div>

          {/* Google sign in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-60"
            style={{
              background: "var(--color-obsidian-bg)",
              border: "1px solid var(--color-obsidian-border)",
              color: "var(--color-obsidian-text)",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Toggle mode */}
        <div
          className="px-6 pb-5 text-center text-sm"
          style={{ color: "var(--color-obsidian-muted-text)" }}
        >
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            style={{ color: "var(--color-obsidian-link)" }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
