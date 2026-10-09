/**
 * Reject thought traces, markup, echoes, blank content.
 * This is a format gate, NOT semantic verification.
 */
export function extractCandidateText(output,{original='',maxCharacters=1600}={}){
  const raw=output?.[0]?.generated_text;
  if(typeof raw!=='string' && !Array.isArray(raw))return {ok:false,reason:'unexpected-model-output'};
  let text;
  if(Array.isArray(raw)){
    const messages=raw.filter(m=>m?.role==='assistant');
    if(messages.length!==1 || typeof messages[0].content!=='string')
      return {ok:false,reason:'unexpected-chat-messages'};
    text=messages[0].content;
  }else text=raw;
  text=text.trim();
  if(!text)return {ok:false,reason:'empty-output'};
  if(text.length>maxCharacters)return {ok:false,reason:'output-too-long'};
  if(/<\/?think\b|<\|(?:im_start|im_end|assistant|user|system|fim_suffix)\|>|```|<tool_call|<\/tool_call>/i.test(text))
    return {ok:false,reason:'model-control-markup'};
  if(/(?:^|\n)\s*(?:system|assistant|user|usuário|sistema)\s*:/im.test(text))
    return {ok:false,reason:'role-echo'};
  if(text.includes('Relato original:')||text.includes('Reescreva o relato'))return {ok:false,reason:'prompt-echo'};
  if(text===String(original).trim())return {ok:true,text,verbatim:true};
  return {ok:true,text,verbatim:false};
}
