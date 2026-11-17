"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type NotificationTone } from "@/lib/notifications";

const TONE: Record<NotificationTone, { dot: string; ring: string }> = {
  red: { dot: "bg-[#F87171]", ring: "border-[#F87171]/30" },
  amber: { dot: "bg-[#FBBF24]", ring: "border-[#FBBF24]/30" },
  green: { dot: "bg-[#6EE7A0]", ring: "border-[#6EE7A0]/30" },
};

/** Колокольчик с центром уведомлений: непрочитанные, переход к источнику, «прочитать всё», скрыть. */
export function NotificationBell({ className, align = "end" }: { className?: string; align?: "start" | "center" | "end" }) {
  const { t } = useTranslation();
  const { items, unread, markRead, hide, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t("overview.notifications", "Уведомления")}: ${unread}`}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#232721] bg-[#151714] text-[#C9CEC3] transition-colors hover:bg-[#1B1E1A] hover:text-[#F1F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6F24E]",
            className
          )}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F87171] px-1 text-[11px] font-bold text-[#10170A]">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="z-[60] w-[min(380px,calc(100vw-24px))] rounded-[18px] border-[#2A2E27] bg-[#151714] p-0 text-[#F1F3EE] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#232721] px-4 py-3">
          <div className="text-[15px] font-bold">
            {t("overview.notifications", "Уведомления")}
            {unread > 0 && <span className="ml-2 text-[12.5px] font-medium text-[#8D9388]">{t("notifications.unread", "новых: {{n}}", { n: unread })}</span>}
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold text-[#C6F24E] hover:bg-[#1B1E1A] disabled:text-[#4A5043] disabled:hover:bg-transparent"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t("notifications.read_all", "Прочитать все")}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="h-8 rounded-lg px-2 text-[12.5px] font-semibold text-[#8D9388] hover:bg-[#1B1E1A] hover:text-[#F1F3EE]"
              >
                {t("notifications.clear", "Очистить")}
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1B1E1A] text-[#8D9388]">
              <BellOff className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="text-sm font-semibold">{t("notifications.empty", "Всё спокойно")}</div>
            <div className="text-[12.5px] text-[#8D9388]">{t("notifications.empty_text", "Здесь появятся превышения лимитов, платежи и сроки целей.")}</div>
          </div>
        ) : (
          <ul className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto p-2" aria-label={t("overview.notifications", "Уведомления")}>
            {items.map((n) => (
              <li key={n.id} className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5", n.read ? "border-transparent opacity-70" : cn("bg-[#1A1D19]", TONE[n.tone].ring))}>
                <span aria-hidden="true" className={cn("mt-1.5 h-2.5 w-2.5 flex-none rounded-full", n.read ? "bg-[#4A5043]" : TONE[n.tone].dot)} />
                <Link
                  href={n.href}
                  onClick={() => { markRead(n.id); setOpen(false); }}
                  className="min-w-0 flex-1 text-[#F1F3EE] no-underline"
                >
                  <span className={cn("block text-[13.5px]", n.read ? "font-medium" : "font-semibold")}>{n.title}</span>
                  <span className="block text-[12.5px] text-[#A2A89C]">{n.text}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => hide(n.id)}
                  aria-label={t("overview.hide", "Скрыть")}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[#8D9388] hover:bg-[#232721] hover:text-[#F1F3EE]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
