'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Check, MessageSquareShare } from 'lucide-react';

export function CopyWhatsApp({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied — paste into WhatsApp group');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy');
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <div className="grid gap-2">
      <pre className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 text-sm font-mono">{text}</pre>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={copy} variant="outline">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button asChild>
          <a href={waUrl} target="_blank" rel="noreferrer">
            <MessageSquareShare className="size-4" /> Share
          </a>
        </Button>
      </div>
    </div>
  );
}
