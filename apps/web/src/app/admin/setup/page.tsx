"use client";

import { useEffect, useState } from "react";
import Login from "../login";
import { apiFetch } from "../../../lib/api";

export default function Setup() {
  const [owner, setOwner] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/owner")
      .then((response) => response.ok)
      .then(setOwner)
      .catch(() => setOwner(false));
  }, []);

  if (owner === null) return <main className="admin"><p>Checking owner access…</p></main>;
  if (owner) return <Login setup />;
  return <main className="admin"><a href="/admin">← Admin login</a><h1>Owner password setup</h1><p>Only the site owner can set or reset the shared admin password. Verify your owner account before continuing.</p><a className="btn" href="/signin-with-chatgpt?return_to=/admin/setup" target="_top">Verify owner account</a></main>;
}
