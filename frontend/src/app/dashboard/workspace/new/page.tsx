"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { workspacesApi } from "@/lib/api";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await workspacesApi.create(name, slug);
      // Redirect to the onboarding flow to fill business form and upload docs
      router.push("/dashboard/onboarding");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 animate-slide-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Workspace</h1>
        <p className="text-[var(--text-secondary)]">Set up a space for your company's AI Agent.</p>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Workspace Name</label>
            <input
              type="text"
              className="input-dark w-full"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {error && (
             <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-md border border-red-500/20">
               {error}
             </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading || !name}>
            {loading ? "Creating..." : "Create Workspace →"}
          </button>
        </form>
      </div>
    </div>
  );
}
