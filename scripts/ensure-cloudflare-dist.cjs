'use strict';

// Wrangler's build.command runs for both standalone Cloudflare Workers Builds
// and the project's GitHub Actions deployment. In a clean clone dist/ does
// not exist; in GitHub Actions it was already built by build:cloudflare.
// Never replace a current artifact or silently serve one from a stale commit.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
function commitId(){
  const fromEnv=String(process.env.CF_PAGES_COMMIT_SHA||process.env.GITHUB_SHA||'').trim();
  if(fromEnv)return fromEnv;
  return cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
}
function artifactCurrent(sha){
  try{
    const pathFor=name=>path.join(ROOT,'dist',name);
    const info=JSON.parse(fs.readFileSync(pathFor('kidscade-version.json'),'utf8'));
    return info.build===sha&&fs.statSync(pathFor('index.html')).size>2000
      &&fs.statSync(pathFor('home-v2.js')).size>1000;
  }catch{return false;}
}
const sha=commitId();
if(artifactCurrent(sha)){
  console.log('[wrangler-build] Reusing prebuilt Cloudflare dist for '+sha.slice(0,12));
}else{
  console.log('[wrangler-build] Missing or stale dist; building '+sha.slice(0,12));
  cp.execFileSync('npm',['run','build:cloudflare'],{
    cwd:ROOT,stdio:'inherit',env:process.env,timeout:900000
  });
  if(!artifactCurrent(sha))throw Error('Cloudflare dist was not built for '+sha);
}
