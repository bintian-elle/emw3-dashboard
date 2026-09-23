"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RiEyeLine, RiEyeOffLine, RiKey2Line, RiLock2Line } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export function AccessForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ key, returnTo }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Access could not be verified.");
      router.replace(payload.returnTo || "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Access could not be verified.");
    } finally {
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
