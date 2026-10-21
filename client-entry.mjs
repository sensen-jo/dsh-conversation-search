import {remoteContribution, PACKAGE,publicFailureMessage,parseResult} from './contract.mjs';
const React = require('react');
const {createElement:h, useState, useRef, useEffect, useSyncExternalStore} = React;
const BASE_CSS = `.dsh-cs{color:var(--dsw-alias-label-primary,#222);font-family:inherit;font-size:14px;line-height:1.55;max-width:1100px;margin:auto;padding:20px 18px 50px;box-sizing:border-box}.dsh-cs *{box-sizing:border-box}.dsh-cs h2{font-size:19px;margin:0 0 5px}.dsh-cs h3{font-size:16px;margin:5px 0 10px}.dsh-cs .cs-muted{font-size:12px;color:var(--dsw-alias-label-secondary,#666)}.dsh-cs .cs-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:12px 0}.dsh-cs input[type=text]{flex:1;min-width:150px}.dsh-cs input[type=text],.dsh-cs select,.dsh-cs button{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:7px;padding:7px 10px;background:var(--dsw-alias-bg-layer-1,#fff)}.dsh-cs button{cursor:pointer}.dsh-cs button:disabled{cursor:default;opacity:.5}.dsh-cs input:focus-visible,.dsh-cs button:focus-visible,.dsh-cs select:focus-visible{outline:2px solid #6a8eee;outline-offset:2px}.dsh-cs label{display:inline-flex;align-items:center;gap:5px}.dsh-cs .cs-box{border:1px solid var(--dsw-alias-border-l2,#ddd);border-radius:10px;padding:14px;margin:12px 0;overflow-wrap:anywhere}.dsh-cs .cs-snippet{white-space:pre-wrap;overflow-wrap:anywhere;margin:9px 0}.dsh-cs mark{background:#ffe18a;color:#27221b;border-radius:2px}.dsh-cs .cs-tag{font-size:11px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:5px;padding:1px 5px;margin:0 5px 0 0;display:inline-block}.dsh-cs .cs-warning{background:#ad7b1819;border:1px solid #c1943c66;padding:10px;border-radius:7px;margin:10px 0}.dsh-cs .cs-original{border-left:3px solid #7498ef;padding-left:12px}.dsh-cs .cs-address{font:12px/1.4 monospace;user-select:all;overflow-wrap:anywhere}.dsh-cs .cs-context{opacity:.85}.dsh-cs-toast{position:fixed;z-index:10000;bottom:22px;left:50%;transform:translateX(-50%);max-width:min(650px,92vw);padding:12px 16px;border:1px solid #aaa;border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:0 4px 24px #0002;font-size:13px}.dsh-cs-flash{outline:3px solid #e6b94a!important;outline-offset:5px;animation:csflash 1s 3}@keyframes csflash{50%{outline-color:#f7d879}}@media(max-width:550px){.dsh-cs{padding:12px 8px 35px}.dsh-cs .cs-box{padding:10px}.dsh-cs .cs-row{gap:6px}}`;
const CSS = BASE_CSS + `.dsh-cs label{max-width:100%;min-width:0}.dsh-cs label select{flex:1;min-width:0}.dsh-cs input[type=text],.dsh-cs select,.dsh-cs button{border-color:currentColor}.dsh-cs input::placeholder{color:var(--dsw-alias-label-secondary,#666);opacity:1}.dsh-cs .cs-context{opacity:1}.dsh-cs{overflow-wrap:anywhere}.dsh-cs select{max-width:100%;min-width:0}.dsh-cs [data-cs-detail]:focus-visible{outline:2px solid #6a8eee;outline-offset:3px}.dsh-cs-toast button{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:5px;margin:7px 0 0 10px;padding:4px 8px;cursor:pointer}.dsh-cs-toast button:focus-visible{outline:2px solid #6a8eee;outline-offset:3px}@media(prefers-reduced-motion:reduce){.dsh-cs-flash{animation:none!important;transition:none!important}.dsh-cs,.dsh-cs *{scroll-behavior:auto!important}}`;
const roleText = d => d.role === 'user' ? (d.sourceKind==='user' ? '用户' : d.sourceKind==='unknown' ? '用户角色（来源未标注）' : `用户角色 · ${d.sourceKind}`) : d.role === 'assistant' ? '助手' : `工具 · ${d.toolName ?? d.type}`;
const timeText = value => new Date(value).toLocaleString(undefined,{hour12:false});
function highlight(text, query, sensitive) {
  if(!query) return text;
  const escaped=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const out=[];let count=0;
  let last=0;
  for(const m of text.matchAll(new RegExp(escaped,sensitive?'gu':'giu'))){out.push(text.slice(last,m.index),h('mark',{key:m.index},m[0]));last=m.index+m[0].length;if(++count>=1000)break;}
  out.push(text.slice(last));return out;
}
function Tags({doc}) { return h(React.Fragment,null,
  h('span',{className:'cs-tag'},roleText(doc)),
  h('span',{className:'cs-tag'},doc.surface==='shadowed'?'已被替换/压缩前原文':doc.surface==='current'?'当前模型表面':'仅日志'),
  doc.replacement&&h('span',{className:'cs-tag'},'替换产生的记录，不是原始发言'),
  doc.inherited&&h('span',{className:'cs-tag'},'分叉继承 · 不代表在本会话首次说出'),
  doc.metadataTruncated&&h('span',{className:'cs-tag'},'部分来源标签过长，已省略或截短；事件地址未改'),
  h('span',{className:'cs-muted'},timeText(doc.time)));
}
export const inject=['slots','remote','sessions','uiConversation','uiWorkspace'];
export async function apply(ctx) {
  let disposed=false;const lifetime=new AbortController();
  const cache=new Map();
  const navListeners=new Set();let navStatus='',navReturnFocus=null,navReturnRoot=null,navSessionId=null,navFallbackFocus=null,navigationVersion=0,noticeVersion=0;
  const rootsFor=id=>[...document.querySelectorAll('[data-conversation-session]')].filter(e=>e.getAttribute('data-conversation-session')===id&&e.getClientRects().length&&!e.closest('[hidden],[inert]')&&getComputedStyle(e).visibility==='visible');
  // Focus fallback never guesses among duplicated visible session roots.
  const rootFor=id=>{const roots=rootsFor(id);return roots.length===1?roots[0]:null;};
  const setNav=value=>{noticeVersion++;const active=document.activeElement;if(value&&active&&active!==document.body&&active!==document.documentElement&&!active.closest?.('.dsh-cs-toast')){navReturnFocus=active;navReturnRoot=active.closest?.('[data-conversation-session]')??null;}navStatus=value;for(const listener of navListeners)listener();};
  const dismissNav=()=>{const generation=++navigationVersion,origin=navReturnFocus,originRoot=navReturnRoot,id=navSessionId,fallback=navFallbackFocus;setNav('');const notice=noticeVersion;requestAnimationFrame(()=>{if(disposed||generation!==navigationVersion||notice!==noticeVersion)return;const originId=originRoot?.getAttribute('data-conversation-session');if(originRoot?.isConnected&&rootFor(originId)===originRoot&&origin?.isConnected&&origin.closest?.('[data-conversation-session]')===originRoot&&!origin.disabled&&!origin.closest('[inert]')&&origin.getClientRects().length){origin.focus?.({preventScroll:true});if(document.activeElement===origin)return;}const root=id?rootFor(id):originId?rootFor(originId):null;if(!root)return;const owned=e=>e?.isConnected&&e.closest?.('[data-conversation-session]')===root&&e.getClientRects().length&&!e.disabled&&!e.closest('[inert]');const targets=[fallback,...root.querySelectorAll('[aria-label="检索词"]'),root];for(const target of targets){if(!owned(target)||getComputedStyle(target).visibility!=='visible')continue;const temporary=!target.hasAttribute('tabindex');if(temporary)target.setAttribute('tabindex','-1');target.focus?.({preventScroll:true});if(document.activeElement===target){if(temporary)target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});break;}if(temporary)target.removeAttribute('tabindex');}});};
  ctx.effect(()=>()=>{disposed=true;lifetime.abort();cache.clear();navListeners.clear();},'conversation-search lifetime');
  const unmount=await ctx.remote.$mount(remoteContribution);
  if(disposed){unmount();return;}
  ctx.effect(()=>unmount,'conversation-search remote descriptors');
  await ctx.plugin({name:'conversation-search-panel',inject:['slots','sessions','uiConversation','uiWorkspace','remote.conversationTextSearch'],apply(ctx) {
  const remote=ctx.remote.conversationTextSearch;
  const style=document.createElement('style');style.dataset.plugin=PACKAGE;style.textContent=CSS;document.head.append(style);
  ctx.effect(()=>()=>style.remove(),'conversation-search styles');
  async function call(method,request,signal){const result=await remote[method](request,signal);if(!result.ok)throw result.error;return parseResult(method,result.value);}
  async function waitFor(fn,ms=5000){const end=Date.now()+ms;while(Date.now()<end){lifetime.signal.throwIfAborted();const result=fn();if(result)return result;await new Promise(resolve=>setTimeout(resolve,40));}return null;}
  function exactNode(node,doc){
    if(doc.type==='assistant/message')return node.data?.finalNode?.seq===doc.seq;
    if(doc.type==='user/message')return ['user','context','steering','turn-trigger'].includes(node.kind)&&node.data?.seq===doc.seq;
    const resultSeq=doc.type==='tool/result'?doc.seq:doc.pairedResultSeq;
    return doc.role==='tool'&&Number.isSafeInteger(resultSeq)&&resultSeq>=0&&node.data?.root?.kind==='tool-result'&&node.data.root.seq===resultSeq;
  }
  const navigationFailures=new WeakMap();
  const navigationError=message=>{const e=new Error(message);navigationFailures.set(e,message);return e;};
  async function locate(doc,owner){
    const generation=++navigationVersion;navSessionId=doc.sessionId;navFallbackFocus=null;let root=null,binding=null,session=null,conversation=null,source=null;
    const assertRoot=()=>{if(disposed||generation!==navigationVersion)throw navigationError('定位已被后续导航取消');if(root){const roots=rootsFor(doc.sessionId);if(roots.length>1)throw navigationError('来源会话视图不唯一，已停止定位；请使用原文详情');if(roots.length!==1||roots[0]!==root||!root.isConnected)throw navigationError('来源会话视图已变化，已停止定位；请使用原文详情');}};
    // Session/Conversation/target are stable public binding objects while their owner is live.
    const assertCurrent=()=>{assertRoot();try{if(binding&&(ctx.sessions.binding(doc.sessionId)!==binding||binding.session!==session))throw 0;if(conversation&&ctx.uiConversation.binding(doc.sessionId)!==conversation)throw 0;if(source&&conversation.target('chat')!==source)throw 0;}catch{throw navigationError('来源会话绑定已变化，已停止定位；请使用原文详情');}assertRoot();};
    try {
      setNav('正在打开来源会话并加载该消息所在历史页…');
      ctx.uiWorkspace.openSession(doc.sessionId);
      root=await waitFor(()=>{assertCurrent();const roots=rootsFor(doc.sessionId);if(roots.length>1)throw navigationError('来源会话视图不唯一，已停止定位；请使用原文详情');return roots[0];});
      if(!root)throw navigationError('会话尚未呈现，请在原文面板查看准确记录');
      assertCurrent();
      binding=await waitFor(()=>{assertCurrent();return ctx.sessions.binding(doc.sessionId);});session=binding?.session;
      assertCurrent();if(!binding)throw navigationError('会话尚未加载，请在原文面板查看准确记录');
      const opened=await waitFor(()=>{assertCurrent();const state=session.getSnapshot();if(state.openState==='error')throw navigationError('会话历史加载失败，请查看原文详情');return state.openState==='open';});
      assertCurrent();if(!opened)throw navigationError('会话历史尚未准备好，请稍后重试');
      await session.loadThrough(doc.type==='tool/call'&&Number.isSafeInteger(doc.pairedResultSeq)?doc.pairedResultSeq:doc.seq);assertCurrent();
      conversation=ctx.uiConversation.binding(doc.sessionId);assertCurrent();conversation.activate('chat');assertCurrent();
      source=conversation.target('chat');assertCurrent();
      const node=await waitFor(()=>{assertCurrent();const nodes=source.getSnapshot()?.nodes.values()??[];const matches=[...nodes].filter(n=>exactNode(n,doc));if(matches.length>1)throw navigationError('此来源对应多个聊天行，未选择可能错误的一行；请使用原文详情');assertCurrent();return matches[0]?{key:matches[0].key}:null;},2000);
      assertCurrent();if(!node){setNav(`已打开会话并加载到 seq ${doc.seq}；此记录没有独立的对话行，请使用“打开原文”精确查看。`);return;}
      const nodeKey=node.key;
      const assertSource=()=>{assertCurrent();const matches=[...(source.getSnapshot()?.nodes.values()??[])].filter(n=>exactNode(n,doc));assertCurrent();if(matches.length!==1||matches[0].key!==nodeKey)throw navigationError('来源聊天行已变化或不唯一，已停止定位；请使用原文详情');};
      assertSource();
      if(owner.sessionId===doc.sessionId && owner.openView) owner.openView('chat','');
      else {
        // Narrow compatibility bridge, restricted to the exact selected session occurrence.
        const header=root.previousElementSibling;
        const scopes=[...(header?.matches('[data-conversation-tabs]')?[header]:[]),...(header?.querySelectorAll('[data-conversation-tabs]')??[]),...root.querySelectorAll('[data-conversation-tabs]')];
        const tabs=[...new Set(scopes.flatMap(scope=>[...scope.querySelectorAll('[role=tab]')]))].filter(t=>{const owner=t.closest('[data-conversation-session]');return (owner===root||!owner&&header?.contains(t))&&t.getClientRects().length&&getComputedStyle(t).visibility==='visible'&&!t.closest('[hidden]')&&!t.disabled&&t.getAttribute('aria-disabled')!=='true'&&!t.closest('[inert]')&&['对话','Chat'].includes(t.textContent.trim());});
        if(tabs.length>1)throw navigationError('对话切换入口不唯一，已停止定位；请使用原文详情');
        assertSource();if(tabs.length===1)tabs[0].click();assertSource();
      }
      const elementsFor=()=>[...root.querySelectorAll('[data-chat-node-key]')].filter(e=>e.getAttribute('data-chat-node-key')===nodeKey&&e.closest('[data-conversation-session]')===root);
      const uniqueElement=()=>{assertSource();const matches=elementsFor();if(matches.length>1)throw navigationError('来源聊天元素不唯一，已停止定位；请使用原文详情');return matches[0];};
      const element=await waitFor(uniqueElement,4000);
      assertSource();if(!element){setNav(`已加载到 seq ${doc.seq}，但当前布局未呈现该行；请切换“对话”或回到“原文检索”查看准确原文。`);return;}
      const assertElement=()=>{if(uniqueElement()!==element||!element.isConnected||!root.contains(element))throw navigationError('来源聊天元素已变化，已停止定位；请使用原文详情');};
      assertElement();
      const assertAncestor=p=>{assertElement();if(!p.isConnected||!root.contains(p)||p.closest('[data-conversation-session]')!==root||!p.contains(element))throw navigationError('来源聊天层级已变化，已停止定位；请使用原文详情');};
      for(let p=element;p&&root.contains(p);p=p.parentElement){assertAncestor(p);if(p.getAttribute('hidden')==='until-found'){p.dispatchEvent(new Event('beforematch',{bubbles:false}));assertAncestor(p);}if(p.tagName==='DETAILS'){assertAncestor(p);p.open=true;assertAncestor(p);}}
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));assertElement();
      if(!element.getClientRects().length||element.closest('[hidden],[inert]')||getComputedStyle(element).visibility!=='visible'){setNav(`已加载到 seq ${doc.seq}，该记录仍折叠；原文详情是精确来源。`);return;}
      assertElement();navFallbackFocus=element;element.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});assertElement();element.classList.add('dsh-cs-flash');
      setTimeout(()=>element.classList.remove('dsh-cs-flash'),3500);
      setNav(`已定位相关聊天行：${doc.sessionId} · seq ${doc.seq}。工具调用/结果可能共用一行；精确文本以原文详情为准。`);
    }catch(e){if(!disposed&&generation===navigationVersion)setNav(navigationFailures.get(e)??'定位失败；请使用原文详情');}
  }
  function NavigationNotice(){const status=useSyncExternalStore(fn=>{navListeners.add(fn);return()=>navListeners.delete(fn);},()=>navStatus);return status?h('div',{className:'dsh-cs-toast',onKeyDown:e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();dismissNav();}}},h('span',{role:'status','aria-live':'polite','aria-atomic':true},status),h('button',{type:'button','aria-label':'关闭定位提示',onClick:dismissNav},'关闭')):null;}
  function Panel(props){
    const {sessionId}=props;
    const saved=cache.get(sessionId);
    const [query,setQuery]=useState(saved?.query??''),[scope,setScope]=useState(saved?.scope??'session'),[sort,setSort]=useState(saved?.sort??'oldest');
    const [tools,setTools]=useState(saved?.tools??false),[history,setHistory]=useState(saved?.history??true),[sensitive,setSensitive]=useState(saved?.sensitive??false);
    const [result,setResult]=useState(saved?.result??null),[detail,setDetail]=useState(saved?.detail??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const controller=useRef(null),version=useRef(0),input=useRef(null),detailRef=useRef(null),detailOpener=useRef(null),focusDetail=useRef(false),activeRequest=useRef(saved?.request??null);
    useEffect(()=>{input.current?.focus();return()=>{version.current++;controller.current?.abort();};},[sessionId]);
    useEffect(()=>{cache.set(sessionId,{query,scope,sort,tools,history,sensitive,result,detail,request:activeRequest.current});if(cache.size>6)cache.delete(cache.keys().next().value);},[sessionId,query,scope,sort,tools,history,sensitive,result,detail]);
    useEffect(()=>{if(detail&&focusDetail.current){focusDetail.current=false;detailRef.current?.focus({preventScroll:true});detailRef.current?.scrollIntoView({block:'start'});}},[detail]);
    function begin(){focusDetail.current=false;input.current?.focus({preventScroll:true});controller.current?.abort();const c=new AbortController();controller.current=c;const id=++version.current;setBusy(true);setError('');return {signal:c.signal,id};}
    function clearResults(){focusDetail.current=false;version.current++;controller.current?.abort();activeRequest.current=null;cache.delete(sessionId);navigationVersion++;setNav('');setBusy(false);setError('');setResult(null);setDetail(null);input.current?.focus();}
    function closeDetail(){focusDetail.current=false;version.current++;controller.current?.abort();setBusy(false);setDetail(null);const opener=detailOpener.current;detailOpener.current=null;requestAnimationFrame(()=>{if(opener?.isConnected&&!opener.disabled)opener.focus({preventScroll:true});else input.current?.focus({preventScroll:true});});}
    async function search(offset=0){
      // Pagination belongs to the completed search, never to subsequently edited controls.
      const request=offset>0&&activeRequest.current?{...activeRequest.current,sessionOffset:offset}:{anchorSessionId:sessionId,scope,query,sort,includeTools:tools,includeHistory:history,caseSensitive:sensitive,sessionOffset:0};
      const op=begin();
      activeRequest.current=request;setDetail(null);setResult(null);
      try{const value=await call('search',request,op.signal);if(op.id===version.current){activeRequest.current={...request,catalogToken:value.catalogToken};setResult(value);}}catch(e){if(!op.signal.aborted && op.id===version.current)setError(publicFailureMessage(e));}finally{if(op.id===version.current)setBusy(false);}
    }
    async function openDetail(doc,offset=0,opener){
      if(opener&&!detailRef.current?.contains(opener))detailOpener.current=opener;
      const op=begin();const searchRequest=activeRequest.current;
      const request={anchorSessionId:sessionId,scope:searchRequest?.scope??scope,targetSessionId:doc.sessionId,seq:doc.seq,offset,includeTools:searchRequest?.includeTools??tools,includeHistory:searchRequest?.includeHistory??history};
      try{const value=await call('detail',request,op.signal);if(op.id===version.current){focusDetail.current=true;setDetail(value);}}catch(e){if(!op.signal.aborted&&op.id===version.current)setError(publicFailureMessage(e));}finally{if(op.id===version.current)setBusy(false);}
    }
    const rq=activeRequest.current;
    const matchingText=(text)=>highlight(text,rq?.query??'',rq?.caseSensitive??false);
    const recordBody=(d,original=false)=>h('div',{className:original?'cs-original':'cs-context',key:d.seq},h(Tags,{doc:d}),h('div',{className:'cs-address'},`${d.sessionId} · seq ${d.seq}`),d.inherited&&d.parentSessionId&&h('div',{className:'cs-address'},`分叉父会话：${d.parentSessionId}（继承记录，不重复认作首发）`),d.replacement&&h('div',{className:'cs-muted'},`此记录替换了 seq ${d.replacement.startSeq}–${d.replacement.endSeq} 的模型表面`),d.sourceEventSeqs.length>0&&h('div',{className:'cs-address'},`来源事件 seq：${d.sourceEventSeqs.join('、')}${d.sourceLinksTruncated?'（链接仅展示前 64 条）':''}`),h('div',{className:'cs-snippet'},matchingText(d.text)),d.truncated&&h('small',null,'上下文仅预览前 3000 字，可点击打开完整原文。'),!original&&h('button',{type:'button',disabled:busy,onClick:()=>openDetail(d)},'打开这条上下文'));
    return h('section',{className:'dsh-cs','data-conversation-text-search':'', 'aria-label':'会话原文检索','aria-busy':busy,onKeyDown:e=>{if(e.key==='Escape'&&detail){e.preventDefault();e.stopPropagation();closeDetail();}}},
      h('h2',null,'原文检索'),h('div',{className:'cs-muted'},'本地只读 · 中文连续子串匹配 · 不调用模型 · 不上传 · 排除系统/开发者提示、思维链、request/header 和工具私有 meta'),
      h('form',{onSubmit:e=>{e.preventDefault();search();}},
        h('div',{className:'cs-row'},h('input',{ref:input,type:'text',maxLength:200,value:query,onChange:e=>setQuery(e.target.value),placeholder:'输入关键词，例如：会话、某个人名…','aria-label':'检索词'}),h('button',{type:'submit',disabled:busy||!query.trim()},busy?'检索中…':'检索原文'),h('button',{type:'button',onClick:clearResults},'清除结果'),busy&&h('button',{type:'button',onClick:()=>{version.current++;controller.current?.abort();setBusy(false);setError('已取消；原结果不会被过期响应覆盖。');input.current?.focus({preventScroll:true});}},'取消')),
        h('div',{className:'cs-row'},h('label',null,'范围',h('select',{'aria-label':'检索范围',value:scope,onChange:e=>setScope(e.target.value)},h('option',{value:'session'},'当前会话'),h('option',{value:'workspace'},'当前工作区（同目录普通会话）'))),h('label',null,'排序',h('select',{'aria-label':'结果排序',value:sort,onChange:e=>setSort(e.target.value)},h('option',{value:'oldest'},'最早出现优先'),h('option',{value:'newest'},'最近出现优先')))),
        h('div',{className:'cs-row'},h('label',null,h('input',{type:'checkbox',checked:history,onChange:e=>setHistory(e.target.checked)}),'包含压缩/替换前原文'),h('label',null,h('input',{type:'checkbox',checked:tools,onChange:e=>setTools(e.target.checked)}),'包含工具调用/结果'),h('label',null,h('input',{type:'checkbox',checked:sensitive,onChange:e=>setSensitive(e.target.checked)}),'英文区分大小写'))),
      h('div',{className:'cs-muted'},scope==='session'?`仅此会话：${sessionId}`:'只在你点击检索后扫描当前会话同目录的普通会话；不扫描其他工作区或子代理。'),
      (tools||rq?.includeTools&&(result||detail))&&h('div',{className:'cs-warning'},'当前选择或已显示的结果包含工具文本：工具参数/结果可能含隐私或手动粘贴的凭据。它们仅在本地显示，插件不做全面脱敏；不要复制分享含敏感信息的结果。取消勾选不会清除旧结果，可点击“清除结果”。'),
      (result||detail)&&h('div',{className:'cs-muted'},'列表、原文和下一批沿用本次完成检索的条件；修改上方控件后请重新点击“检索原文”。关闭面板不立即清除内存缓存；可主动清除结果。'),
      error&&h('div',{className:'cs-warning',role:'alert'},error),
      result&&h('div',{role:'status','aria-live':'polite','aria-atomic':true},
        h('div',{className:'cs-row'},h('strong',null,`“${result.query}” · ${result.totalMatches} 条匹配记录`),h('span',{className:'cs-muted'},`扫描 ${result.scannedSessions}/${result.selectedSessions} 个会话 · ${timeText(result.snapshotAt)}`)),
        h('div',{className:'cs-muted'},`结果范围：${result.scope==='session'?'当前会话':'当前工作区'} · ${result.sort==='oldest'?'最早优先':'最近优先'}。显示的是扫描时的原始记录，不是模型记忆或可信归因。`),
        (result.truncated||result.nextSessionOffset!==null||result.warnings.length>0)&&h('div',{className:'cs-warning'},'结果不完整，不能据此断言整个范围内的首次出现。',result.truncated&&` 仅展示当前扫描批次前 ${result.items.length} 条，可缩小关键词或范围。`,result.nextSessionOffset!==null&&h('button',{disabled:busy,onClick:()=>search(result.nextSessionOffset)},'扫描下一批会话（独立排序）'),result.warnings.map(w=>h('div',{key:w.sessionId},`${w.sessionId}：${w.message}`))),
        result.items.length===0&&h('p',null,result.scannedSessions===0?'本批没有成功扫描的会话，无法判断是否匹配；请稍后重试。':'本次已扫描记录中没有匹配。图片中文字、未落盘的流式输出、系统/开发者提示和思维链不在检索范围内。')),
      detail&&h('div',{ref:detailRef,className:'cs-box','data-cs-detail':'',role:'region','aria-label':'原文与上下文',tabIndex:-1},h('div',{className:'cs-row'},h('h3',null,'原文与上下文'),h('button',{disabled:busy,onClick:closeDetail},'关闭原文'),h('button',{disabled:busy,onClick:()=>locate(detail.target,props)},'在对话中定位')),
        h('p',{className:'cs-muted'},'按 sessionId + seq 从正式只读查询服务读取；角色不等于真人证据，继承内容不等于本会话首发。相邻上下文最多各 2 条可检索消息。'),
        detail.context.filter(d=>d.seq<detail.target.seq).map(d=>recordBody(d)),recordBody(detail.target,true),
        // Reserve two UTF-16 units on reverse windows: both aligned cuts may back by one.
        // Back/forward windows may overlap; these are source windows, not inverse page indices.
        h('div',{className:'cs-row'},h('span',{className:'cs-muted'},detail.target.text.length?`原文位置（UTF-16）${detail.target.textOffset+1}–${detail.target.textOffset+detail.target.text.length} / ${detail.target.textLength}`:`原文末尾 ${detail.target.textLength} / ${detail.target.textLength}`),detail.target.textOffset>0&&h('button',{disabled:busy,onClick:()=>openDetail(detail.target,Math.max(0,detail.target.textOffset-15998))},'上一段原文'),detail.target.nextOffset!==null&&h('button',{disabled:busy,onClick:()=>openDetail(detail.target,detail.target.nextOffset)},'下一段原文'),h('button',{onClick:async()=>{try{await navigator.clipboard.writeText(`${detail.target.sessionId}#seq=${detail.target.seq}`);setNav('原文定位地址已复制。');}catch{setNav('无法访问剪贴板，请手动选择原文地址复制。');}}},'复制来源地址')),
        detail.context.filter(d=>d.seq>detail.target.seq).map(d=>recordBody(d))),
      result?.items.map(doc=>h('article',{className:'cs-box',key:`${doc.sessionId}:${doc.seq}`},h('strong',null,doc.title),h('div',null,h(Tags,{doc})),h('div',{className:'cs-address'},`${doc.sessionId} · seq ${doc.seq}`),h('div',{className:'cs-snippet'},doc.excerpt.moreBefore?'…':'',matchingText(doc.excerpt.text),doc.excerpt.moreAfter?'…':''),h('div',{className:'cs-row'},h('button',{disabled:busy,onClick:e=>openDetail(doc,Math.max(0,doc.excerpt.offset-400),e.currentTarget)},'打开原文'),h('button',{disabled:busy,onClick:()=>locate(doc,props)},'在对话中定位'),h('span',{className:'cs-muted'},`本条匹配 ${doc.occurrences>=1000?'至少 1000':doc.occurrences} 次`)))),
      h('p',{className:'cs-muted'},'同会话保持 seq 原始顺序，跨会话按记录时间合并（时钟倒退时使用单调校正）；不据此断言真人首发。定位使用官方会话导航与历史分页；聊天滚动使用现版 DOM 兼容桥，折叠/合并或布局变化时会明确提示。原文详情不依赖该桥。'));
  }
  ctx.slots.inject('conversation.view',()=>ctx.slots.register({name:'conversation.view',id:'original-text-search',order:35,label:()=> '原文检索'},props=>h(Panel,{...props,key:props.sessionId})));
  ctx.slots.inject('shell.overlay',()=>ctx.slots.register({name:'shell.overlay',id:'conversation-text-search-notice',order:80},NavigationNotice));
  }}).await();
}
