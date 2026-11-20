
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from './_admin-auth';

export default async function handler(
  req: any,
  res: any
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // Only administrators with valid sessions
  // can access the complete service catalog.
  if (!requireAdmin(req, res)) {
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

  try {
    const sql = neon(databaseUrl);

    const rows = await sql`
      SELECT
        id,
        title,
        description,
        price,
        duration_minutes,
        category,
        images,
        is_active,
        created_at
      FROM salon_services
      ORDER BY category, title
    `;

    const services = rows.map(row => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      price: Number(row.price),

      // Custom appointment deposits will be
      // determined during appointment review.
      deposit: 0,

      duration: Number(row.duration_minutes),
      category: String(row.category),

      images: Array.isArray(row.images)
        ? row.images
        : [],

      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.error(
      'Unable to load administrator services:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to load services',
    });
  }
}
