// One-time bootstrap: generate a stable VAPID key pair and store only the private
// key as a Cloudflare Worker secret. Never log, commit or rotate an existing key.
import {generateKeyPairSync} from 'node:crypto';
import {spawnSync} from 'node:child_process';

function wrangler(args,input){
 const p=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{
  input,encoding:'utf8',maxBuffer:2*1024*1024,env:process.env
 });
 if(p.status!==0)throw Error('Wrangler operation failed: '+args.slice(0,3).join(' '));
 return p.stdout;
}
function execute(sql){
 const response=JSON.parse(wrangler(['d1','execute','DB','--remote','--json','--command',sql]));
 if(!Array.isArray(response)||response.some(r=>r.success!==true))throw Error('D1 operation failed');
 return response.flatMap(r=>r.results??[]);
}
const config=execute('SELECT public_key FROM push_config WHERE id=1');
if(config.length){
 console.log('Stable Web Push keys already initialized. No rotation.');
}else{
 const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const pub=publicKey.export({format:'jwk'}),priv=privateKey.export({format:'jwk'});
 const url=Buffer.concat([Buffer.from([4]),Buffer.from(pub.x,'base64url'),Buffer.from(pub.y,'base64url')]).toString('base64url');
 if(!priv.d||url.length<80)throw Error('VAPID key generation failed');
 wrangler(['secret','put','PUSH_VAPID_PRIVATE_KEY'],priv.d);
 execute("INSERT INTO push_config(id,public_key) VALUES(1,'"+url+"')");
 console.log('Web Push keys initialized. Private key held exclusively in Cloudflare secret.');
}
