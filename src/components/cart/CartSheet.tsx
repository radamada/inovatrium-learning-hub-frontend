'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart.store';

interface CartSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function CartSheet({ open, onClose }: CartSheetProps) {
  const { items, removeItem, totalPrice } = useCartStore();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            Coșul tău
          </SheetTitle>
          {items.length > 0 && (
            <p className="text-sm font-medium text-gray-400 text-right -mt-2.5">
              {items.length} {items.length === 1 ? 'curs' : 'cursuri'}
            </p>
          )}
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="p-5 bg-gray-50 rounded-full">
                <ShoppingCart className="w-12 h-12 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-700 mb-1">Coșul tău este gol</p>
                <p className="text-sm text-gray-400">Adaugă cursuri pentru a începe</p>
              </div>
              <Button variant="outline" size="sm" onClick={onClose} render={<Link href="/" />}>
                <BookOpen className="w-4 h-4 mr-1.5" />
                Explorează cursuri
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-blue-50 flex-shrink-0">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        sizes="96px"
                        className="object-fill"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm leading-tight line-clamp-2">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{item.instructorId?.name}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {item.price.toFixed(2)}<span className="text-xs font-semibold text-gray-400 ml-0.5">lei</span>
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item._id)}
                    className="self-center p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                    aria-label={`Elimină ${item.title} din coș`}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t bg-gray-50/50 px-5 py-4 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-gray-500">Total</span>
              <span className="text-xl font-bold text-gray-900">
                {totalPrice().toFixed(2)}<span className="text-sm font-semibold text-gray-400 ml-0.5">lei</span>
              </span>
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-semibold"
              onClick={onClose}
              render={<Link href="/checkout" />}
            >
              Finalizează comanda <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
