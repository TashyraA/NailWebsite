
import { timingSafeEqual } from 'node:crypto';
import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';
import { neon } from '@neondatabase/serverless';
import { processPaymentNotification } from './_payment-notifications.js';

/* =========================================
   INLOVENAILZ BY BRIANA
   PROTECTED PAYMENT NOTIFICATION PROCESSOR

   - Requires CRON_SECRET authorization
   - Flags expired processing claims
   - Processes pending email notifications
   - Never automatically retries uncertain sends
   - Does not change appointment payments
   - Does not expose customer information
========================================= */

const BATCH_SIZE = 10;

type NotificationJob = {
  id: string;
};

type ProcessingResult = {
  success: boolean;
  status: string;
};

/* =====================================
   VERIFY CRON SECRET
===================================== */

function isAuthorized(
  req: IncomingMessage
): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const authorization =
    req.headers.authorization;

  if (
    typeof authorization !== 'string' ||
    !authorization.startsWith('Bearer ')
  ) {
    return false;
  }

  const suppliedSecret =
    authorization.slice('Bearer '.length);

  const expected = Buffer.from(secret);
  const received = Buffer.from(suppliedSecret);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

/* =====================================
   API HANDLER
===================================== */

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (
    req.method !== 'GET' &&
    req.method !== 'POST'
  ) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.end(
      JSON.stringify({
        error: 'Method not allowed',
      })
    );
    return;
  }

  if (!isAuthorized(req)) {
    res.statusCode = 401;
    res.end(
      JSON.stringify({
        error: 'Unauthorized',
      })
    );
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error(
      'Notification processor: DATABASE_URL missing'
    );

    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: 'Processor configuration error',
      })
    );
    return;
  }

  try {
    const sql = neon(databaseUrl);

    /* =====================================
       FLAG STALLED NOTIFICATIONS

       These are NOT automatically retried.
       They require manual review.
    ===================================== */

    const recoveryRows = await sql`
      SELECT
        public.flag_stalled_salon_notifications()
          AS flagged_count
    `;

    const stalledFlagged = Number(
      recoveryRows[0]?.flagged_count ?? 0
    );

    /* =====================================
       FETCH PENDING JOBS
    ===================================== */

    const jobs = (await sql`
      SELECT id
      FROM public.salon_payment_notifications
      WHERE status = 'pending'
        AND claim_id IS NULL
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
    `) as NotificationJob[];

    let sent = 0;
    let needsReview = 0;
    let skipped = 0;
    let errors = 0;

    /* =====================================
       PROCESS JOBS SEQUENTIALLY
    ===================================== */

    for (const job of jobs) {
      try {
        const result: ProcessingResult =
          await processPaymentNotification(
            job.id
          );

        if (
          result.success &&
          result.status === 'sent'
        ) {
          sent += 1;
        } else if (
          result.status === 'needs_review'
        ) {
          needsReview += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        errors += 1;

        console.error(
          'Notification processing error:',
          job.id,
          error instanceof Error
            ? error.message
            : 'Unknown error'
        );
      }
    }

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        received: true,
        processed: jobs.length,
        sent,
        needs_review: needsReview,
        skipped,
        errors,
        stalled_flagged: stalledFlagged,
      })
    );
  } catch (error) {
    console.error(
      'Notification processor failed:',
      error instanceof Error
        ? error.message
        : 'Unknown error'
    );

    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: 'Unable to process notifications',
      })
    );
  }
}
