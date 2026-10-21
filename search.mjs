// Read-only text projection: no requests, streams, reasoning, or private tool metadata.
import {createHash} from 'node:crypto';
import {setImmediate as yieldTurn} from 'node:timers/promises';
import {parseRequest,publicError,publicFailure} from './contract.mjs';
export const ALLOWED_TYPES = new Set(['user/message','assistant/message','tool/call','tool/result']);
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const blocksText = blocks => Array.isArray(blocks) ? blocks.map(b => b?.type === 'text' && typeof b.text === 'string' ? b.text : '\n').join('') : '';
export function eventText(event) {
  const data = event?.data;
  switch (event?.type) {
    case 'user/message': return blocksText(data?.content);
    case 'assistant/message': return blocksText(data?.message?.content);
    case 'tool/call': return [data?.name,data?.arguments].filter(v => typeof v === 'string').join('\n');
    case 'tool/result': return blocksText(data?.message?.content);
    default: return '';
  }
}
export function findLiteral(text, query, caseSensitive = false) {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const spans = [];
  for (const match of text.matchAll(new RegExp(escaped, caseSensitive ? 'gu' : 'giu'))) {
    spans.push([match.index,match.index + match[0].length]);
    if (spans.length >= 1000) break;
  }
  return spans;
}
// Coordinates remain UTF-16 code units. Do not normalize or repair original source.
// Align cuts only when they separate an existing valid surrogate pair; never exceed caps.
function boundedTextRange(text, requestedStart, max) {
  const betweenPair = at => at > 0 && at < text.length && text.charCodeAt(at - 1) >= 0xd800 && text.charCodeAt(at - 1) <= 0xdbff && text.charCodeAt(at) >= 0xdc00 && text.charCodeAt(at) <= 0xdfff;
  let start = Math.min(Math.max(0,requestedStart),text.length);
  if (betweenPair(start)) start--;
  let end = Math.min(text.length,start + max);
  if (betweenPair(end)) end--;
  return {start,end};
}
export function excerpt(text, spans, max = 440) {
  const {start,end} = boundedTextRange(text,Math.max(0,(spans[0]?.[0] ?? 0) - 100),max);
  return {text:text.slice(start,end),offset:start,moreBefore:start > 0,moreAfter:end < text.length};
}
const callIdOf = event => event.type === 'tool/call' ? event.data?.callId : event.data?.message?.toolCallId;
const executionKey = event => JSON.stringify([event.data?.turn ?? null,event.data?.step ?? null,callIdOf(event)]);
const isTool = event => event.type === 'tool/call' || event.type === 'tool/result';

