"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { RiEyeLine, RiEyeOffLine, RiKey2Line, RiLock2Line } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export function AccessForm({ returnTo }: { returnTo: string }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [pendingReturnTo, setPendingReturnTo] = useState(returnTo);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("emw3_return_to");
    if (returnTo !== "/") {
      window.sessionStorage.setItem("emw3_return_to", returnTo);
      setPendingReturnTo(returnTo);
    } else if (stored?.startsWith("/") && !stored.startsWith("//")) {
      setPendingReturnTo(stored);
    }
  }, [returnTo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!key.trim()) {
      setError("Enter the dashboard access key to continue.");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ key: key.trim(), returnTo: pendingReturnTo }),
      });
      const responseText = await response.text();
      const payload = (() => {
        try { return JSON.parse(responseText) as { error?: string; returnTo?: string }; }
        catch { return null; }
      })();
      if (!payload) throw new Error("The dashboard is temporarily unavailable. Please try again.");
      if (!response.ok) throw new Error(payload.error || "Access could not be verified.");
      window.sessionStorage.removeItem("emw3_return_to");
      window.location.replace(payload.returnTo || pendingReturnTo || "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Access could not be verified.");
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="mt-8 space-y-4">
    <Input
      ref={inputRef}
      label="Dashboard Access Key"
      name="dashboard-access-key"
      type={showKey ? "text" : "password"}
      autoComplete="current-password"
      value={key}
      onChange={setKey}
      leadingIcon={RiKey2Line}
      trailingAddon={<Button type="button" size="small" variant="ghost" iconOnly leadingIcon={showKey ? RiEyeOffLine : RiEyeLine} aria-label={showKey ? "Hide access key" : "Show access key"} aria-pressed={showKey} onMouseDown={(event) => event.preventDefault()} onClick={() => setShowKey((visible) => !visible)} />}
      placeholder="Enter access key"
      isDisabled={loading}
      isInvalid={Boolean(error)}
      hint={error || undefined}
    />
    <Button className="w-full" type="submit" leadingIcon={RiLock2Line} disabled={loading}>
      {loading ? "Verifying…" : "Open Dashboard"}
    </Button>
  </form>;
}
