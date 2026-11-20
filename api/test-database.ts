
import { neon } from '@neondatabase/serverless';

/* =========================================
   INLOVENAILZ BY BRIANA
   TEMPORARY DATABASE CONNECTION TEST

   Read-only database check.
   Remove after testing.
========================================= */

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  res.setHeader('Cache-Control', 'no-store');

  const testSecret = process.env.DATABASE_TEST_SECRET;

  if (!testSecret) {
    return res.status(404).json({
      error: 'Not found',
    });
  }

  const providedSecret = req.headers['x-database-test-secret'];

  if (
    typeof providedSecret !== 'string' ||
    providedSecret !== testSecret
  ) {
    return res.status(404).json({
      error: 'Not found',
    });
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const sql = neon(databaseUrl);

    const result = await sql`
      SELECT
        1 AS connection_ok,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'appointment_requests'
        ) AS appointment_table_exists
    `;

    return res.status(200).json({
      success: true,
      databaseConnected: result[0]?.connection_ok === 1,
      appointmentTableExists:
        result[0]?.appointment_table_exists === true,
    });
  } catch (error) {
    console.error('Database connection test failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Database connection test failed',
    });
  }
}
