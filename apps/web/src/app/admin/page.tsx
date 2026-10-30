"use client";

import { useEffect, useState } from "react";
import Admin from "./panel";
import Login from "./login";
import { apiFetch } from "../../lib/api";

export default function Page() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [configured, setConfigured] = useState(true);
  const [enquiries, setEnquiries] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/admin/session")
      .then(async (response) => {
        const body = await response.json() as { configured?: boolean; enquiries?: any[] };
        if (response.status === 401) {
          setConfigured(body.configured ?? true);
          setState("login");
          return;
        }
        if (!response.ok) throw new Error("Unable to load session");
        setEnquiries(body.enquiries ?? []);
        setState("ready");
      })
      .catch(() => setState("login"));
  }, []);

  if (state === "loading") return <main className="admin"><p>Loading administration…</p></main>;
  if (state === "login") return <Login configured={configured} />;
  return <Admin enquiries={enquiries} />;
}
