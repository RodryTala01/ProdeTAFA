export type PromiedosWorkPlan = {days:string[];games:string[]};

const DISPATCH_URL = 'https://api.github.com/repos/RodryTala01/ProdeTAFA/actions/workflows/promiedos-cache.yml/dispatches';

export async function dispatchPromiedosRefresh(
  plan: PromiedosWorkPlan,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
) {
  if (!plan.days.length && !plan.games.length) return {dispatched:false,reason:'no-work' as const};
  if (!token) throw new Error('GITHUB_ACTIONS_TOKEN no configurado');

  const response = await fetcher(DISPATCH_URL, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'ProdeTAFA-Worker',
      'x-github-api-version': '2026-03-10',
    },
    body: JSON.stringify({ref:'main'}),
  });

  if (!response.ok) throw new Error(`GitHub Actions dispatch HTTP ${response.status}`);
  return {dispatched:true,reason:'work' as const};
}
