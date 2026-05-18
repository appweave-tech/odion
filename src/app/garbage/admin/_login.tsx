'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminLogin } from '@/lib/actions/admin';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function AdminLogin() {
  const [passcode, setPasscode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await adminLogin(passcode);
      if (ok) {
        toast.success('Welcome back');
        router.refresh();
      } else {
        toast.error('Wrong passcode');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 grid gap-4 max-w-md mx-auto pt-12">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-sm text-muted-foreground">Enter the passcode to manage villas and events.</p>
      <form className="grid gap-3" onSubmit={submit}>
        <Input
          autoFocus
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
