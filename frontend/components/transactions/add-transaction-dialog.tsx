"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { TransactionType } from "@/types";

interface AddTransactionDialogProps {
  defaultType?: TransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function AddTransactionDialog({
  defaultType = "expense",
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameVersion, setFrameVersion] = useState(0);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const { accounts, addTransaction } = useStore();

  const setFrameMessage = (document: Document, message: string, bad = true) => {
    const note = document.querySelector<HTMLElement>("#note");
    if (!note) return;
    note.textContent = message;
    note.className = bad ? "note bad" : "note";
    note.setAttribute("role", bad ? "alert" : "status");
    note.setAttribute("aria-live", bad ? "assertive" : "polite");
  };

  const syncCurrencySymbol = (document: Document, currency: string) => {
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", RUB: "₽" };
    const symbol = document.querySelector<HTMLElement>("#sym");
    if (symbol) symbol.textContent = symbols[currency] || currency;
  };

  const onFrameLoad = () => {
    const frame = frameRef.current;
    const document = frame?.contentDocument;
    const frameWindow = frame?.contentWindow as (Window & { save?: () => void; C?: Record<string, Record<string, string[]>>; tags?: string[]; ci?: number; off?: number; rTags?: () => void }) | null;
    if (!document || !frameWindow) return;

    document.querySelector<HTMLButtonElement>(".x")?.addEventListener("click", () => setOpen(false));
    document.querySelector<HTMLButtonElement>(".cancel")?.addEventListener("click", () => setOpen(false));

    const accountSelect = document.querySelector<HTMLSelectElement>("#acc");
    if (accountSelect) {
      accountSelect.replaceChildren(new Option("Выберите", ""));
      for (const account of accounts) {
        const option = new Option(`${account.name} (${account.currency})`, String(account.id));
        option.dataset.b = String(account.balance);
        accountSelect.append(option);
      }
      accountSelect.addEventListener("change", () => {
        const account = accounts.find((item) => item.id === Number(accountSelect.value));
        if (account) syncCurrencySymbol(document, account.currency);
      });
    }

    if (frameWindow.C) {
      frameWindow.C.transfer = Object.fromEntries(accounts
        .filter((account) => account.type !== "brokerage" || accounts.length === 1)
        .map((account) => [account.name, []]));
    }

    const typeTab = document.querySelector<HTMLButtonElement>(`#tabs [data-t="${defaultType}"]`);
    typeTab?.click();

    const originalSave = document.querySelector<HTMLButtonElement>("#save");
    if (!originalSave) return;
    const saveButton = originalSave.cloneNode(true) as HTMLButtonElement;
    originalSave.replaceWith(saveButton);
    const amountInput = document.querySelector<HTMLInputElement>("#amt");
    document.querySelector<HTMLElement>("#note")?.setAttribute("role", "status");
    let saving = false;
    const saveTransaction = async () => {
      if (saving) return;
      const amount = Number((amountInput?.value || "").replace(",", "."));
      const selectedAccount = accounts.find((account) => account.id === Number(accountSelect?.value));
      const selectedType = document.querySelector<HTMLButtonElement>("#tabs button[aria-selected='true']")?.dataset.t as "expense" | "income" | "transfer" | undefined;
      const selectedCategory = document.querySelector<HTMLButtonElement>("#cats button[aria-pressed='true']")?.textContent?.trim();
      const selectedSubcategory = document.querySelector<HTMLButtonElement>("#subs button[aria-pressed='true']")?.textContent?.trim();
      const selectedDestination = selectedType === "transfer" ? accounts.find((account) => account.name === selectedCategory) : undefined;
      const symbol = document.querySelector<HTMLElement>("#sym")?.textContent || "$";
      const currencyBySymbol: Record<string, string> = { "$": "USD", "€": "EUR", "£": "GBP", "₽": "RUB" };
      const operationCurrency = currencyBySymbol[symbol] || selectedAccount?.currency;
      const dateOffset = Number(document.querySelector<HTMLButtonElement>("#dates .pill[aria-pressed='true']")?.dataset.d || 0);
      const operationDate = new Date();
      operationDate.setDate(operationDate.getDate() - dateOffset);
      const description = document.querySelector<HTMLInputElement>("#more .in")?.value || undefined;
      const tags = Array.from(document.querySelectorAll<HTMLElement>("#tags .tag"))
        .map((tag) => tag.textContent?.replace("×", "").trim())
        .filter((tag): tag is string => Boolean(tag));
      const recurring = document.querySelector<HTMLElement>("#swRec")?.getAttribute("aria-checked") === "true";
      const mandatory = document.querySelector<HTMLElement>("#swMan")?.getAttribute("aria-checked") === "true";

      if (!amount || !selectedAccount || !selectedType || !selectedCategory) {
        setFrameMessage(document, "Заполните сумму, счёт и категорию.");
        return;
      }
      if (selectedType === "transfer" && !selectedDestination) {
        setFrameMessage(document, "Выберите счёт назначения.");
        return;
      }
      if (!operationCurrency || operationCurrency !== selectedAccount.currency) {
        setFrameMessage(document, `Валюта операции должна совпадать с валютой счёта: ${selectedAccount.currency}.`);
        return;
      }

      saving = true;
      saveButton.disabled = true;
      setFrameMessage(document, "Сохраняем…", false);
      try {
        await addTransaction({
          amount,
          type: selectedType,
          currency: selectedAccount.currency,
          accountId: selectedAccount.id,
          toAccountId: selectedDestination?.id,
          category: selectedSubcategory ? `${selectedCategory} / ${selectedSubcategory}` : selectedCategory,
          date: operationDate.toISOString(),
          description,
          tags: tags.length ? tags : undefined,
          isRecurring: recurring || mandatory,
          status: "completed",
        });
        frameWindow.save?.();
        document.querySelector<HTMLButtonElement>("#again")?.focus();
      } catch (error) {
        saving = false;
        saveButton.disabled = false;
        setFrameMessage(document, error instanceof Error ? error.message : "Не удалось сохранить операцию.");
      }
    };
    saveButton.addEventListener("click", () => void saveTransaction());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target === amountInput) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void saveTransaction();
      }
    }, true);
    document.querySelector<HTMLButtonElement>("#again")?.addEventListener("click", () => {
      saving = false;
      saveButton.disabled = false;
      if (amountInput) amountInput.value = "";
      if (accountSelect) accountSelect.value = "";
      const description = document.querySelector<HTMLInputElement>("#more .in");
      if (description) description.value = "";
      if (frameWindow) {
        frameWindow.tags = [];
        frameWindow.rTags?.();
        frameWindow.ci = 0;
        frameWindow.off = 0;
      }
      syncCurrencySymbol(document, "USD");
      document.querySelectorAll<HTMLButtonElement>("#dates .pill").forEach((button, index) => button.setAttribute("aria-pressed", String(index === 0)));
      ["#swRec", "#swMan"].forEach((id) => document.querySelector<HTMLElement>(id)?.setAttribute("aria-checked", "false"));
      document.querySelector<HTMLElement>("#more")?.classList.remove("open");
      const moreButton = document.querySelector<HTMLButtonElement>("#moreBtn");
      if (moreButton) moreButton.textContent = "＋ Описание и метки";
      document.querySelector<HTMLElement>("#recS")?.style.setProperty("display", "none");
      amountInput?.focus();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (value) setFrameVersion((version) => version + 1);
      setOpen(value);
    }}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || <button type="button">Новая операция</button>}
        </DialogTrigger>
      )}
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[464px] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-none [&>button:last-child]:hidden"
      >
        <VisuallyHidden><DialogTitle>Новая операция</DialogTitle></VisuallyHidden>
        <iframe
          ref={frameRef}
          title="Новая операция"
          src={`/new-operation-prototype.html?v=${frameVersion}`}
          onLoad={onFrameLoad}
          className="block h-[min(900px,calc(100dvh-1.5rem))] w-full border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
