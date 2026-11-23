
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   ADMIN APPOINTMENTS API

   - Administrator access only
   - Reads appointments from Neon
   - Returns customer and booking details
   - No appointment modifications
   - No payment processing
========================================= */

type AppointmentRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  services: unknown;
  total_price: string | number;
  duration_minutes: number | null;
  notes: string | null;
  inspiration_url: string | null;
  status: string;
  deposit_amount: string | number | null;
  deposit_paid_at: string | null;
  deposit_expires_at: string | null;
  confirmed_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  starts_at: string | null;
  ends_at: string | null;
};

/* =====================================
   MAIN API HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Verify the administrator's signed
  // server-side session cookie.
  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured'
      );
    }

    const sql = neon(databaseUrl);

    const result = await sql`
      SELECT
        id,
        customer_name,
        customer_email,
        customer_phone,
        appointment_date::text AS appointment_date,
        appointment_time,
        services,
        total_price,
        duration_minutes,
        notes,
        inspiration_url,
        status,
        deposit_amount,
        deposit_paid_at,
        deposit_expires_at,
        confirmed_at,
        reviewed_at,
        created_at,
        updated_at,
        starts_at,
        ends_at
      FROM appointment_requests
      ORDER BY created_at DESC
      LIMIT 100
    `;

    if (!Array.isArray(result)) {
      throw new Error(
        'Unexpected appointment database response'
      );
    }

    const rows = result as AppointmentRow[];

    const appointments = rows.map(row => {
      const totalPrice = Number(row.total_price);

      const depositAmount =
        row.deposit_amount === null
          ? null
          : Number(row.deposit_amount);

      const hasPaidDeposit =
        row.deposit_paid_at !== null;

      const depositPaid =
        hasPaidDeposit && depositAmount !== null
          ? depositAmount
          : 0;

      const balanceDue = Math.max(
        0,
        totalPrice - depositPaid
      );

      return {
        id: row.id,

        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,

        appointmentDate: row.appointment_date,
        appointmentTime: row.appointment_time,

        services: row.services,

        totalPrice,
        durationMinutes: row.duration_minutes,

        notes: row.notes,
        inspirationUrl: row.inspiration_url,

        status: row.status,

        depositAmount,
        depositPaid,
        balanceDue,

        depositPaidAt: row.deposit_paid_at,
        depositExpiresAt: row.deposit_expires_at,

        confirmedAt: row.confirmed_at,
        reviewedAt: row.reviewed_at,

        createdAt: row.created_at,
        updatedAt: row.updated_at,

        startsAt: row.starts_at,
        endsAt: row.ends_at,
      };
    });

    return res.status(200).json({
      success: true,
      appointments,
      count: appointments.length,
    });
  } catch (error) {
    console.error(
      'Admin appointments error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to load appointments.',
    });
  }
}
