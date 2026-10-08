import {
  createConversation,
  openingQuestion,
  nextQuestion,
  buildStructuredSummary
} from '../conversation/engine.js';

const EXCLUDED_CATEGORIES=new Set(['control','question','uncertainty']);

function normalize(text){
  return String(text || '').trim().replace(/\s+/g,' ');
}

function unique(values){
  return [...new Set(values.filter(Boolean))];
}

export function auditSummaryGrounding(state){
  const structured=buildStructuredSummary(state);
  const entries=Array.isArray(state?.entries) ? state.entries : [];

  const eligible=entries
    .filter(entry=>entry?.source==='declared' && entry?.text)
    .filter(entry=>!(entry.categories || []).some(category=>EXCLUDED_CATEGORIES.has(category)))
    .map(entry=>normalize(entry.text));

  const excluded=entries
    .filter(entry=>entry?.text)
    .filter(entry=>(entry.categories || []).some(category=>EXCLUDED_CATEGORIES.has(category)))
    .map(entry=>normalize(entry.text));

  const sectionClaims=Object.fromEntries(
    Object.entries(structured).map(([section,claims])=>[
      section,
      (claims || []).map(normalize).filter(Boolean)
    ])
  );

  const claims=Object.values(sectionClaims).flat();
  const eligibleSet=new Set(eligible);
  const excludedSet=new Set(excluded);

  const unsupported=claims.filter(claim=>!eligibleSet.has(claim));
  const excludedLeaks=claims.filter(claim=>excludedSet.has(claim));
  const uniqueEligible=unique(eligible);
  const uniqueClaims=unique(claims);
  const coveredSources=uniqueEligible.filter(source=>uniqueClaims.includes(source));

  return {
    totals:{
      declared:entries.filter(entry=>entry?.source==='declared').length,
      eligibleSources:uniqueEligible.length,
      excludedSources:unique(excluded).length,
      summaryClaims:claims.length,
      uniqueSummaryClaims:uniqueClaims.length
    },
    rates:{
      unsupportedClaimRate:claims.length ? unsupported.length/claims.length : 0,
      sourceCoverage:uniqueEligible.length ? coveredSources.length/uniqueEligible.length : 1
    },
    unsupportedClaimCount:unsupported.length,
    unsupportedClaims:unique(unsupported),
    excludedLeakCount:excludedLeaks.length,
    excludedLeaks:unique(excludedLeaks),
    coveredSources,
    eligibleSources:uniqueEligible,
    excludedSources:unique(excluded),
    sections:sectionClaims
  };
}

export function simulateSummaryGroundingCase(definition){
  const state=createConversation({
    mode:definition?.mode || 'session',
    depth:definition?.depth || 'medium'
  });
  openingQuestion(state);
  for(const turn of definition?.turns || []) nextQuestion(state,turn);

  return {
    id:definition?.id || null,
    audit:auditSummaryGrounding(state),
    state
  };
}

export function aggregateGroundingAudits(results){
  const audits=results.map(result=>result.audit || result);
  const totalClaims=audits.reduce((sum,audit)=>sum+audit.totals.summaryClaims,0);
  const totalUnsupported=audits.reduce((sum,audit)=>sum+audit.unsupportedClaimCount,0);
  const totalEligible=audits.reduce((sum,audit)=>sum+audit.totals.eligibleSources,0);
  const totalCovered=audits.reduce((sum,audit)=>sum+audit.coveredSources.length,0);
  const totalExcludedLeaks=audits.reduce((sum,audit)=>sum+audit.excludedLeakCount,0);
  const leaks=audits.flatMap(audit=>audit.excludedLeaks);

  return {
    cases:audits.length,
    totalClaims,
    totalUnsupported,
    unsupportedClaimRate:totalClaims ? totalUnsupported/totalClaims : 0,
    totalEligibleSources:totalEligible,
    totalCoveredSources:totalCovered,
    sourceCoverage:totalEligible ? totalCovered/totalEligible : 1,
    excludedLeakCount:totalExcludedLeaks,
    excludedLeaks:unique(leaks)
  };
}
