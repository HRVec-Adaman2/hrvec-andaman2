import test from 'node:test';import assert from 'node:assert/strict';
const previous={url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY};process.env.SUPABASE_URL='https://bootstrap.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='fake-server-key';
let profile=null;const calls=[];globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;calls.push({path,method:options.method,body});let data;if(path==='/auth/v1/admin/users'){assert.equal(body.password,'123456');data={id:'new-admin-id'};profile={id:'new-admin-id',role:'personnel'};}else if(options.method==='PATCH'){Object.assign(profile,body);data=[profile];}else data=profile?.role==='admin'?[{id:profile.id}]:[];return {ok:true,json:async()=>data};};
test('bootstrap creates a real Auth admin with the requested initial password and mandatory first change',async()=>{
 await import('../scripts/bootstrap-admin.mjs?initial');assert.equal(profile.role,'admin');assert.equal(profile.username,'admin');assert.equal(profile.must_change_password,true);assert.equal(profile.account_enabled,true);assert.equal(calls.filter(c=>c.path==='/auth/v1/admin/users').length,1);
});
test('running bootstrap again never resets an existing administrator password',async()=>{
 const count=calls.length;await assert.rejects(import('../scripts/bootstrap-admin.mjs?repeat'),/มีบัญชี admin แล้ว/);assert.equal(calls.length,count+1);assert.equal(calls.at(-1).method,'GET');
 if(previous.url===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previous.url;if(previous.key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=previous.key;
});
