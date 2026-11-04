"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionType } from "@/types";

interface AddTransactionDialogProps {
  defaultType?: TransactionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function AddTransactionDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || <button type="button">Новая операция</button>}
        </DialogTrigger>
      )}
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[464px] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-none [&>button:last-child]:hidden"
      >
        <iframe
          ref={frameRef}
          title="Новая операция"
          src="/new-operation-prototype.html"
          onLoad={() => {
            const document = frameRef.current?.contentDocument;
            if (!document) return;
            document.querySelector<HTMLButtonElement>(".x")?.addEventListener("click", () => setOpen(false));
            document.querySelector<HTMLButtonElement>(".cancel")?.addEventListener("click", () => setOpen(false));
          }}
          className="block h-[min(900px,calc(100dvh-1.5rem))] w-full border-0"
        />
      </DialogContent>
    </Dialog>
  );
}
