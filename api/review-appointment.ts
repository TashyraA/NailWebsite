
import { createHash, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   SECURE APPOINTMENT REVIEW API

   STEP 1: READ-ONLY REVIEW

   - Requires administrator login
   - Verifies private review token
   - Checks review link expiration
   - Retrieves appointment from Neon
   - Does not change appointment status
   - Does not process payments
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
  created_at: string;
  reviewed_at: string | null;
  review_token_hash: string | null;
  review_token_expires_at: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

/* =====================================
   VERIFY PRIVATE REVIEW TOKEN
===================================== */

function verifyReviewToken(
  suppliedToken: string,
  storedHash: string | null
): boolean {
  if (
    !TOKEN_PATTERN.test(suppliedToken) ||
    !storedHash ||
    !TOKEN_PATTERN.test(storedHash)
  ) {
    return false;
  }

  const suppliedHash = createHash('sha256')
    .update(suppliedToken)
    .digest();

  const expectedHash = Buffer.from(
    storedHash,
    'hex'
  );

  if (
    suppliedHash.length !== expectedHash.length
  ) {
    return false;
  }

  return timingSafeEqual(
    suppliedHash,
    expectedHash
  );
}

/* =====================================
   MAIN REVIEW HANDLER
===================================== */

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Briana must be logged in to view
  // private appointment information.
  if (!requireAdmin(req, res)) {
    return;
  }

  const id = req.query?.id;
  const token = req.query?.token;

  if (
    typeof id !== 'string' ||
    !UUID_PATTERN.test(id) ||
    typeof token !== 'string' ||
    !TOKEN_PATTERN.test(token)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid appointment review link.',
    });
  }

  try {
    const databaseUrl =
      process.env.DATABASE_URL;

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
        created_at,
        reviewed_at,
        review_token_hash,
        review_token_expires_at
      FROM appointment_requests
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    if (
      !Array.isArray(result) ||
      result.length === 0
    ) {
      return res.status(404).json({
        success: false,
        error: 'Appointment request not found.',
      });
    }

    const appointment =
      result[0] as AppointmentRow;

    if (
      !verifyReviewToken(
        token,
        appointment.review_token_hash
      )
    ) {
      return res.status(403).json({
        success: false,
        error: 'Invalid appointment review link.',
      });
    }

    const expiresAt =
      appointment.review_token_expires_at;

    if (
      !expiresAt ||
      !Number.isFinite(
        new Date(expiresAt).getTime()
      ) ||
      new Date(expiresAt).getTime() <= Date.now()
    ) {
      return res.status(410).json({
        success: false,
        error: 'This appointment review link has expired.',
      });
    }

    // Return only the fields Briana needs.
    // Never expose stored token hashes.
    return res.status(200).json({
      success: true,
      appointment: {
        id: appointment.id,
        customerName: appointment.customer_name,
        customerEmail: appointment.customer_email,
        customerPhone: appointment.customer_phone,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        services: appointment.services,
        totalPrice: Number(
          appointment.total_price
        ),
        durationMinutes:
          appointment.duration_minutes,
        notes: appointment.notes,
        inspirationUrl:
          appointment.inspiration_url,
        status: appointment.status,
        depositAmount:
          appointment.deposit_amount === null
            ? null
            : Number(appointment.deposit_amount),
        createdAt: appointment.created_at,
        reviewedAt: appointment.reviewed_at,
      },
    });
  } catch (error) {
    console.error(
      'Appointment review error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to load appointment request.',
    });
  }
}
