import statsWorker from './index.mjs';
import { handleAccountRequest } from './accounts.mjs';
import { handleTeacherManagementRequest } from './teacher-admin.mjs';
import { handleTeacherAuthRequest } from './teacher-auth.mjs';
import { handleEconomyRequest } from './economy.mjs';
import { handleSproutPowerRequest } from './sprout-power.mjs';
import { handleGameRecordRequest } from './game-records.mjs';
import { handleMultiplayerRequest } from './multiplayer.mjs';
import { handleWordchainMatchRequest } from './wordchain-match.mjs';
import { handleHistoryLiveRequest } from './history-live.mjs';
import { routeHistoryRoom } from './history-room-router.mjs';
import { routeWordchainRoom } from './wordchain-room-router.mjs';
import { routeTowerRoom } from './tower-room-router.mjs';
export { HistoryQuizRoom } from './history-room.mjs';
export { WordchainRoom } from './wordchain-room.mjs';
export { TowerRoom } from './tower-room.mjs';
import { ensureMultiplayerSchema, multiplayerDatabaseHealth } from './multiplayer-schema.mjs';

const STUDIO_ENTRY_PATH = '/teacher/character-3d-studio.html';

// Serve the canonical studio URL from a commit-specific static asset pathname.
// This bypasses stale Cloudflare static edge objects without changing teacher links.
async function serveFresh3dStudio(request, env) {
  const url=new URL(request.url);
  if(url.pathname!==STUDIO_ENTRY_PATH || (request.method!=='GET' && request.method!=='HEAD')){
    return null;
  }
  try{
    const versionUrl=new URL('/kidscade-version.json',url);
    const versionResponse=await env.ASSETS.fetch(new Request(versionUrl));
    if(!versionResponse.ok)throw new Error('build manifest unavailable');
    const version=String((await versionResponse.json()).build||'').slice(0,12);
    if(!/^[a-zA-Z0-9_-]{10,12}$/.test(version))throw new Error('invalid studio build ID');

    const versionedUrl=new URL(`/teacher/character-3d-studio-${version}.html`,url);
    const assetResponse=await env.ASSETS.fetch(new Request(versionedUrl,{method:request.method}));
    if(!assetResponse.ok)throw new Error(`studio asset HTTP ${assetResponse.status}`);

    const headers=new Headers(assetResponse.headers);
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('x-kidscade-studio-build',version);
    return new Response(request.method==='HEAD'?null:assetResponse.body,{
      status:assetResponse.status,
      statusText:assetResponse.statusText,
      headers
    });
  }catch(error){
    console.error('3D studio versioned asset error',error);
    return new Response('3D 제작실을 업데이트하는 중입니다. 잠시 후 다시 열어 주세요.',{
      status:503,
      headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}
    });
  }
}

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
    const teacherAuthResponse = await handleTeacherAuthRequest(request, env);
    if (teacherAuthResponse) return teacherAuthResponse;

    const teacherResponse = await handleTeacherManagementRequest(request, env);
    if (teacherResponse) return teacherResponse;

    const economyResponse = await handleEconomyRequest(request, env);
    if (economyResponse) return economyResponse;

    const url = new URL(request.url);

    const studioResponse=await serveFresh3dStudio(request,env);
    if(studioResponse)return studioResponse;

    // Wordchain v2 owns its realtime room state in a Durable Object. Route it
    // before the legacy multiplayer D1 schema preflight so active v2 rooms do
    // not consume (or depend on) D1 reads.
    const towerRoomResponse = await routeTowerRoom(request, env);
    if (towerRoomResponse) return towerRoomResponse;

    const wordchainRoomResponse = await routeWordchainRoom(request, env);
    if (wordchainRoomResponse) return wordchainRoomResponse;

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

    const roomResponse = await routeHistoryRoom(request, env);
    if (roomResponse) return roomResponse;
    const historyLiveResponse = await handleHistoryLiveRequest(request, env);
    if (historyLiveResponse) return historyLiveResponse;

    const wordchainMatchResponse = await handleWordchainMatchRequest(request, env);
    if (wordchainMatchResponse) return wordchainMatchResponse;

    const multiplayerResponse = await handleMultiplayerRequest(request, env);
    if (multiplayerResponse) return multiplayerResponse;
    const recordResponse = await handleGameRecordRequest(request, env);
    if (recordResponse) return recordResponse;
    const sproutPowerResponse = await handleSproutPowerRequest(request, env);
    if (sproutPowerResponse) return sproutPowerResponse;
    const accountResponse = await handleAccountRequest(request, env);
    if (accountResponse) return accountResponse;
    return statsWorker.fetch(request, env, ctx);
  }
};
