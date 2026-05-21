'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Lightweight confirm modal — replaces window.confirm() for destructive
// actions inside the PWA shell. Built on the already-installed Radix Dialog
// so we don't pull in @radix-ui/react-alert-dialog.

type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

type ConfirmCtx = (opts: ConfirmOptions) => void;

const ConfirmContext = React.createContext<ConfirmCtx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = React.useState(false);

  const confirm = React.useCallback<ConfirmCtx>((o) => setOpts(o), []);

  async function handleConfirm() {
    if (!opts) return;
    setBusy(true);
    try {
      await opts.onConfirm();
      setOpts(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog.Root
        open={!!opts}
        onOpenChange={(o) => {
          if (!o && !busy) setOpts(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-[calc(100vw-2rem)] max-w-md rounded-2xl border bg-background p-5 shadow-xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            )}
          >
            {opts && (
              <div className="grid gap-3">
                <Dialog.Title className="text-lg font-semibold">{opts.title}</Dialog.Title>
                {opts.description && (
                  <Dialog.Description className="text-sm text-muted-foreground">
                    {opts.description}
                  </Dialog.Description>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpts(null)}
                    disabled={busy}
                  >
                    {opts.cancelLabel ?? 'Cancel'}
                  </Button>
                  <Button
                    variant={opts.destructive ? 'destructive' : 'default'}
                    onClick={handleConfirm}
                    disabled={busy}
                  >
                    {busy ? '…' : (opts.confirmLabel ?? 'Confirm')}
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmCtx {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
