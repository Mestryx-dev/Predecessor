import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RawMatch {
  matchId: string;
  playerData: Array<{
    heroName: string;
    // other fields ignored for now
  }>;
}

/**
 * Convert a hero name to a URL-friendly slug.
 * Lowercase, replace spaces and underscores with hyphens,
 * remove any non-alphanumeric characters except hyphen.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

async function upsertHero(name: string) {
  const slug = slugify(name);
  return prisma.hero.upsert({
    where: { name }, // unique on name
    update: { slug },
    create: { name, slug, role: 'Unknown' },
  });
}

async function main() {
  const rawDir = path.resolve(process.cwd(), 'data', 'raw');
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.warn('⚠️ No raw match files found – run fetch:matches first');
    return;
  }
  // Process the most recent file
  const latest = files.sort().pop()!;
  const content = fs.readFileSync(path.join(rawDir, latest), 'utf-8');
  const matches: RawMatch[] = JSON.parse(content);

  const heroSet = new Set<string>();
  for (const m of matches) {
    for (const p of m.playerData) {
      heroSet.add(p.heroName.trim());
    }
  }

  const heroArray = Array.from(heroSet);
  console.log(`🔎 Found ${heroArray.length} unique heroes in ${latest}`);

  for (const name of heroArray) {
    await upsertHero(name);
    console.log(`✅ Upserted hero: ${name}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Processing failed:', err);
  process.exit(1);
});