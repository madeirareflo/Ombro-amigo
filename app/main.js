import { createConversation, openingQuestion, nextQuestion, skipQuestion, buildSummary } from '../conversation/engine.js';
import {
  saveLocalState,
  loadLocalState,
  clearLocalState,
  saveAcknowledgement,
  loadAcknowledgement,
  getLocalDataStatus,
  clearAllLocalData
} from '../storage/local-store.js';
import { urgentHelpGuidance } from '../safety/policy.js';
import { copyText } from './clipboard.js';

const onboardingView=document.querySelector('#onboarding-view');
const home=document.querySelector('#home-view');
const conversationView=document.querySelector('#conversation-view');
const summaryView=document.querySelector('#summary-view');
const privacyView=document.querySelector('#privacy-view');
const safetyView=document.querySelector('#safety-view');
const safetyMessage=document.querySelector('#safety-message');
const safetyResources=document.querySelector('#safety-resources');
const messages=document.querySelector('#messages');
const reply=document.querySelector('#reply');
const replyForm=document.querySelector('#reply-form');
const depthLabel=document.querySelector('#depth-label');
const summaryText=document.querySelector('#summary-text');
const resumePanel=document.querySelector('#resume-panel');
const resumeInfo=document.querySelector('#resume-info');
const copyPanel=document.querySelector('#copy-panel');
const copyStatus=document.querySelector('#copy-status');
const localDataStatus=document.querySelector('#local-data-status');

let session=null;
let currentView='onboarding';
let summaryApproved=false;

function show(view) {
  [onboardingView,home,conversationView,summaryView,privacyView,safetyView].forEach(node=>node.classList.add('hidden'));
  view.classList.remove('hidden');
  if(view===privacyView) refreshLocalDataStatus();
  currentView=view===summaryView?'summary':view===conversationView?'conversation':view===privacyView?'privacy':view===safetyView?'safety':view===onboardingView?'onboarding':'home';
}

function addMessage(kind,text) {
  const node=document.createElement('div');
  node.className=`message ${kind}`;
  node.textContent=text;
  messages.appendChild(node);
}

function renderConversation(savedSession) {
  messages.replaceChildren();
  const transcript=Array.isArray(savedSession.transcript) && savedSession.transcript.length
    ? savedSession.transcript
    : legacyTranscript(savedSession);
  transcript.forEach(item=>addMessage(item.role==='user'?'user':'ai',item.text));
  messages.lastElementChild?.scrollIntoView({block:'end'});
}

function legacyTranscript(savedSession) {
  const result=[];
  if(savedSession.entries?.length) {
    savedSession.entries.forEach(item=>result.push({role:'user',text:item.text}));
  }
  if(savedSession.lastQuestion) result.push({role:'ai',text:savedSession.lastQuestion});
  return result;
}

function persist(view=currentView) {
  if(!session) return;
  saveLocalState({
    session,
    view,
    summaryDraft:summaryText.value
  });
  refreshResumePanel();
}

function hasAcknowledgedTest() {
  return Boolean(loadAcknowledgement());
}

function landingView() {
  return hasAcknowledgedTest() ? home : onboardingView;
}

function depthName(depth) {
  return {light:'Só começar',medium:'Falar um pouco',deep:'Organizar a fundo'}[depth] || 'Conversa';
}

function start(mode) {
  const depth=document.querySelector('input[name="depth"]:checked')?.value||'light';
  session=createConversation({mode,depth});
  messages.replaceChildren();
  depthLabel.textContent=depthName(depth);
  show(conversationView);
  addMessage('ai',openingQuestion(session));
  summaryText.value='';
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  persist('conversation');
}

function resumeSavedConversation() {
  const saved=loadLocalState();
  if(!saved?.session) return;
  session=saved.session;
  depthLabel.textContent=depthName(session.depth);
  renderConversation(session);
  summaryText.value=saved.summaryDraft || '';
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  if(saved.view==='summary') {
    if(!summaryText.value) summaryText.value=buildSummary(session);
    show(summaryView);
  } else {
    show(conversationView);
  }
}

function refreshLocalDataStatus() {
  const status=getLocalDataStatus();
  const parts=[];
  parts.push(status.hasConversation
    ? `Conversa salva: sim${status.savedAt ? ` · última gravação ${new Date(status.savedAt).toLocaleString('pt-BR')}` : ''}`
    : 'Conversa salva: não');
  parts.push(status.hasAcknowledgement ? 'Aviso inicial confirmado: sim' : 'Aviso inicial confirmado: não');
  localDataStatus.textContent=parts.join(' · ');
}

function refreshResumePanel() {
  const saved=loadLocalState();
  const hasConversation=Boolean(saved?.session?.entries?.length || saved?.session?.transcript?.length);
  resumePanel.classList.toggle('hidden',!hasConversation);
  if(!hasConversation) return;
  const when=saved.savedAt ? new Date(saved.savedAt).toLocaleString('pt-BR') : 'salva anteriormente';
  resumeInfo.textContent=`${depthName(saved.session.depth)} · ${when} · somente neste aparelho`;
}

