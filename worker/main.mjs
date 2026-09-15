import statsWorker from './index.mjs';
import { handleAccountRequest } from './accounts.mjs';
import { handleTeacherManagementRequest } from './teacher-admin.mjs';
import { handleSeedRankingRequest } from './seed-rankings.mjs';
import { handleGameRecordRequest } from './game-records.mjs';

export default {
  async fetch(request, env, ctx) {
    const teacherResponse = await handleTeacherManagementRequest(request, env);
    if (teacherResponse) return teacherResponse;
    const recordResponse = await handleGameRecordRequest(request, env);
    if (recordResponse) return recordResponse;
    const rankingResponse = await handleSeedRankingRequest(request, env);
    if (rankingResponse) return rankingResponse;
    const accountResponse = await handleAccountRequest(request, env);
    if (accountResponse) return accountResponse;
    return statsWorker.fetch(request, env, ctx);
  }
};
