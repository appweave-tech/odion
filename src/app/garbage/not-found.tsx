import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GarbageNotFound() {
  return (
    <div className="p-5 grid gap-4 max-w-md mx-auto pt-12">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Not found</div>
      <h1 className="text-2xl font-semibold">We can't find that page</h1>
      <p className="text-sm text-muted-foreground">
        The villa or page you tried to open isn't here. It may have been removed,
        or the link is mistyped.
      </p>
      <Button asChild>
        <Link href="/garbage">Back to home</Link>
      </Button>
    </div>
  );
}
