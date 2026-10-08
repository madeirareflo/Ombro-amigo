import { createConversation, openingQuestion, nextQuestion, buildSummary } from '../conversation/engine.js';
import { saveSession } from '../storage/local-store.js';

const home=document.querySelector('#home-view');
const conversationView=document.querySelector('#conversation-view');
const summaryView=document.querySelector('#summary-view');
const messages=document.querySelector('#messages');
const reply=document.querySelector('#reply');
const replyForm=document.querySelector('#reply-form');
const depthLabel=document.querySelector('#depth-label');
const summaryText=document.querySelector('#summary-text');

let session=null;

function show(view) {
  [home,conversationView,summaryView].forEach(node=>node.classList.add('hidden'));
  view.classList.remove('hidden');
}

function addMessage(kind,text) {
  const node=document.createElement('div');
  node.className=`message ${kind}`;
  node.textContent=text;
  messages.appendChild(node);
  node.scrollIntoView({block:'end',behavior:'smooth'});
}

function start(mode) {
  const depth=document.querySelector('input[name="depth"]:checked')?.value||'light';
  session=createConversation({mode,depth});
  messages.replaceChildren();
  depthLabel.textContent={light:'Só começar',medium:'Falar um pouco',deep:'Organizar a fundo'}[depth];
  show(conversationView);
  addMessage('ai',openingQuestion(session));
  saveSession(session);
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
  saveSession(session);
});

document.querySelector('#say-this').addEventListener('click',()=>{
  if(!session)return;
  summaryText.value=buildSummary(session);
  show(summaryView);
});

document.querySelector('#back-home').addEventListener('click',()=>show(home));
document.querySelector('#accept-summary').addEventListener('click',()=>{
  alert('Síntese confirmada. Nesta versão, ela continua somente no seu aparelho.');
});
document.querySelector('#edit-summary').addEventListener('click',()=>summaryText.focus());
document.querySelector('#reject-summary').addEventListener('click',()=>show(conversationView));

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
