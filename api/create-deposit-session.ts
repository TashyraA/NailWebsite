/* =========================================
   INLOVENAILZ BY BRIANA
   RETIRED DIRECT DEPOSIT CHECKOUT

   New appointments must be requested through
   /api/request-appointment and approved by
   an administrator before deposit checkout.

   Retain this endpoint to reject outdated
   clients safely. Existing Stripe sessions
   and legacy webhook handlers are unchanged.
========================================= */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  return res.status(410).json({
    success: false,
    code: 'DIRECT_DEPOSIT_RETIRED',
    error: 'Please submit an appointment request first. Briana will email your deposit payment link after approval.',
  });
}
