import { createConversation, openingQuestion, nextQuestion, buildSummary } from '../conversation/engine.js';
import { saveLocalState, loadLocalState, clearLocalState } from '../storage/local-store.js';

const home=document.querySelector('#home-view');
const conversationView=document.querySelector('#conversation-view');
const summaryView=document.querySelector('#summary-view');
const messages=document.querySelector('#messages');
const reply=document.querySelector('#reply');
const replyForm=document.querySelector('#reply-form');
const depthLabel=document.querySelector('#depth-label');
const summaryText=document.querySelector('#summary-text');
const resumePanel=document.querySelector('#resume-panel');
const resumeInfo=document.querySelector('#resume-info');

let session=null;
let currentView='home';

function show(view) {
  [home,conversationView,summaryView].forEach(node=>node.classList.add('hidden'));
  view.classList.remove('hidden');
  currentView=view===summaryView?'summary':view===conversationView?'conversation':'home';
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
  persist('conversation');
}

function resumeSavedConversation() {
  const saved=loadLocalState();
  if(!saved?.session) return;
  session=saved.session;
  depthLabel.textContent=depthName(session.depth);
  renderConversation(session);
  summaryText.value=saved.summaryDraft || '';
  if(saved.view==='summary') {
    if(!summaryText.value) summaryText.value=buildSummary(session);
    show(summaryView);
  } else {
    show(conversationView);
  }
}

function refreshResumePanel() {
  const saved=loadLocalState();
  const hasConversation=Boolean(saved?.session?.entries?.length || saved?.session?.transcript?.length);
  resumePanel.classList.toggle('hidden',!hasConversation);
  if(!hasConversation) return;
  const when=saved.savedAt ? new Date(saved.savedAt).toLocaleString('pt-BR') : 'salva anteriormente';
  resumeInfo.textContent=`${depthName(saved.session.depth)} · ${when} · somente neste aparelho`;
}

function forgetConversation() {
  clearLocalState();
  session=null;
  summaryText.value='';
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

document.querySelector('#say-this').addEventListener('click',()=>{
  if(!session)return;
  summaryText.value=buildSummary(session);
  show(summaryView);
  persist('summary');
});

document.querySelector('#back-home').addEventListener('click',()=>{
  persist('conversation');
  show(home);
  refreshResumePanel();
});

document.querySelector('#accept-summary').addEventListener('click',()=>{
  persist('summary');
  alert('Síntese confirmada. Ela continua somente neste aparelho.');
});

document.querySelector('#edit-summary').addEventListener('click',()=>summaryText.focus());
document.querySelector('#reject-summary').addEventListener('click',()=>show(conversationView));
document.querySelector('#resume-conversation').addEventListener('click',resumeSavedConversation);
document.querySelector('#new-conversation').addEventListener('click',forgetConversation);
document.querySelector('#delete-conversation').addEventListener('click',()=>{
  if(confirm('Apagar a conversa salva neste aparelho? Essa ação não pode ser desfeita.')) {
    forgetConversation();
  }
});

summaryText.addEventListener('input',()=>persist('summary'));
window.addEventListener('pagehide',()=>persist(currentView));

refreshResumePanel();

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
