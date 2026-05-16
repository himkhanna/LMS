"use client";

import { useState } from "react";
import type { Provider, ProviderInput, ProviderType } from "@/lib/api";

const TYPES: { value: ProviderType; label: string; help: string }[] = [
  { value: "OPENAI", label: "OpenAI", help: "Default base: https://api.openai.com. Model = e.g. gpt-4o-mini." },
  { value: "AZURE_OPENAI", label: "Azure OpenAI", help: "Base URL = your resource (https://X.openai.azure.com). Model = deployment name." },
  { value: "ANTHROPIC", label: "Anthropic", help: "Default base: https://api.anthropic.com. Model = e.g. claude-sonnet-4-6." },
  { value: "OLLAMA", label: "Ollama (local)", help: "Default base: http://localhost:11434. No API key. Model = e.g. llama3.2." },
];

type Props = {
  initial?: Provider;
  submitLabel: string;
  onSubmit: (input: ProviderInput) => Promise<void>;
};

export function ProviderForm({ initial, submitLabel, onSubmit }: Props) {
  const [providerType, setProviderType] = useState<ProviderType>(
    initial?.providerType ?? "OPENAI"
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [defaultModel, setDefaultModel] = useState(initial?.defaultModel ?? "");
  const [priority, setPriority] = useState(String(initial?.priority ?? 0));
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const typeInfo = TYPES.find((t) => t.value === providerType)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const input: ProviderInput = {
        providerType,
        name: name.trim(),
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        defaultModel: defaultModel.trim() || undefined,
        priority: Number(priority) || 0,
        enabled,
        isDefault,
      };
      await onSubmit(input);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Provider type</span>
        <select
          value={providerType}
          onChange={(e) => setProviderType(e.target.value as ProviderType)}
          disabled={!!initial}
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--muted)]">{typeInfo.help}</p>
      </label>

      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={255}
          placeholder="e.g. openai-prod"
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Default model {providerType === "AZURE_OPENAI" ? "(deployment name)" : ""}</span>
        <input
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          placeholder={
            providerType === "OPENAI" ? "gpt-4o-mini"
            : providerType === "ANTHROPIC" ? "claude-sonnet-4-6"
            : providerType === "OLLAMA" ? "llama3.2"
            : "gpt-4o-deployment"
          }
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">
          API key {initial ? "(leave blank to keep existing)" : ""}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={providerType === "OLLAMA" ? "(not required)" : "sk-…"}
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        />
        {initial?.apiKeySet ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Current: {initial.apiKeyPreview}</p>
        ) : null}
      </label>

      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Base URL (optional)</span>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={
            providerType === "AZURE_OPENAI"
              ? "https://your-resource.openai.azure.com"
              : "leave blank for default"
          }
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Priority (higher tried first)</span>
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-32 rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
        />
      </label>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          Use as default
        </label>
      </div>

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
    </form>
  );
}
