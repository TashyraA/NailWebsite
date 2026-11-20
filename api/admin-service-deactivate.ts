
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth.js';

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Require a valid administrator session
  // and a same-origin browser request.
  if (!requireAdmin(req, res, true)) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is missing');

    return res.status(500).json({
      success: false,
      error: 'Database is not configured',
    });
  }

  const body = req.body || {};

  const id =
    typeof body.id === 'string'
      ? body.id.trim()
      : '';

  if (
    !id ||
    id.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(id)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid service ID',
    });
  }

  try {
    const sql = neon(databaseUrl);

    const rows = await sql`
      UPDATE salon_services
      SET
        is_active = FALSE,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        title,
        is_active
    `;

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Service deactivated successfully',
      service: {
        id: String(rows[0].id),
        title: String(rows[0].title),
        isActive: Boolean(rows[0].is_active),
      },
    });
  } catch (error) {
    console.error(
      'Unable to deactivate administrator service:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to deactivate service',
    });
  }
}
