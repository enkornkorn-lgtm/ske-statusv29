// Exercise the shipped controller with a virtual clock. No Firebase requests or device writes.
const {test}=require('node:test'), assert=require('node:assert/strict'), vm=require('node:vm');
const html=require('node:fs').readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function section(from,to){const a=html.indexOf(from),b=html.indexOf(to,a+1);assert(a>=0&&b>a,from);return html.slice(a,b);}
const choice=section('  const FIREBASE_WS_FAILURE_KEY','  const TRANSPORT_MIGRATION_KEY');
const scheduler=section('  async function _runHandoffRecovery','  // ปุ่มแถบแดง:');
const recovery=section('  async function _runConnectionRecovery','  function _finishReconnect');
const manual=section('  window.forceReconnectNow =','  // ══ ระบบเก็บ log');
const cancel=section('  function _cancelHandoffTimer','  function _reloadLockAge');
function fixture(platform='android',seed={},overrides={}){
  const values=new Map(Object.entries(seed)),calls=[],events={},timers=new Map(); let now=10000000,seq=0;
  const w={_fbConnected:false,addEventListener:(n,f)=>events[n]=f,_setReconnecting:v=>calls.push('busy:'+v)};
  if(platform)w.Capacitor={getPlatform:()=>platform};
  const c=vm.createContext({window:w,Date:{now:()=>now},document:{visibilityState:'visible',addEventListener:(n,f)=>events[n]=f},
    navigator:{onLine:true},forceLongPolling:()=>calls.push('poll'),localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},
    setTimeout:(f,delay)=>{timers.set(++seq,{f,t:now+delay});return seq;},clearTimeout:id=>timers.delete(id),
    _checkConnectionVerification:async()=>true,_probeFirebaseRest:async()=>true,_restartFirebaseTransport:async()=>{calls.push('restart');return false;},...overrides});
  const run=s=>vm.runInContext(s,c);
  run(choice+`let _handoffTimer=null,_nativeAttempts=0,_lastRecoveryAttemptAt=0,_handoffRunning=false,_reconnecting=false,_connectionIssue='',_employeeReadFailed=false;
    const HANDOFF_GRACE_MS=30000;function _setConnectionIssue(i){_connectionIssue=i;}`+cancel+scheduler+recovery+manual);
  async function tick(ms){const end=now+ms;for(;;){const task=[...timers].sort((a,b)=>a[1].t-b[1].t)[0];if(!task||task[1].t>end)break;
      timers.delete(task[0]);now=task[1].t;task[1].f();await new Promise(setImmediate);}now=end;}
  return {c,w,run,calls,events,tick,values,timers};
}
test('only native Android with failure evidence selects an alternative before the database starts',()=>{
  for(const platform of [null,'web','ios','android']){
    const r=fixture(platform,{'firebase:previous_websocket_failure':'true'});assert.equal(r.calls.includes('poll'),platform==='android');
  }
  assert(!fixture().calls.includes('poll'));
  assert(html.indexOf('if(_nativePolling)forceLongPolling()')<html.indexOf('const db = getDatabase(app)'));
  assert(html.includes('https://*.asia-southeast1.firebasedatabase.app/.lp'));
});
test('cold start and overlapping resume events keep earliest deadline, then stop after bounded retries',async()=>{
  const r=fixture();await r.tick(0);await r.tick(6900);r.events.focus();await r.w.forceReconnectNow('resume');r.events.pageshow();await r.tick(100);
  assert.equal(r.calls.filter(x=>x==='restart').length,1);assert.equal(r.run('_connectionIssue'),'native-waiting');
  await r.tick(8*60000);assert.equal(r.calls.filter(x=>x==='restart').length,3);assert.equal(r.timers.size,0);
  assert.deepEqual([...r.values.keys()],['ske_android_transport_v1']); // no login, form or outbox changes
  const next=fixture('android',Object.fromEntries(r.values));assert(next.calls.includes('poll'));
  await next.tick(7000);assert.equal(JSON.parse(next.values.get('ske_android_transport_v1')).mode,'auto');
});
test('background, offline, verification denial and a healthy connection do not force a restart',async()=>{
  const r=fixture();await r.tick(0);r.c.document.visibilityState='hidden';r.events.visibilitychange();await r.tick(80000);
  assert(!r.calls.includes('restart'));r.c.document.visibilityState='visible';r.events.visibilitychange();await r.tick(7000);assert(r.calls.includes('restart'));
  for(const state of ['offline','denied','healthy']){
    const a=fixture('android',{},state==='denied'?{_checkConnectionVerification:async()=>false}:{});
    if(state==='offline')a.c.navigator.onLine=false;if(state==='healthy')a.w._fbConnected=true;
    await a.tick(80000);assert(!a.calls.includes('restart'));assert.equal(a.values.size,0);assert.equal(a.timers.size,0);
  }
});
test('slow SDK shows retry before DOMContentLoaded; late success opens app without reloading',()=>{
  const nodes={splash:{classList:{contains:()=>false}},skeBootRetry:{hidden:true}};
  let timeout,ready,started=0,loads=0;const w={Capacitor:{getPlatform:()=>'android'}};
  const c=vm.createContext({window:w,document:{readyState:'loading',getElementById:k=>nodes[k],addEventListener:(n,f)=>ready=f},
    setTimeout:f=>timeout=f,location:{reload:()=>loads++},skeInitApp:()=>started++});
  vm.runInContext(section('function skeRetryClientBoot','// ── กลับเข้าแอปจาก background'),c);
  timeout();assert.equal(nodes.skeBootRetry.hidden,false);ready();assert.equal(started,0);c.skeRetryClientBoot();assert.equal(loads,1);
  w._skeConnectionClientLoaded=true;ready();assert.equal(started,1);assert.equal(nodes.skeBootRetry.hidden,true);c.skeRetryClientBoot();assert.equal(loads,1);
});
