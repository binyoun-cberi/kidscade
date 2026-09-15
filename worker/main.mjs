import statsWorker from './index.mjs';
import { handleAccountRequest } from './accounts.mjs';

export default {
  async fetch(request, env, ctx) {
    const accountResponse = await handleAccountRequest(request, env);
    if (accountResponse) return accountResponse;
    return statsWorker.fetch(request, env, ctx);
  }
};
