// Runtime dependencies are DSH-provided peers resolved by its profile Loader.
// No machine-specific runtime path, second Cordis, disk scan, or startup history read.
import {TypertRemoteService,RemoteError} from '@deepseek-ai/dsh-typert-protocol';
import {buildSessionEventRecords} from '@deepseek-ai/dsh-session-query';
import {createSearchService} from './search.mjs';
import {hostContribution,NAMESPACE,publicFailure,publicError,parseResult} from './contract.mjs';

export const name='conversation-search';
export const inject=['sessionQuery','typert'];
export function apply(ctx){
  const lifetime=new AbortController();
  ctx.effect(()=>()=>lifetime.abort(new Error('原文检索已卸载，请重新打开后重试')),'conversation-search in-flight lifetime');
  const engine=createSearchService(ctx.sessionQuery,buildSessionEventRecords);
  const operationSignal=signal=>signal?AbortSignal.any([lifetime.signal,signal]):lifetime.signal;
  const invoke=async(method,request,signal)=>{try{const combined=operationSignal(signal);const value=parseResult(method,await engine[method](request,combined));if(combined.aborted)throw publicError('cancelled');return value;}catch(error){const record=publicFailure(error,lifetime.signal.aborted||signal?.aborted===true);throw new RemoteError(record.code,record.message,{});}};
  class ConversationTextSearch extends TypertRemoteService {
    constructor(context){super(context,NAMESPACE);}
    search(request,signal){return invoke('search',request,signal);}
    detail(request,signal){return invoke('detail',request,signal);}
  }
  new ConversationTextSearch(ctx);
  ctx.effect(()=>ctx.typert.register(hostContribution),'conversation-search read-only RPC');
}
