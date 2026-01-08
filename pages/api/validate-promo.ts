import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

type ValidatePromoResponse =
  | {
      valid: true;
      appliedPromoCode: string;
      promotionCodeId: string;
      coupon: {
        id: string;
        name: string | null;
        duration: Stripe.Coupon.Duration | null;
        percentOff: number | null;
        amountOff: number | null;
        currency: string | null;
      };
      price: {
        priceId: string;
        unitAmount: number;
        currency: string;
        interval: string | null;
      };
      pricing: {
        unitAmountOriginal: number;
        unitAmountDiscounted: number;
        discountAmount: number;
      };
    }
  | {
      valid: false;
      message: string;
    };

const clampNonNegativeInt = (n: number) => (n < 0 ? 0 : Math.round(n));

export default async function handler(req: NextApiRequest, res: NextApiResponse<ValidatePromoResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  try {
    const { promoCode, priceId } = req.body as { promoCode?: string; priceId?: string };

    if (!promoCode || typeof promoCode !== 'string' || !promoCode.trim()) {
      return res.status(400).json({ valid: false, message: 'Promotion code is required' });
    }
    if (!priceId || typeof priceId !== 'string' || !priceId.trim()) {
      return res.status(400).json({ valid: false, message: 'priceId is required' });
    }

    const normalized = promoCode.trim();

    const promoList = await stripe.promotionCodes.list({
      code: normalized,
      active: true,
      limit: 1,
    });

    const promo = promoList.data[0];
    if (!promo) {
      return res.status(200).json({ valid: false, message: 'Invalid or inactive promotion code.' });
    }

    const price = await stripe.prices.retrieve(priceId);
    if (!price.unit_amount || !price.currency) {
      return res.status(400).json({ valid: false, message: 'Invalid price configuration.' });
    }

    const coupon = promo.coupon;
    const unitAmountOriginal = price.unit_amount;

    let unitAmountDiscounted = unitAmountOriginal;

    if (typeof coupon.percent_off === 'number') {
      const pct = coupon.percent_off;
      unitAmountDiscounted = clampNonNegativeInt(unitAmountOriginal * (1 - pct / 100));
    } else if (typeof coupon.amount_off === 'number') {
      // Stripe coupons in live mode are generally currency-specific; only apply if currency matches.
      if (coupon.currency && coupon.currency !== price.currency) {
        return res.status(200).json({
          valid: false,
          message: `This promotion code is not valid for ${price.currency.toUpperCase()} pricing.`,
        });
      }
      unitAmountDiscounted = clampNonNegativeInt(unitAmountOriginal - coupon.amount_off);
    }

    const discountAmount = clampNonNegativeInt(unitAmountOriginal - unitAmountDiscounted);

    return res.status(200).json({
      valid: true,
      appliedPromoCode: promo.code ?? normalized,
      promotionCodeId: promo.id,
      coupon: {
        id: coupon.id,
        name: coupon.name ?? null,
        duration: coupon.duration ?? null,
        percentOff: typeof coupon.percent_off === 'number' ? coupon.percent_off : null,
        amountOff: typeof coupon.amount_off === 'number' ? coupon.amount_off : null,
        currency: coupon.currency ?? null,
      },
      price: {
        priceId: price.id,
        unitAmount: unitAmountOriginal,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
      },
      pricing: {
        unitAmountOriginal,
        unitAmountDiscounted,
        discountAmount,
      },
    });
  } catch (err: any) {
    console.error('[ERROR] validate-promo failed:', err?.message ?? err);
    return res.status(500).json({ valid: false, message: 'Failed to validate promotion code.' });
  }
}

