const RULES=Object.freeze([
  {
    id:'clinical-validation',
    pattern:/\b(validado clinicamente|clinicamente validado|efic[aá]cia cl[ií]nica comprovada)\b/i
  },
  {
    id:'diagnosis-claim',
    pattern:/(?<!não\s)(?<!nao\s)\b(diagnostica|diagnosticar|faz diagn[oó]stico|confirma diagn[oó]stico)\b/i
  },
  {
    id:'prescription-claim',
    pattern:/(?<!não\s)(?<!nao\s)\b(prescreve|prescrever|recomenda tratamento)\b/i
  },
  {
    id:'treatment-claim',
    pattern:/(?<!não\s)(?<!nao\s)\b(trata|cura)\s+(ansiedade|depress[aã]o|trauma|transtorno|sintomas?)\b/i
  },
  {
    id:'symptom-reduction',
    pattern:/\b(reduz|reduzir|diminui|diminuir)\s+(sintomas?|ansiedade|depress[aã]o)\b/i
  },
  {
    id:'crisis-prevention',
    pattern:/(?<!não\s)(?<!nao\s)\b(previne|prevenir)\s+(crises?|suic[ií]dio)\b/i
  },
  {
    id:'risk-detection',
    pattern:/(?<!não\s)(?<!nao\s)\b(detecta|detectar|identifica|identificar)\s+(risco\s+de\s+suic[ií]dio|trauma|transtornos?|depend[eê]ncia)\b/i
  },
  {
    id:'therapist-substitution',
    pattern:/(?<!não\s)(?<!nao\s)\b(substitui|substituir)\s+(o\s+)?(seu\s+|sua\s+)?(psic[oó]logo|psic[oó]loga|terapeuta)\b/i
  },
  {
    id:'human-understanding-claim',
    pattern:/(?<!não\s)(?<!nao\s)\b(entende|compreende)\s+(voc[eê]|suas?\s+emo[cç][oõ]es?)\b/i
  },
  {
    id:'psychotherapy-efficacy',
    pattern:/\b(melhora|aumenta)\s+(a\s+)?efic[aá]cia\s+(da\s+)?psicoterapia\b/i
  },
  {
    id:'artificial-therapist-positioning',
    pattern:/\b(psic[oó]logo artificial|terapeuta virtual|terapia por ia|terapia com ia)\b/i
  }
]);

function lineNumberAt(text,index){
  return text.slice(0,index).split(/\r?\n/).length;
}

export function findProhibitedClaims(text){
  const value=String(text || '');
  const findings=[];

  for(const rule of RULES){
    const flags=rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags+'g';
    const pattern=new RegExp(rule.pattern.source,flags);
    for(const match of value.matchAll(pattern)){
      findings.push({
        ruleId:rule.id,
        match:match[0],
        index:match.index,
        line:lineNumberAt(value,match.index)
      });
    }
  }

  return findings.sort((a,b)=>a.index-b.index || a.ruleId.localeCompare(b.ruleId));
}

export function assertNoProhibitedClaims(text,{source='content'}={}){
  const findings=findProhibitedClaims(text);
  if(!findings.length) return true;

  const detail=findings
    .map(item=>`${source}:${item.line} [${item.ruleId}] "${item.match}"`)
    .join('\n');
  throw new Error('Claims não permitidos encontrados:\n'+detail);
}

export const CLAIM_RULE_IDS=Object.freeze(RULES.map(rule=>rule.id));
