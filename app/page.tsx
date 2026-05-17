export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { assertDbReady, isMissingTableError } from '@/lib/ensure-db'

export default async function HomePage() {
  try {
    await assertDbReady()
  } catch (error) {
    if (isMissingTableError(error)) {
      return (
        <main>
          <h1>Predecessor DPS Calculator</h1>
          <p className="empty">
            La base SQLite n&apos;est pas initialisée (table Hero absente).
            Redéploie la dernière image ou redémarre le conteneur pour relancer{' '}
            <code>prisma migrate deploy</code> au démarrage.
          </p>
        </main>
      )
    }
    throw error
  }

  const [heroes, totalHeroes, totalMatches] = await Promise.all([
    prisma.hero.findMany({
      select: { id: true, name: true, slug: true, role: true },
      orderBy: { name: 'asc' },
    }),
    prisma.hero.count(),
    prisma.match.count(),
  ])

  return (
    <main>
      <h1>Predecessor DPS Calculator</h1>
      <p className="lead">
        Statistiques et DPS pour Predecéssor — données agrégées depuis Pred.gg.
      </p>

      <div className="stats">
        <div className="stat">
          <strong>{totalHeroes}</strong>
          <span>Héros</span>
        </div>
        <div className="stat">
          <strong>{totalMatches}</strong>
          <span>Matchs</span>
        </div>
      </div>

      <section>
        <h2>Héros</h2>
        {heroes.length === 0 ? (
          <p className="empty">
            Aucun héros en base pour l&apos;instant. Lance les scripts de fetch
            (matchs / héros) ou importe des données via Prisma.
          </p>
        ) : (
          <ul className="hero-list">
            {heroes.map((hero) => (
              <li key={hero.id}>
                <span>{hero.name}</span>
                <span className="role">{hero.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer>
        API :{' '}
        <a href="/api/heroes">/api/heroes</a>
        {' · '}
        <a href="/api/stats">/api/stats</a>
      </footer>
    </main>
  )
}
