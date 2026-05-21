'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetPortal = Dialog.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
    title?: string;
    description?: string;
  }
>(({ className, children, title, description, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border-t bg-background shadow-xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        'pb-[env(safe-area-inset-bottom)]',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
      {title ? (
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <SheetClose className="rounded-full p-2 hover:bg-accent" aria-label="Close">
            <X className="size-5" />
          </SheetClose>
        </div>
      ) : null}
      {/* Description is announced by screen readers but not visually shown
          unless callers want it. Sheets without a meaningful description
          still get a non-duplicate SR-only label. */}
      <Dialog.Description className="sr-only">
        {description ?? title ?? 'Sheet content'}
      </Dialog.Description>
      <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
    </Dialog.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';
