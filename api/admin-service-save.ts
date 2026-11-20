
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import {
  requireAdmin,
} from './_admin-auth.js';

const MAX_IMAGES = 20;

function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) {
    return false;
  }

  if (value.startsWith('/')) {
    return !value.startsWith('//') &&
      !value.includes('\\') &&
      !/[\r\n]/.test(value);
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      url.pathname.startsWith('/image/upload/')
    );
  } catch {
    return false;
  }
}

function parsePrice(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100000
  ) {
    return null;
  }

  const cents = Math.round(value * 100);

  if (Math.abs(value * 100 - cents) > 0.000001) {
    return null;
  }

  return cents / 100;
}

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

  if (!requireAdmin(req, res, true)) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
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

  const isEditing = id.length > 0;

  if (
    isEditing &&
    (
      id.length > 128 ||
      !/^[a-zA-Z0-9_-]+$/.test(id)
    )
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid service ID',
    });
  }

  const title =
    typeof body.title === 'string'
      ? body.title.trim()
      : '';

  const description =
    typeof body.description === 'string'
      ? body.description.trim()
      : '';

  const category =
    typeof body.category === 'string'
      ? body.category.trim()
      : '';

  const price = parsePrice(body.price);
  const duration = body.duration;

  const images = body.images;
  const isActive = body.isActive;

  if (
    title.length < 2 ||
    title.length > 150 ||
    description.length > 5000 ||
    category.length < 1 ||
    category.length > 100 ||
    price === null ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440 ||
    !Array.isArray(images) ||
    images.length < 1 ||
    images.length > MAX_IMAGES ||
    !images.every(isValidImageUrl) ||
    typeof isActive !== 'boolean'
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid service information',
    });
  }

  try {
    const sql = neon(databaseUrl);

    const serviceId = isEditing
      ? id
      : randomUUID();

    const imageJson = JSON.stringify(images);

    const rows = isEditing
      ? await sql`
          UPDATE salon_services
          SET
            title = ${title},
            description = ${description},
            price = ${price},
            duration_minutes = ${duration},
            category = ${category},
            images = ${imageJson}::jsonb,
            is_active = ${isActive},
            updated_at = NOW()
          WHERE id = ${serviceId}
          RETURNING
            id,
            title,
            description,
            price,
            duration_minutes,
            category,
            images,
            is_active,
            created_at
        `
      : await sql`
          INSERT INTO salon_services (
            id,
            title,
            description,
            price,
            duration_minutes,
            category,
            images,
            is_active
          )
          VALUES (
            ${serviceId},
            ${title},
            ${description},
            ${price},
            ${duration},
            ${category},
            ${imageJson}::jsonb,
            ${isActive}
          )
          RETURNING
            id,
            title,
            description,
            price,
            duration_minutes,
            category,
            images,
            is_active,
            created_at
        `;

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found',
      });
    }

    const row = rows[0];

    return res.status(
      isEditing ? 200 : 201
    ).json({
      success: true,
      service: {
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
      },
    });
  } catch (error) {
    console.error(
      'Unable to save administrator service:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Unable to save service',
    });
  }
}
