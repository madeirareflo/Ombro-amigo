/**
 * Offline rewrite evaluation gate — NOT a semantic entailment checker.
 * Candidate rewrites are never trusted solely because evidence is attached.
 * No automatic approval or display as confirmed patient statements.
 */
import {extractTraceableSummary,hasExactProvenance} from '../app/extractive-summary.js';
export const REWRITE_GATE_VERSION='local-rewrite-gate-v1';

function validSpan(original,source){
  if(!source||!Number.isSafeInteger(source.start)||!Number.isSafeInteger(source.end))return false;
  if(source.start<0||source.end<=source.start||source.end>original.length)return false;
  return true;
}
function hasDangerousAddedClaims(text,original){
  // Narrow sentinel list is a *red flag*, not evidence of general semantic safety.
  const flags=[
    /diagn[oó]sticad[oa]/gi,/\b(?:depress[aã]o|bipolaridade|esquizofrenia)\b/gi,
    /\b(?:sempre|nunca)\b/gi,/\b(?:suic[ií]dio|suicida)\b/gi
  ];
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const source=normalize(original);
  return flags.some(pattern=>{
    const flagsInDraft=[...normalize(text).matchAll(pattern)].map(m=>m[0]);
    return flagsInDraft.some(token=>!source.includes(token));
  });
}

/**
 * Proposal schema:
 * {text: string, evidence: [{start,end,text}]}
 * The spans must be exact slices. Even then, a rewritten sentence remains
 * pending user review; exact citations do NOT verify what the rewrite claims.
 */
export function assessRewriteProposal(original,proposal){
  const raw=String(original||'');
  const text=typeof proposal?.text==='string'?proposal.text.trim():'';
  const evidence=Array.isArray(proposal?.evidence)?proposal.evidence:[];
  const failures=[];
  if(!text || text.length>Math.max(600,raw.length*2))failures.push('invalid-output-length');
  if(evidence.length===0||evidence.length>32)failures.push('missing-or-excess-evidence');
  const seen=new Set();
  for(const ref of evidence){
    if(!validSpan(raw,ref)||raw.slice(ref.start,ref.end)!==ref.text){
      failures.push('invalid-source-span');continue;
    }
    const key=ref.start+':'+ref.end;
    if(seen.has(key))failures.push('duplicate-source-span');
    seen.add(key);
  }
  if(hasDangerousAddedClaims(text,raw))failures.push('added-protected-term');
  if(!raw.trim())failures.push('empty-source');
  return {
    version:REWRITE_GATE_VERSION,
    status:failures.length?'reject':'needs-human-review',
    failures:[...new Set(failures)],
    evidenceCount:evidence.length,
    // Always require active consent and editing. The algorithm cannot
    // validate paraphrase fidelity, omissions, clinical meaning or causality.
    automatedSemanticVerification:false,
    canPublishAutomatically:false
  };
}
export function buildSafeExtractiveFallback(original){
  const result=extractTraceableSummary(original);
  // Source-verified only; no model text survives when a proposal fails.
  const sections=result.sections.map(section=>({
    id:section.id,
    title:section.title,
    items:section.items.filter(item=>hasExactProvenance(result.original,item))
  }));
  return {kind:'extractive-fallback',sections,requiresUserApproval:true};
}