// Provider callId is NOT session-unique. Associate execution occurrences chronologically.
// Only a content-only singleton tool-result replacement continues an execution lineage.
export function indexToolExecutions(events) {
  const pending = new Map(), calls = new Map(), results = new Map(), eventsBySeq = new Map();
  for (const event of events) {
    eventsBySeq.set(event.seq,event);
    if (['turn/start','turn/end','step/end'].includes(event.type)) pending.clear();
    if (event.type === 'tool/call') {
      const key = executionKey(event), list = pending.get(key) ?? new Map();
      list.set(event.seq,event); pending.set(key,list);
    } else if (event.type === 'tool/result' && event.surfaceOp === 'append') {
      const key = executionKey(event), list = pending.get(key) ?? new Map();
      const hasSourceField = event.sourceEventSeqs !== undefined;
      const rawSources = hasSourceField && Array.isArray(event.sourceEventSeqs) ? event.sourceEventSeqs.map(seq => eventsBySeq.get(seq)) : [];
      const sourcesValid = !hasSourceField || rawSources.length === 1 && rawSources[0]?.type === 'tool/call';
      const sources = sourcesValid && hasSourceField ? rawSources : [];
      const cited = sourcesValid && sources.length === 1 ? list.get(sources[0].seq) : null;
      const notStarted = event.data?.message?.isError === true && event.data?.error?.code === 'TOOL_NOT_STARTED';
      // Explicit ancestry is authoritative: a non-tool/unknown/multiple/empty source list is ambiguous and never falls back to chronology. Only an absent sourceEventSeqs field may use the singleton pending call.
      const call = notStarted ? null : cited ?? (!hasSourceField && list.size === 1 ? list.values().next().value : null);
      const execution = {call,originalResultSeq:event.seq,latestResultSeq:event.seq};
      results.set(event.seq,execution);
      if (call) {
        calls.set(call.seq,execution);
        list.delete(call.seq);
        if (!list.size) pending.delete(key);
      } else pending.delete(key); // Ambiguous heads must never silently choose the latest call.
    } else if (event.type === 'tool/result' && event.surfaceOp?.op === 'replace') {
      const op = event.surfaceOp, previous = eventsBySeq.get(op.startSeq), execution = results.get(op.startSeq);
      if (op.startSeq === op.endSeq && execution && previous?.type === 'tool/result'
        && execution.latestResultSeq === previous.seq && executionKey(previous) === executionKey(event)
        && previous.data?.message?.id === event.data?.message?.id
        && event.sourceEventSeqs?.includes(previous.seq)) {
        execution.latestResultSeq = event.seq;
        results.set(event.seq,execution);
      }
    }
  }
  return {calls,results};
}
export function projectDocuments(header, events, inheritedEventCount, records, selection = {}) {
  return [...iterateDocuments(header,events,inheritedEventCount,records,selection)];
}
function* iterateDocuments(header, events, inheritedEventCount, records, selection = {}, prepared) {
  const surfaces = prepared?.surfaces ?? new Map(records.map(record => [record.seq,record.surface]));
  const executions = prepared?.executions ?? indexToolExecutions(events);
  let title = '未命名会话', orderTime = 0;
  for (const event of events) if (event.type === 'session/title' && typeof event.data?.title === 'string') title = event.data.title;
  for (const event of events) {
    if (!ALLOWED_TYPES.has(event.type)) continue;
    if (!nonnegative(event.seq) || !nonnegative(event.time)) throw new Error('原文事件坐标或时间无效');
    orderTime = Math.max(orderTime,event.time);
    const execution = event.type === 'tool/call' ? executions.calls.get(event.seq) : executions.results.get(event.seq);
    const surface = surfaces.get(event.seq) ?? 'log-only';
    const visibility = event.type === 'tool/call' ? surfaces.get(execution?.latestResultSeq) ?? 'log-only' : surface;
    if (selection.includeTools === false && isTool(event) || selection.includeHistory === false && visibility === 'shadowed') continue;
    const text = eventText(event);
    if (!text) continue;
    let metadataTruncated = false;
    const bounded = (value, limit, fallback = null) => {
      if (typeof value !== 'string') return fallback;
      if (value.length <= limit) return value;
      metadataTruncated = true; return value.slice(0,boundedTextRange(value,0,limit).end);
    };
    // Address-like metadata is never silently sliced into a different address.
    const identity = (value, limit) => {
      if (typeof value !== 'string' || !value) return null;
      if (value.length <= limit) return value;
      metadataTruncated = true; return null;
    };
    const sourceEventSeqs = Array.isArray(event.sourceEventSeqs) ? event.sourceEventSeqs.filter(nonnegative).slice(0,64) : [];
    const doc = {
      sessionId:header.id,seq:event.seq,time:event.time,orderTime,type:event.type,
      title:bounded(title,1000,''),
      role:event.type === 'user/message' ? 'user' : event.type === 'assistant/message' ? 'assistant' : 'tool',
      sourceKind:event.type === 'user/message' ? bounded(event.data?.source?.kind,200,'unknown') : event.type === 'assistant/message' ? 'model' : 'tool',
      surface,visibility,inherited:event.seq < inheritedEventCount,
      parentSessionId:identity(header.parentSession,1000),
      turn:nonnegative(event.data?.turn) ? event.data.turn : null,
      step:nonnegative(event.data?.step) ? event.data.step : null,
      toolName:bounded(event.type === 'tool/call' ? event.data?.name : execution?.call?.data?.name,1000),
      callId:identity(callIdOf(event),1000),
      // Calls may navigate to their own original append result. Rewrites never claim that old row.
      pairedResultSeq:event.type === 'tool/call' ? execution?.originalResultSeq ?? null : null,
      sourceEventSeqs,
      sourceLinksTruncated:Array.isArray(event.sourceEventSeqs) && event.sourceEventSeqs.length > 64,
      replacement:event.surfaceOp?.op === 'replace' ? {startSeq:event.surfaceOp.startSeq,endSeq:event.surfaceOp.endSeq} : null,
      text
    };
    doc.metadataTruncated = metadataTruncated;
    yield doc;
  }
}
export function normalizeRequest(input) {
  const request = parseRequest('search',input);
  return {...request,sort:request.sort === 'newest' ? 'newest' : 'oldest',includeTools:request.includeTools === true,includeHistory:request.includeHistory !== false,caseSensitive:request.caseSensitive === true};
}
export function compareHits(a,b,sort) {
  const order = a.orderTime - b.orderTime || a.sessionId.localeCompare(b.sessionId) || a.seq - b.seq;
  return sort === 'newest' ? -order : order;
}
function textSize(event) {
  if (event.type === 'tool/call') return (typeof event.data?.arguments === 'string' ? event.data.arguments.length : 0) + (typeof event.data?.name === 'string' ? event.data.name.length : 0) + 1;
  const blocks = event.type === 'user/message' ? event.data?.content : event.data?.message?.content;
  return Array.isArray(blocks) ? blocks.reduce((n,b) => n + (b?.type === 'text' && typeof b.text === 'string' ? b.text.length : 1),0) : 0;
}
export function createSearchService(query, classify, options = {}) {
  const maxSessions = options.maxSessions ?? 100, maxEvents = options.maxEvents ?? 200000, maxHits = options.maxHits ?? 200;
  const maxTextPerEvent = options.maxTextPerEvent ?? 2_000_000, maxTextPerSession = options.maxTextPerSession ?? 16_000_000;
  const yieldNow = options.yieldNow ?? yieldTurn;
  let active = 0;
  const checkpoint = async signal => { await yieldNow(); signal?.throwIfAborted(); };
  const guard = async (signal,operation) => {
    if (signal?.aborted) throw publicError('cancelled');
    if (active >= 2) throw publicError('busy');
    active++;
    try { const result = await operation(); signal?.throwIfAborted(); return result; } catch (error) { const record=publicFailure(error,signal?.aborted===true);throw publicError(record.code.slice('conversation-search/'.length)); } finally { active--; }
  };
  async function scopeMetadata(id,signal) {
    const records = await query.listSessions(signal);
    signal?.throwIfAborted();
    const header = records.find(record => record.header.id === id)?.header;
    if (!header?.cwd || header.origin === 'subagent') throw publicError('scope');
    if (header.cwd.length > 32768) throw publicError('workspace-address');
    return {header:{...header},records};
  }
  async function readDocs(id,anchor,request,signal,consume) {
    const lease = await query.observeSession(id,{signal,projectionMode:'none'});
    try {
      if (lease.header.id !== id) throw publicError('source-mismatch');
      if (lease.header.cwd !== anchor.cwd || lease.header.origin === 'subagent') throw publicError('scope-changed');
      signal?.throwIfAborted();
      if (lease.events.length > maxEvents) throw publicError('event-budget');
      // Classifier reads metadata; excluded tool/history bodies are neither concatenated nor budgeted.
      const records = classify(id,lease.events), surfaces = new Map(records.map(record => [record.seq,record.surface]));
      const executions = indexToolExecutions(lease.events);
      let chars = 0;
      for (let i = 0; i < lease.events.length; i++) {
        if (i % 500 === 0) await checkpoint(signal);
        const event = lease.events[i];
        if (!ALLOWED_TYPES.has(event.type) || !request.includeTools && isTool(event)) continue;
        const visibility = event.type === 'tool/call' ? surfaces.get(executions.calls.get(event.seq)?.latestResultSeq) ?? 'log-only' : surfaces.get(event.seq) ?? 'log-only';
        if (!request.includeHistory && visibility === 'shadowed') continue;
        const size = textSize(event); chars += size;
        if (size > maxTextPerEvent || chars > maxTextPerSession) throw publicError('text-budget');
      }
      await checkpoint(signal);
      const docs = iterateDocuments(lease.header,lease.events,lease.inheritedEventCount,records,request,{surfaces,executions});
      const result = await consume(docs,lease.cursor);
      signal?.throwIfAborted();
      return result;
    } finally { lease[Symbol.dispose](); }
  }
  return {
    async search(input,signal) { return guard(signal,async () => {
      const request = normalizeRequest(input);
      const {header:anchor,records} = await scopeMetadata(request.anchorSessionId,signal);
      const ids = request.scope === 'session' ? [anchor.id] : [...new Set(records.filter(record => record.header.cwd === anchor.cwd && record.header.origin !== 'subagent').map(record => record.header.id))].sort();
      if (ids.some(id => typeof id !== 'string' || !id || id.length > 200)) throw publicError('catalog-address');
      // Stateless cursor token binds scope/options AND selected catalog. No saved bodies or index.
      const catalogToken = createHash('sha256').update(JSON.stringify([anchor.id,anchor.cwd,request.scope,request.query,request.sort,request.includeTools,request.includeHistory,request.caseSensitive,ids])).digest('hex');
      const start = request.sessionOffset ?? 0;
      if (start > 0 && (request.scope !== 'workspace' || request.catalogToken !== catalogToken || start >= ids.length)) throw publicError('catalog-changed');
      const selected = ids.slice(start,start + maxSessions), warnings = [], items = [];
      let totalMatches = 0, scanned = 0;
      for (const id of selected) {
        signal?.throwIfAborted();
        try {
          const cut = await readDocs(id,anchor,request,signal,async (docs,capturedThroughSeq) => {
            const hits = []; let count = 0, index = 0;
            for (const doc of docs) {
              if (index++ % 500 === 0) await checkpoint(signal);
              const spans = findLiteral(doc.text,request.query,request.caseSensitive);
              if (!spans.length) continue;
              count++;
              const {text,...meta} = doc;
              hits.push({...meta,excerpt:excerpt(text,spans),occurrences:spans.length,capturedThroughSeq});
              if (hits.length > maxHits * 2) { hits.sort((a,b) => compareHits(a,b,request.sort)); hits.length = maxHits; }
            }
            return {hits,count};
          });
          totalMatches += cut.count;items.push(...cut.hits);
          if (items.length > maxHits * 2) { items.sort((a,b) => compareHits(a,b,request.sort));items.length = maxHits; }
          scanned++;
        } catch (error) {
          if (signal?.aborted) throw error;
          warnings.push({sessionId:id,message:'读取失败或超出预算，未计为无命中'});
        }
        await checkpoint(signal);
      }
      items.sort((a,b) => compareHits(a,b,request.sort)); items.length = Math.min(items.length,maxHits);
      return {items,query:request.query,scope:request.scope,cwd:anchor.cwd,sort:request.sort,totalMatches,scannedSessions:scanned,selectedSessions:ids.length,sessionOffset:start,catalogToken,nextSessionOffset:start + selected.length < ids.length ? start + selected.length : null,truncated:totalMatches > maxHits,warnings,snapshotAt:Date.now()};
    }); },
    async detail(input,signal) { return guard(signal,async () => {
      const request = parseRequest('detail',input);
      const {header:anchor,records} = await scopeMetadata(request.anchorSessionId,signal);
      if (request.scope === 'session' && request.targetSessionId !== anchor.id) throw publicError('session-scope');
      const targetHeader = records.find(record => record.header.id === request.targetSessionId)?.header;
      if (targetHeader?.cwd !== anchor.cwd || targetHeader.origin === 'subagent') throw publicError('workspace-scope');
      return readDocs(request.targetSessionId,anchor,{includeTools:request.includeTools === true,includeHistory:request.includeHistory !== false},signal,async (docs,capturedThroughSeq) => {
        const before = [], after = []; let target = null, index = 0;
        const preview = doc => {const {end}=boundedTextRange(doc.text,0,3000);return {...doc,text:doc.text.slice(0,end),truncated:doc.text.length > end};};
        // Keep at most four context previews, not a whole-session document/text array.
        for (const doc of docs) {
          if (++index % 500 === 0) await checkpoint(signal);
          if (doc.seq === request.seq) {
            const {start:offset,end} = boundedTextRange(doc.text,request.offset ?? 0,16000);
            target = {...doc,text:doc.text.slice(offset,end),textOffset:offset,textLength:doc.text.length,nextOffset:end < doc.text.length ? end : null};
          } else if (!target) { before.push(preview(doc)); if (before.length > 2) before.shift(); }
          else { after.push(preview(doc)); if (after.length === 2) break; }
        }
        if (!target) throw publicError('source-unavailable');
        return {target,context:[...before,...after],capturedThroughSeq,snapshotAt:Date.now()};
      });
    }); }
  };
}
