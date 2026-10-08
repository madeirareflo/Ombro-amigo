const TASK_STATUS=new Set(['completed','failed','assisted','not-attempted']);
const FIDELITY_RATING=new Set(['fully','mostly','partly','little','not-represented','not-rated']);

function cleanCode(value,label){
  if(value==null || value==='') return null;
  const code=String(value).trim();
  if(!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(code)) throw new Error(label+' must be a short coded value');
  return code;
}

function sourceSha(value){
  const sha=String(value || '').trim().toLowerCase();
  if(!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error('sourceSha must be a Git commit SHA');
  return sha;
}

function rating(value){
  if(value==null) return null;
  const number=Number(value);
  if(!Number.isInteger(number) || number<1 || number>5) throw new Error('rating must be an integer from 1 to 5');
  return number;
}

function count(value,label){
  const number=Number(value ?? 0);
  if(!Number.isInteger(number) || number<0) throw new Error(label+' must be a non-negative integer');
  return number;
}

function codeList(values,label){
  if(values==null) return [];
  if(!Array.isArray(values)) throw new Error(label+' must be an array');
  return [...new Set(values.map(value=>cleanCode(value,label)).filter(Boolean))];
}

function tasks(values=[]){
  if(!Array.isArray(values)) throw new Error('tasks must be an array');
  return values.map(item=>{
    const id=cleanCode(item?.id,'task id');
    if(!id) throw new Error('task id is required');
    const status=String(item?.status || '');
    if(!TASK_STATUS.has(status)) throw new Error('invalid task status');
    return {
      id,
      status,
      issueCode:cleanCode(item?.issueCode,'issueCode')
    };
  });
}

export function createPilotMetrics(input={}){
  const participantCode=String(input.participantCode || '').trim();
  if(!/^P-[A-Z0-9_-]{4,32}$/.test(participantCode)){
    throw new Error('participantCode must match P-[A-Z0-9_-]{4,32}');
  }

  const startedAt=String(input.startedAt || '');
  if(Number.isNaN(Date.parse(startedAt))) throw new Error('startedAt must be an ISO-compatible date');

  return {
    version:1,
    participantCode,
    sourceSha:sourceSha(input.sourceSha),
    startedAt,
    tasks:tasks(input.tasks),
    roleComprehension:{
      appDiagnoses:input.roleComprehension?.appDiagnoses ?? null,
      sendsAutomatically:input.roleComprehension?.sendsAutomatically ?? null,
      userControlsDraft:input.roleComprehension?.userControlsDraft ?? null,
      replacesCrisisCare:input.roleComprehension?.replacesCrisisCare ?? null
    },
    autonomy:{
      canStop:rating(input.autonomy?.canStop),
      canDisagree:rating(input.autonomy?.canDisagree),
      canSkip:rating(input.autonomy?.canSkip),
      noPressure:rating(input.autonomy?.noPressure)
    },
    fidelity:{
      rating:FIDELITY_RATING.has(input.fidelity?.rating) ? input.fidelity.rating : 'not-rated',
      unsupportedItemCount:count(input.fidelity?.unsupportedItemCount,'unsupportedItemCount'),
      distortedItemCount:count(input.fidelity?.distortedItemCount,'distortedItemCount'),
      correctionCount:count(input.fidelity?.correctionCount,'correctionCount')
    },
    accessibility:{
      keyboardIssueCodes:codeList(input.accessibility?.keyboardIssueCodes,'keyboardIssueCodes'),
      screenReaderIssueCodes:codeList(input.accessibility?.screenReaderIssueCodes,'screenReaderIssueCodes'),
      zoomIssueCodes:codeList(input.accessibility?.zoomIssueCodes,'zoomIssueCodes')
    }
  };
}
