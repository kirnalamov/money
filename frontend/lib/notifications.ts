"use client";

import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/lib/store";
import { usePref } from "@/lib/prefs";
import { fmtMoney, MINUS } from "@/lib/plutus-format";
import { limitDetail, limitTransactions, periodWindow } from "@/lib/limit-detail";

export type NotificationTone = "red" | "amber" | "green";

export interface AppNotification {
  id: string;
  title: string;
  text: string;
  href: string;
  tone: NotificationTone;
  read: boolean;
}

type State = Record<string, "read" | "hidden">;
const KEY = "plutus-notifications" as const;
const DAY = 86400000;

/**
 * Уведомления вычисляются из данных пользователя:
 *  - лимиты: превышение и приближение к лимиту (80%) — с учётом переключателей на странице «Лимиты»;
 *  - счета в минусе;
 *  - обязательные платежи: ближайшие и просроченные;
 *  - цели: срок скоро и цель достигнута.
 * Статусы «прочитано» и «скрыто» хранятся в настройках аккаунта на сервере.
 */
export function useNotifications() {
  const { t } = useTranslation();
  const { accounts, transactions, limits, goals, recurringExpenses, defaultCurrency } = useStore();
  const [state, updateState] = usePref<State>(KEY, {});
  const [toggles] = usePref<Record<string, boolean>>("plutus-limit-toggles", {});

  const all = useMemo(() => {
    const now = new Date();
    const out: Omit<AppNotification, "read">[] = [];
    const ym = `${now.getFullYear()}-${now.getMonth() + 1}`;

    for (const l of limits) {
      const win = periodWindow(l.period, now);
      const d = limitDetail(l.amount, limitTransactions(l, transactions, win, now), win);
      const stamp = win.start.toISOString().slice(0, 10);
      if (d.status === "over" && toggles[`${l.id}_nOver`] !== false) {
        out.push({
          id: `lim-over-${l.id}-${stamp}`,
          title: t("notifications.limit_over", "Лимит «{{category}}» превышен", { category: l.category }),
          text: t("notifications.limit_over_text", "На {{amount}} ({{pct}}% от лимита)", { amount: fmtMoney(d.spent - l.amount, l.currency), pct: Math.round(d.pct) }),
          href: "/limits",
          tone: "red",
        });
      } else if (d.status === "warn" && toggles[`${l.id}_n80`] !== false) {
        out.push({
          id: `lim-warn-${l.id}-${stamp}`,
          title: t("notifications.limit_warn", "Лимит «{{category}}» почти исчерпан", { category: l.category }),
          text: t("notifications.limit_warn_text", "Потрачено {{pct}}%, осталось {{left}}", { pct: Math.round(d.pct), left: fmtMoney(Math.max(l.amount - d.spent, 0), l.currency) }),
          href: "/limits",
          tone: "amber",
        });
      }
    }

    for (const a of accounts) {
      if (a.balance < 0) {
        out.push({
          id: `neg-${a.id}`,
          title: t("notifications.negative", "{{name}} в минусе", { name: a.name }),
          text: `${MINUS}${fmtMoney(Math.abs(a.balance), a.currency)}: ${t("notifications.negative_text", "пополните счёт или проверьте операции")}`,
          href: "/accounts",
          tone: "red",
        });
      }
    }

    const today = now.getDate();
    for (const e of recurringExpenses) {
      const paid = e.lastPaidDate ? new Date(e.lastPaidDate) : null;
      if (paid && paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth()) continue;
      const overdue = e.dueDay < today;
      const soon = !overdue && e.dueDay - today <= 3;
      if (!overdue && !soon) continue;
      out.push({
        id: `pay-${e.id}-${ym}`,
        title: t("notifications.payment", "Платёж «{{name}}»: {{amount}}", { name: e.name, amount: fmtMoney(e.amount, e.currency) }),
        text: overdue
          ? t("notifications.payment_overdue", "Срок оплаты был {{day}} числа — отметьте платёж оплаченным", { day: e.dueDay })
          : e.dueDay === today
            ? t("notifications.payment_today", "Нужно оплатить сегодня")
            : t("notifications.payment_soon", "Нужно оплатить до {{day}} числа", { day: e.dueDay }),
        href: "/#payments",
        tone: overdue ? "red" : "amber",
      });
    }

    for (const g of goals) {
      if (g.targetAmount > 0 && g.currentAmount >= g.targetAmount) {
        out.push({
          id: `goal-done-${g.id}`,
          title: t("notifications.goal_done", "Цель «{{name}}» достигнута", { name: g.name }),
          text: t("notifications.goal_done_text", "Накоплено {{amount}}", { amount: fmtMoney(g.currentAmount, g.currency) }),
          href: "/savings",
          tone: "green",
        });
      } else if (g.deadline) {
        const left = Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / DAY);
        if (left >= 0 && left <= 30) {
          out.push({
            id: `goal-due-${g.id}`,
            title: t("notifications.goal_due", "Цель «{{name}}»: срок через {{n}} дн.", { name: g.name, n: left }),
            text: t("notifications.goal_due_text", "Осталось накопить {{amount}}", { amount: fmtMoney(Math.max(g.targetAmount - g.currentAmount, 0), g.currency) }),
            href: "/savings",
            tone: left <= 7 ? "red" : "amber",
          });
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limits, transactions, accounts, goals, recurringExpenses, toggles, defaultCurrency, t]);

  const items: AppNotification[] = useMemo(
    () => all.filter((n) => state[n.id] !== "hidden").map((n) => ({ ...n, read: state[n.id] === "read" })),
    [all, state]
  );
  const unread = items.filter((n) => !n.read).length;

  // в хранилище остаются только статусы актуальных уведомлений (старые периоды отбрасываются)
  const write = useCallback(
    (patch: State) => {
      const ids = new Set(all.map((n) => n.id));
      updateState((prev) => {
        const next: State = {};
        for (const [id, v] of Object.entries({ ...prev, ...patch })) if (ids.has(id)) next[id] = v;
        return next;
      });
    },
    [all, updateState]
  );

  const markRead = useCallback((id: string) => write({ [id]: "read" }), [write]);
  const hide = useCallback((id: string) => write({ [id]: "hidden" }), [write]);
  const markAllRead = useCallback(() => {
    const patch: State = {};
    for (const n of items) if (!n.read) patch[n.id] = "read";
    write(patch);
  }, [items, write]);
  const clearAll = useCallback(() => {
    const patch: State = {};
    for (const n of items) patch[n.id] = "hidden";
    write(patch);
  }, [items, write]);

  return { items, unread, markRead, hide, markAllRead, clearAll };
}
