export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Example stats: total heroes, total matches, average KDA
    const [totalHeroes, totalMatches] = await Promise.all([
      prisma.hero.count(),
      prisma.match.count(),
    ]);

    // Calculate average KDA for matches that have at least one kill or assist
    const matchesWithStats = await prisma.match.findMany({
      where: {
        OR: [
          { kills: { gt: 0 } },
          { assists: { gt: 0 } },
        ],
      },
      select: {
        kills: true,
        deaths: true,
        assists: true,
      },
    });

    let totalKills = 0;
    let totalDeaths = 0;
    let totalAssists = 0;
    let count = 0;

    matchesWithStats.forEach(m => {
      totalKills += m.kills;
      totalDeaths += m.deaths;
      totalAssists += m.assists;
      count++;
    });

    const avgKDA = count > 0 ? (totalKills + totalAssists) / Math.max(totalDeaths, 1) : 0;

    return Response.json({
      totalHeroes,
      totalMatches,
      averageKDA: Number(avgKDA.toFixed(2)),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}