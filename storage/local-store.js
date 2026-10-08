const LEGACY_KEY='ombro-amigo.local-state.v2';
const OLDEST_KEY='ombro-amigo.session.v1';
const ACK_KEY='ombro-amigo.acknowledgement.v1';

function browserStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function readLegacyConversationState(storage=browserStorage()) {
  if (!storage) return null;
  try {
    const raw=storage.getItem(LEGACY_KEY);
    if(raw) {
      const parsed=JSON.parse(raw);
      if(parsed?.session) {
        return {
          version:Number(parsed.version || 2),
          savedAt:parsed.savedAt || null,
          session:parsed.session,
          view:parsed.view || 'conversation',
          summaryDraft:String(parsed.summaryDraft || ''),
          summaryModel:parsed.summaryModel || null
        };
      }
    }

    const oldest=storage.getItem(OLDEST_KEY);
    if(!oldest) return null;
    return {
      version:1,
      savedAt:null,
      session:JSON.parse(oldest),
      view:'conversation',
      summaryDraft:'',
      summaryModel:null
    };
  } catch {
    return null;
  }
}

export function clearLegacyConversationState(storage=browserStorage()) {
  if (!storage) return;
  storage.removeItem(LEGACY_KEY);
  storage.removeItem(OLDEST_KEY);
}

export function hasLegacyConversationState(storage=browserStorage()) {
  return Boolean(readLegacyConversationState(storage));
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
