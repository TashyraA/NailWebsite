
import { neon } from '@neondatabase/serverless';

/* =========================================
   INLOVENAILZ BY BRIANA
   PUBLIC SERVICES API

   - Read official services from Neon
   - Return active services to customers
   - Return prices and durations from database
   - No public editing or deleting
========================================= */

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

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
      WHERE is_active = TRUE
      ORDER BY category, title
    `;

    const services = rows.map(row => ({
      id: String(row.id),
      title: String(row.title),
      description: String(row.description),
      price: Number(row.price),
      deposit: 0,
      duration: Number(row.duration_minutes),
      category: String(row.category),
      images: Array.isArray(row.images)
        ? row.images
        : [],
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));

    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=60'
    );

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error: unknown) {
    console.error('Unable to load services:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to load services',
    });
  }
}
