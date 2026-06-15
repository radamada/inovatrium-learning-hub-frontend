'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Lock, FlaskConical, Tag, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { useWishlistStore } from '@/stores/wishlist.store';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
// Avoid calling loadStripe('') — it silently yields a blank PaymentElement.
// When the key is missing we keep the promise null and surface an error in the UI.
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function CheckoutForm({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?order=${orderId}`,
        },
      });

      if (error) {
        toast.error(error.message ?? 'Eroare la procesarea plății');
        setIsProcessing(false);
      }
    } catch {
      toast.error('Eroare la procesarea plății. Încearcă din nou.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-base font-semibold"
      >
        <Lock className="w-4 h-4 mr-2" />
        {isProcessing ? 'Se procesează...' : 'Plătește acum'}
      </Button>
      <p className="text-xs text-gray-400 text-center">
        Plată securizată prin Stripe. Datele cardului nu sunt stocate pe serverele noastre.
      </p>
    </form>
  );
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
  finalTotal: number;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  scopeLabel?: string; // e.g. "curs specific" sau "instructor X"
}

export default function CheckoutPage() {
  const { user, isHydrated } = useAuthStore();
  const { items, totalPrice, fetchCart } = useCartStore();
  const fetchWishlist = useWishlistStore((s) => s.fetch);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isFakePaying, setIsFakePaying] = useState(false);
  const [orderReady, setOrderReady] = useState(false);
  // Refs for true in-flight guards — state updates are async, refs are sync.
  const creatingOrderRef = useRef(false);
  const fakePayingRef = useRef(false);
  // Guards the one-shot cart fetch so it runs once per mount regardless of how
  // many times `user`/`isHydrated` toggle — lets us keep an exhaustive dep array
  // without re-fetching on every render-triggering store update.
  const cartFetchStartedRef = useRef(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) { router.push('/login?from=/checkout'); return; }
    // Fetch the cart exactly once per mount. The ref guard means we can list all
    // referenced values in the dep array without triggering repeated fetches.
    if (cartFetchStartedRef.current) return;
    cartFetchStartedRef.current = true;
    fetchCart().then(() => setIsLoadingCart(false));
  }, [user, isHydrated, fetchCart, router]);

  useEffect(() => {
    if (isLoadingCart) return;
    const currentItems = useCartStore.getState().items;
    if (currentItems.length === 0) {
      toast.info('Coșul tău este gol.');
      router.push('/');
    }
  }, [isLoadingCart, router]);

  const subtotal = totalPrice();
  const finalTotal = appliedCoupon ? appliedCoupon.finalTotal : subtotal;

  const handleValidateCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;

    setIsValidatingCoupon(true);
    try {
      const { data } = await api.get(`/coupons/validate/${encodeURIComponent(code)}`, {
        params: { total: subtotal },
      });
      let discountAmount = data.discountAmount;
      let scopeLabel: string | undefined;

      if (data.courseId) {
        // Course-scoped: reduce doar prețul cursului respectiv
        const course = items.find((item) => item._id === data.courseId);
        const coursePrice = course?.price ?? 0;
        if (data.discountType === 'percent') {
          discountAmount = Math.round(coursePrice * data.discountValue / 100 * 100) / 100;
        } else {
          discountAmount = Math.min(data.discountValue, coursePrice);
        }
        scopeLabel = course ? `curs: ${course.title}` : 'curs specific';
      } else if (data.instructorId) {
        // Instructor-scoped: reduce doar cursurile instructorului
        const instructorSubtotal = items
          .filter((item) => {
            const instId = (item.instructorId as any)?._id ?? item.instructorId;
            return instId?.toString() === data.instructorId;
          })
          .reduce((sum: number, item: any) => sum + item.price, 0);
        if (data.discountType === 'percent') {
          discountAmount = Math.round(instructorSubtotal * data.discountValue / 100 * 100) / 100;
        } else {
          discountAmount = Math.min(data.discountValue, instructorSubtotal);
        }
      }

      setAppliedCoupon({
        code: data.code,
        discountAmount,
        finalTotal: Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100),
        discountType: data.discountType,
        discountValue: data.discountValue,
        scopeLabel,
      });
      setCouponInput('');
      const label = data.discountType === 'percent'
        ? `${data.discountValue}%`
        : `${data.discountValue.toFixed(2)} lei`;
      toast.success(`Cupon aplicat! Reducere de ${label}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Cod de reducere invalid');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  const handleCreateOrder = async () => {
    if (creatingOrderRef.current) return;
    creatingOrderRef.current = true;
    setIsCreatingOrder(true);
    try {
      const { data } = await api.post('/orders', {
        couponCode: appliedCoupon?.code ?? undefined,
      });
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setOrderReady(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la crearea comenzii');
    } finally {
      creatingOrderRef.current = false;
      setIsCreatingOrder(false);
    }
  };

  const handleFakePay = async () => {
    if (fakePayingRef.current) return;
    fakePayingRef.current = true;
    setIsFakePaying(true);
    try {
      await api.post('/orders/fake-pay', {
        couponCode: appliedCoupon?.code ?? undefined,
      });
      await fetchCart();
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      await fetchWishlist();
      // No toast here — the dashboard shows the success toast after redirect.
      // Showing one in both places stacks two toasts on top of each other.
      router.push('/dashboard?success=1');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Eroare la plata simulată');
      fakePayingRef.current = false;
      setIsFakePaying(false);
    }
  };

  const handleSuccess = async () => {
    await fetchCart();
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    await fetchWishlist();
    router.push('/dashboard?success=1');
  };

  if (isLoadingCart) {
    return (
      <div className="max-w-4xl 3xl:max-w-[1100px] mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl 3xl:max-w-[1100px] mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <ShoppingCart className="text-blue-600" /> Finalizare comandă
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Payment section */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-bold text-lg mb-4">Informații plată</h2>

          {!orderReady ? (
            <div className="space-y-4">
              {/* MOD TESTARE — disponibil doar local (NODE_ENV=development).
                  Next.js inline-uiește condiția la build, deci în bundle-ul
                  de production blocul JSX e eliminat complet (dead-code
                  elimination). Backend-ul respinge oricum /orders/fake-pay
                  în non-development (defense-in-depth). */}
              {process.env.NODE_ENV === 'development' && (
                <>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-semibold mb-2 flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5" /> MOD TESTARE
                    </p>
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={handleFakePay}
                      disabled={isFakePaying}
                    >
                      {isFakePaying ? 'Se procesează...' : 'Plătește (Test) — fără card'}
                    </Button>
                    <p className="text-xs text-amber-600 mt-2">
                      Simulează o plată reușită instant, fără Stripe.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs text-gray-400">
                      <span className="bg-white px-2">sau plătește cu cardul</span>
                    </div>
                  </div>
                </>
              )}

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-base font-semibold"
                onClick={handleCreateOrder}
                disabled={isCreatingOrder}
              >
                <Lock className="w-4 h-4 mr-2" />
                {isCreatingOrder ? 'Se pregătește...' : `Continuă spre plată — ${finalTotal.toFixed(2)} lei`}
              </Button>
            </div>
          ) : (
            <>
              {!stripePromise ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  Plata cu cardul nu este disponibilă momentan (configurare Stripe lipsă).
                  Te rugăm să încerci din nou mai târziu sau să contactezi suportul.
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm orderId={orderId} onSuccess={handleSuccess} />
                </Elements>
              ) : (
                <p className="text-gray-400 text-sm text-center">Se încarcă opțiunea de plată cu cardul...</p>
              )}
            </>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 h-fit space-y-4">
          <h2 className="font-bold text-lg">Rezumat comandă</h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.instructorId?.name}</p>
                </div>
                <span className="font-semibold text-emerald-700 text-sm">
                  {item.price.toFixed(2)} lei
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Coupon input */}
          {!orderReady && (
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-green-700 text-sm flex-wrap">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span className="font-semibold">{appliedCoupon.code}</span>
                    <span className="text-green-600">
                      -{appliedCoupon.discountAmount.toFixed(2)} lei
                    </span>
                    {appliedCoupon.scopeLabel && (
                      <span className="text-xs text-green-500 italic">({appliedCoupon.scopeLabel})</span>
                    )}
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Elimină cuponul"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                      placeholder="Cod de reducere"
                      className="pl-9 uppercase"
                      maxLength={50}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleValidateCoupon}
                    disabled={!couponInput.trim() || isValidatingCoupon}
                  >
                    {isValidatingCoupon ? '...' : 'Aplică'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1">
            {appliedCoupon && (
              <>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} lei</span>
                </div>
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Reducere ({appliedCoupon.code}):</span>
                  <span>-{appliedCoupon.discountAmount.toFixed(2)} lei</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-lg font-bold pt-1">
              <span>Total:</span>
              <span className="text-emerald-700">{finalTotal.toFixed(2)} lei</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
