'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function CartSheet({ open, onClose }: CartSheetProps) {
  const { items, removeItem, totalPrice } = useCartStore();
  const { user } = useAuthStore();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-600" />
            Coșul tău ({items.length})
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p>Coșul tău este gol</p>
              <Button variant="outline" size="sm" onClick={onClose} render={<Link href="/" />}>
                Explorează cursuri
              </Button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item._id} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-indigo-100 flex-shrink-0">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-200" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.instructorId?.name}</p>
                  <p className="text-indigo-600 font-bold mt-1">
                    {item.price.toFixed(2)} lei
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item._id)}
                  className="text-gray-400 hover:text-red-500 transition focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 rounded"
                  aria-label={`Elimină ${item.title} din coș`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-indigo-700">{totalPrice().toFixed(2)} lei</span>
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={onClose}
              render={<Link href="/checkout" />}
            >
              Finalizează comanda <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
