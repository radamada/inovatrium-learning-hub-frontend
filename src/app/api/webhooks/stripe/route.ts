/**
 * Stripe webhook forwarding route
 * In production, Stripe should call the NestJS backend directly.
 * This route exists as a fallback for dev/testing.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Forward to NestJS backend
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const response = await fetch(`${apiUrl}/api/orders/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
    body,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
