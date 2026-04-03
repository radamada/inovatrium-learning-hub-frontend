'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'destructive' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'destructive',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClass =
    confirmVariant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-red-600 hover:bg-red-700 text-white';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={confirmClass}
          >
            {loading ? 'Se procesează...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
