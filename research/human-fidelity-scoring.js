/**
 * Human judgement aggregation for SYNTHETIC REVIEW ONLY.
 * This is not clinical validation, semantic inference or automatic approval.
 */
export const REVIEW_RUBRIC_VERSION='human-fidelity-rubric-v1';
export const FAILURE_FIELDS=Object.freeze(['negation','thirdParty','time','unsupportedClaims','omissions']);
export const REVIEW_VALUES=Object.freeze(['pass','fail','not-reviewed']);
export const NATURALNESS_VALUES=Object.freeze(['natural','awkward','unusable','not-reviewed']);

export function evaluateReviewFile(document){
  if(document?.schema!=='synthetic-review-v1' || !Array.isArray(document.reviews))
    return {valid:false,reason:'invalid-document-schema'};
  if(document.reviews.length===0)return {valid:false,reason:'no-cases'};
  const ids=new Set(),results=[];
  for(const row of document.reviews){
    if(typeof row?.id!=='string'||!row.id||ids.has(row.id))
      return {valid:false,reason:'invalid-or-duplicate-id'};
    ids.add(row.id);
    if(typeof row.original!=='string'||typeof row.candidate!=='string')
      return {valid:false,reason:'missing-synthetic-pair'};
    if(!row.reviewer || FAILURE_FIELDS.some(k=>!REVIEW_VALUES.includes(row.reviewer[k]))
      || !NATURALNESS_VALUES.includes(row.reviewer.naturalnessPtBR))
      return {valid:false,reason:'invalid-review-value'};
    const pending=FAILURE_FIELDS.some(k=>row.reviewer[k]==='not-reviewed')
      ||row.reviewer.naturalnessPtBR==='not-reviewed';
    const failures=FAILURE_FIELDS.filter(k=>row.reviewer[k]==='fail');
    if(row.reviewer.naturalnessPtBR==='unusable')failures.push('naturalnessPtBR');
    const lexicalFailure=row.checks?.gateStatus==='reject';
    const disposition=pending?'pending':failures.length||lexicalFailure?'rejected':'reviewed-no-observed-critical-errors';
    results.push({id:row.id,disposition,failures,lexicalFailure});
  }
  const evaluated=results.filter(r=>r.disposition!=='pending');
  const rejected=results.filter(r=>r.disposition==='rejected');
  return {
    valid:true,rubric:REVIEW_RUBRIC_VERSION,total:results.length,
    pending:results.length-evaluated.length,evaluated:evaluated.length,rejected:rejected.length,
    allCasesReviewed:evaluated.length===results.length,
    anyCriticalError:rejected.length>0,
    // Passing this narrow synthetic set NEVER licenses publication.
    approvedForPatients:false,provenSafe:false,clinicalValidation:false,
    results
  };
}
