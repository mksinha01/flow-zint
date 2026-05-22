"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params?.id as string | undefined;

  useEffect(() => {
    if (id) {
      localStorage.setItem("workspace_id", id);
    }
  }, [id]);

  return <>{children}</>;
}
