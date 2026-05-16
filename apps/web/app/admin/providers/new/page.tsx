"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Providers } from "@/lib/api";
import { ProviderForm } from "@/components/ProviderForm";

export default function NewProviderPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add AI provider</h1>
        <Link href="/admin/providers" className="text-sm text-[var(--muted)] hover:underline">
          Cancel
        </Link>
      </div>
      <ProviderForm
        submitLabel="Create provider"
        onSubmit={async (input) => {
          await Providers.create(input);
          router.push("/admin/providers");
        }}
      />
    </div>
  );
}
