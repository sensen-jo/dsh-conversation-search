export const PACKAGE = 'dsh-sensenzi-conversation-search';
export const NAMESPACE = 'conversationTextSearch';
// Fixed public failures; upstream diagnostic objects are never inspected or copied.
export const PUBLIC_FAILURES = Object.freeze(Object.fromEntries(Object.entries({
  unavailable:'检索服务暂不可用，请稍后重试；未完成的读取不能视为无命中',
  cancelled:'检索已取消或插件已卸载，请重新打开后重试',
  busy:'已有检索正在运行，请稍后重试',
  'invalid-request':'检索参数无效，请检查范围和输入后重试',
  scope:'只能检索当前可见的普通工作区会话',
  'workspace-address':'工作区地址超出可显示上限',
  'source-mismatch':'会话来源不一致',
  'scope-changed':'会话范围发生变化',
  'event-budget':'此会话超出事件预算',
  'text-budget':'所选消息文本超出扫描预算',
  'catalog-address':'会话目录包含超出地址上限的记录',
  'catalog-changed':'会话目录或检索条件已变化，请从首批重新检索',
  'session-scope':'目标超出当前会话范围',
  'workspace-scope':'目标超出当前工作区范围',
  'source-unavailable':'原文不可用或不在本次选定的消息类型内，请重新检索'
}).map(([key,message])=>[key,Object.freeze({code:`conversation-search/${key}`,message})])));
const authoredFailures = new WeakMap();
export function publicError(key) {const record=typeof key==='string'&&Object.hasOwn(PUBLIC_FAILURES,key)?PUBLIC_FAILURES[key]:PUBLIC_FAILURES.unavailable;const error=new Error(record.message);error.code=record.code;authoredFailures.set(error,record);return error;}
export function publicFailure(value,cancelled=false) {return cancelled?PUBLIC_FAILURES.cancelled:authoredFailures.get(value)??PUBLIC_FAILURES.unavailable;}
// Remote code is only a selector for locally fixed text; never display remote diagnostics.
export function publicFailureMessage(value) {try {return Object.values(PUBLIC_FAILURES).find(record=>record.code===value?.code)?.message??PUBLIC_FAILURES.unavailable.message;}catch{return PUBLIC_FAILURES.unavailable.message;}}
// Explicit public Typert contribution. Strict codecs are shared by Host and Client.
export function parseRequest(method, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw publicError('invalid-request');
    if (typeof value.anchorSessionId !== 'string' || !value.anchorSessionId || value.anchorSessionId.length>200 || !['session','workspace'].includes(value.scope)) throw publicError('invalid-request');
    if (method==='search' && (typeof value.query !== 'string' || !value.query.trim() || value.query.length>200 || value.query.includes('\0'))) throw publicError('invalid-request');
    if (method==='detail' && (typeof value.targetSessionId!=='string' || !value.targetSessionId || value.targetSessionId.length>200 || !Number.isSafeInteger(value.seq) || value.seq<0)) throw publicError('invalid-request');
    for (const flag of ['includeTools','includeHistory','caseSensitive']) if (value[flag]!==undefined && typeof value[flag]!=='boolean') throw publicError('invalid-request');
    for (const key of ['sessionOffset','offset']) if (value[key]!==undefined && (!Number.isSafeInteger(value[key]) || value[key]<0)) throw publicError('invalid-request');
    if (value.sort!==undefined && !['oldest','newest'].includes(value.sort)) throw publicError('invalid-request');
    if (value.catalogToken!==undefined && (typeof value.catalogToken!=='string' || !/^[a-f0-9]{64}$/.test(value.catalogToken))) throw publicError('invalid-request');
    const keys = method==='search' ? ['anchorSessionId','scope','query','sort','includeTools','includeHistory','caseSensitive','sessionOffset','catalogToken'] : ['anchorSessionId','scope','targetSessionId','seq','offset','includeTools','includeHistory'];
    if(Object.keys(value).some(k=>!keys.includes(k))) throw publicError('invalid-request');
    return value;
}
function requestSchema(method) { return {parse:value=>parseRequest(method,value)}; }
function resultSchema(method) {
  const fail=()=>{throw new Error('Invalid source response');};
  const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))fail();};
  const str=(v,max)=>{if(typeof v!=='string'||v.length>max)fail();};
  const num=v=>{if(!Number.isSafeInteger(v)||v<0)fail();};
  const bool=v=>{if(typeof v!=='boolean')fail();};
  const nullableNum=v=>{if(v!==null)num(v);};
  const meta=['sessionId','seq','time','orderTime','type','title','role','sourceKind','surface','visibility','inherited','parentSessionId','turn','step','toolName','callId','pairedResultSeq','sourceEventSeqs','sourceLinksTruncated','metadataTruncated','replacement'];
  function doc(v,kind){
    exact(v,[...meta,...(kind==='hit'?['excerpt','occurrences','capturedThroughSeq']:kind==='target'?['text','textOffset','textLength','nextOffset']:['text','truncated'])]);
    str(v.sessionId,200);num(v.seq);num(v.time);num(v.orderTime);str(v.title,1000);str(v.sourceKind,200);bool(v.inherited);bool(v.sourceLinksTruncated);
    if(!['user/message','assistant/message','tool/call','tool/result'].includes(v.type)||!['user','assistant','tool'].includes(v.role)||!['current','shadowed','log-only'].includes(v.surface)||!['current','shadowed','log-only'].includes(v.visibility))fail();
    for(const key of ['parentSessionId','toolName','callId'])if(v[key]!==null)str(v[key],1000);
    nullableNum(v.turn);nullableNum(v.step);nullableNum(v.pairedResultSeq);bool(v.metadataTruncated);
    if(!Array.isArray(v.sourceEventSeqs)||v.sourceEventSeqs.length>64)fail();v.sourceEventSeqs.forEach(num);
    if(v.replacement!==null){exact(v.replacement,['startSeq','endSeq']);num(v.replacement.startSeq);num(v.replacement.endSeq);}
    if(kind==='hit'){exact(v.excerpt,['text','offset','moreBefore','moreAfter']);str(v.excerpt.text,440);num(v.excerpt.offset);bool(v.excerpt.moreBefore);bool(v.excerpt.moreAfter);num(v.occurrences);num(v.capturedThroughSeq);if(v.occurrences>1000)fail();}
    else {str(v.text,kind==='target'?16000:3000);if(kind==='target'){num(v.textOffset);num(v.textLength);nullableNum(v.nextOffset);}else bool(v.truncated);}
  }
  return {parse(value) {
    const search=method==='search';
    exact(value,search?['items','query','scope','cwd','sort','totalMatches','scannedSessions','selectedSessions','sessionOffset','nextSessionOffset','catalogToken','truncated','warnings','snapshotAt']:['target','context','capturedThroughSeq','snapshotAt']);
    num(value.snapshotAt);
    if(search){
      if(!Array.isArray(value.items)||value.items.length>200||!Array.isArray(value.warnings)||value.warnings.length>100)fail();
      value.items.forEach(d=>doc(d,'hit'));str(value.query,200);str(value.cwd,32768);
      if(!['session','workspace'].includes(value.scope)||!['oldest','newest'].includes(value.sort))fail();
      for(const key of ['totalMatches','scannedSessions','selectedSessions','sessionOffset'])num(value[key]);
      nullableNum(value.nextSessionOffset);bool(value.truncated);str(value.catalogToken,64);if(!/^[a-f0-9]{64}$/.test(value.catalogToken))fail();
      value.warnings.forEach(w=>{exact(w,['sessionId','message']);str(w.sessionId,200);if(w.message!=='读取失败或超出预算，未计为无命中')fail();});
    } else {doc(value.target,'target');if(!Array.isArray(value.context)||value.context.length>4)fail();value.context.forEach(d=>doc(d,'context'));num(value.capturedThroughSeq);}
    return value;
  }};
}
export function parseResult(method,value) {return resultSchema(method).parse(value);}
export const descriptors = ['search','detail'].map(method=>({
  id: `${PACKAGE}#${NAMESPACE}/${method}`, service: NAMESPACE, namespace: NAMESPACE, method,
  invocation:{kind:'direct'},
  parameters:[{name:'request',wire:'request',source:'json',codec:{mode:'strict',typeSymbol:`${PACKAGE}#${method}Request`,create:()=>requestSchema(method)}}],
  cancellation:{parameter:'signal'},
  result:{mode:'strict',typeSymbol:`${PACKAGE}#${method}Result`,create:()=>resultSchema(method)}
}));
export const hostContribution={package:PACKAGE,face:'host',schemas:[],model:{services:[],events:[],objects:[]},invocations:descriptors};
export const remoteContribution={package:PACKAGE,descriptors};
