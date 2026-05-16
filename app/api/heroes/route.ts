export const dynamic = 'force-dynamic';

import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const heroes = await prisma.hero.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        role: true,
        imageUrl: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return Response.json(heroes);
  } catch (error) {
    console.error('Error fetching heroes:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}