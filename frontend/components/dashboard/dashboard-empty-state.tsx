"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  action: string;
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  href,
  action,
}: DashboardEmptyStateProps) {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center text-center gap-3">
      <div className="rounded-full bg-primary/10 p-3">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}
