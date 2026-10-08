const KEY='ombro-amigo.local-state.v2';
const LEGACY_KEY='ombro-amigo.session.v1';
const ACK_KEY='ombro-amigo.acknowledgement.v1';

function browserStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function saveLocalState(state, storage=browserStorage()) {
  if (!storage) return null;
  const payload={
    version:2,
    savedAt:new Date().toISOString(),
    session:state?.session || null,
    view:state?.view || 'conversation',
    summaryDraft:String(state?.summaryDraft || ''),
    summaryModel:state?.summaryModel || null
  };
  storage.setItem(KEY,JSON.stringify(payload));
  return payload;
}

export function loadLocalState(storage=browserStorage()) {
  if (!storage) return null;
  try {
    const raw=storage.getItem(KEY);
    if(raw) {
      const parsed=JSON.parse(raw);
      if(parsed?.version===2 && parsed?.session) return parsed;
    }

    const legacy=storage.getItem(LEGACY_KEY);
    if(!legacy) return null;
    const session=JSON.parse(legacy);
    return {
      version:1,
      savedAt:null,
      session,
      view:'conversation',
      summaryDraft:'',
      summaryModel:null
    };
  } catch {
    return null;
  }
}

export function clearLocalState(storage=browserStorage()) {
  if (!storage) return;
  storage.removeItem(KEY);
  storage.removeItem(LEGACY_KEY);
}


export function saveAcknowledgement(storage=browserStorage()) {
  if (!storage) return null;
  const acknowledgement={
    version:1,
    acceptedAt:new Date().toISOString()
  };
  storage.setItem(ACK_KEY,JSON.stringify(acknowledgement));
  return acknowledgement;
}

export function loadAcknowledgement(storage=browserStorage()) {
  if (!storage) return null;
  try {
    const raw=storage.getItem(ACK_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed?.version===1 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearAcknowledgement(storage=browserStorage()) {
  if (!storage) return;
  storage.removeItem(ACK_KEY);
}


export function getLocalDataStatus(storage=browserStorage()) {
  const state=loadLocalState(storage);
  const acknowledgement=loadAcknowledgement(storage);
  return {
    hasConversation:Boolean(state?.session),
    savedAt:state?.savedAt || null,
    hasAcknowledgement:Boolean(acknowledgement),
    acceptedAt:acknowledgement?.acceptedAt || null
  };
}

export function clearAllLocalData(storage=browserStorage()) {
  if (!storage) return;
  clearLocalState(storage);
  clearAcknowledgement(storage);
}
