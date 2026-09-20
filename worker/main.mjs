import statsWorker from './index.mjs';
import { handleAccountRequest } from './accounts.mjs';
import { handleTeacherManagementRequest } from './teacher-admin.mjs';
import { handleSeedRankingRequest } from './seed-rankings.mjs';
import { handleGameRecordRequest } from './game-records.mjs';
import { handleMultiplayerRequest } from './multiplayer.mjs';
import { handleWordchainMatchRequest } from './wordchain-match.mjs';
import { ensureMultiplayerSchema, multiplayerDatabaseHealth } from './multiplayer-schema.mjs';

const MULTIPLAYER_PREFIX = '/api/multiplayer/';

function multiplayerDatabaseError(error) {
  console.error('multiplayer database bootstrap failed', error);
  return Response.json(
    { ok: false, error: 'multiplayer_database_not_ready' },
    { status: 503, headers: { 'cache-control': 'no-store' } }
  );
}

export default {
  async fetch(request, env, ctx) {
    const teacherResponse = await handleTeacherManagementRequest(request, env);
    if (teacherResponse) return teacherResponse;

    const url = new URL(request.url);

    if (url.pathname.startsWith(MULTIPLAYER_PREFIX)) {
      try {
        await ensureMultiplayerSchema(env);
        if (request.method === 'GET' && url.pathname === '/api/multiplayer/health') {
          return Response.json(await multiplayerDatabaseHealth(env), {
            headers: { 'cache-control': 'no-store' }
          });
        }
      } catch (error) {
        return multiplayerDatabaseError(error);
      }
    }


    const wordchainMatchResponse = await handleWordchainMatchRequest(request, env);
    if (wordchainMatchResponse) return wordchainMatchResponse;

    const multiplayerResponse = await handleMultiplayerRequest(request, env);
    if (multiplayerResponse) return multiplayerResponse;
    const recordResponse = await handleGameRecordRequest(request, env);
    if (recordResponse) return recordResponse;
    const rankingResponse = await handleSeedRankingRequest(request, env);
    if (rankingResponse) return rankingResponse;
    const accountResponse = await handleAccountRequest(request, env);
    if (accountResponse) return accountResponse;
    return statsWorker.fetch(request, env, ctx);
  }
};