function showUrgentHelp() {
  const guidance=urgentHelpGuidance('BR');
  safetyMessage.textContent=guidance.message;
  safetyResources.replaceChildren();
  guidance.resources.forEach(resource=>{
    const item=document.createElement('div');
    item.className='safety-resource';
    const label=document.createElement('span');
    label.textContent=resource.label;
    const value=document.createElement('strong');
    value.textContent=resource.value;
    item.append(label,value);
    safetyResources.appendChild(item);
  });
  if(guidance.outside) {
    const note=document.createElement('p');
    note.className='muted small';
    note.textContent=guidance.outside;
    safetyResources.appendChild(note);
  }
  show(safetyView);
}

function forgetConversation() {
  clearLocalState();
  session=null;
  summaryText.value='';
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  messages.replaceChildren();
  refreshResumePanel();
  show(home);
}

document.querySelectorAll('[data-start]').forEach(button=>{
  button.addEventListener('click',()=>start(button.dataset.start));
});

replyForm.addEventListener('submit',event=>{
  event.preventDefault();
  const text=reply.value.trim();
  if(!text||!session)return;
  addMessage('user',text);
  reply.value='';
  const question=nextQuestion(session,text);
  addMessage('ai',question);
  persist('conversation');
});

document.querySelector('#skip-question').addEventListener('click',()=>{
  if(!session) return;
  const question=skipQuestion(session);
  addMessage('user','Prefiro não responder a essa pergunta.');
  addMessage('ai',question);
  persist('conversation');
});

document.querySelector('#say-this').addEventListener('click',()=>{
  if(!session)return;
  summaryText.value=buildSummary(session);
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  show(summaryView);
  persist('summary');
});

document.querySelector('#back-home').addEventListener('click',()=>{
  persist('conversation');
  show(home);
  refreshResumePanel();
});

document.querySelector('#accept-summary').addEventListener('click',()=>{
  summaryApproved=true;
  copyPanel.classList.remove('hidden');
  copyStatus.textContent='A síntese continua somente neste aparelho até você escolher copiá-la.';
  persist('summary');
});

document.querySelector('#edit-summary').addEventListener('click',()=>{
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  summaryText.focus();
});
document.querySelector('#reject-summary').addEventListener('click',()=>{
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  show(conversationView);
});
document.querySelector('#resume-conversation').addEventListener('click',resumeSavedConversation);
document.querySelector('#acknowledge-test').addEventListener('click',()=>{
  saveAcknowledgement();
  show(home);
  refreshResumePanel();
});
document.querySelector('#onboarding-privacy').addEventListener('click',()=>show(privacyView));
document.querySelector('#review-onboarding').addEventListener('click',()=>show(onboardingView));
document.querySelector('#delete-all-local').addEventListener('click',()=>{
  if(!confirm('Apagar conversa, rascunho e confirmação deste teste neste navegador? Essa ação não pode ser desfeita.')) return;
  clearAllLocalData();
  session=null;
  summaryText.value='';
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
  messages.replaceChildren();
  show(onboardingView);
});
document.querySelector('#open-privacy').addEventListener('click',()=>show(privacyView));
document.querySelector('#privacy-link').addEventListener('click',()=>show(privacyView));
document.querySelector('#privacy-back').addEventListener('click',()=>{
  show(landingView());
  if(hasAcknowledgedTest()) refreshResumePanel();
});
document.querySelectorAll('[data-urgent-help]').forEach(button=>{
  button.addEventListener('click',showUrgentHelp);
});
document.querySelector('#safety-back').addEventListener('click',()=>{
  if(session) {
    show(conversationView);
  } else {
    show(landingView());
    if(hasAcknowledgedTest()) refreshResumePanel();
  }
});
document.querySelector('#new-conversation').addEventListener('click',forgetConversation);
document.querySelector('#delete-conversation').addEventListener('click',()=>{
  if(confirm('Apagar a conversa salva neste aparelho? Essa ação não pode ser desfeita.')) {
    forgetConversation();
  }
});

document.querySelector('#copy-summary').addEventListener('click',async()=>{
  if(!summaryApproved) return;
  try {
    await copyText(summaryText.value);
    copyStatus.textContent='Copiado para a área de transferência. O app não enviou o texto para nenhum servidor.';
  } catch {
    copyStatus.textContent='Não foi possível copiar automaticamente. Selecione o texto acima e copie manualmente.';
  }
});

summaryText.addEventListener('input',()=>{
  if(summaryApproved) {
    summaryApproved=false;
    copyPanel.classList.add('hidden');
    copyStatus.textContent='';
  }
  persist('summary');
});
window.addEventListener('pagehide',()=>{
  if(currentView==='conversation' || currentView==='summary') persist(currentView);
});

if(hasAcknowledgedTest()) {
  show(home);
  refreshResumePanel();
} else {
  show(onboardingView);
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
