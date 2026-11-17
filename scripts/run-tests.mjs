/* npm test — серверсіз жұмыс істейтін бірлік тесттер. *.api.test.mjs файлдары жұмыс істеп тұрған wrangler dev қажет етеді (test/README). */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = readdirSync('test').filter(f => f.endsWith('.test.mjs') && !f.includes('.api.') && f !== 'api.test.mjs').map(f => 'test/' + f);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
