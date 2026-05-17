import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const BASE_URL = 'https://pred.gg/api/public';

async function fetchMatches(since: number = 0) {
  const url = `${BASE_URL}/get-matches-since/${since}`;
  const { data } = await axios.get(url, { timeout: 15000 });
  return data as any[];
}

async function main() {
  const matches = await fetchMatches();
  const outDir = path.resolve(process.cwd(), 'data', 'raw');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `matches_${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(matches, null, 2));
  console.log(`✅ Saved ${matches.length} matches to ${outFile}`);
}

main().catch(err => {
  console.error('❌ Fetch failed:', err);
  process.exit(1);
});