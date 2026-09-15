import statsWorker from './index.mjs';
import { handleAccountRequest } from './accounts.mjs';
import { handleTeacherManagementRequest } from './teacher-admin.mjs';

export default {
  async fetch(request, env, ctx) {
    const teacherResponse = await handleTeacherManagementRequest(request, env);
    if (teacherResponse) return teacherResponse;
    const accountResponse = await handleAccountRequest(request, env);
    if (accountResponse) return accountResponse;
    return statsWorker.fetch(request, env, ctx);
  }
};
