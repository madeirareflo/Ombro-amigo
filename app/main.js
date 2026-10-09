import { createConversation, openingQuestion, nextQuestion, skipQuestion, buildStructuredSummary, detectConversationControlIntent } from '../conversation/engine.js';
import {
  saveAcknowledgement,
  loadAcknowledgement,
  clearAcknowledgement
} from '../storage/local-store.js';
import {
  initializeConversationStorage,
  saveConversationState,
  loadConversationState,
  clearConversationState,
  clearAllSensitiveState,
  getConversationStorageStatus
} from '../storage/secure-store.js';
import { urgentHelpGuidance, detectExplicitImmediateDanger, assessSafety } from '../safety/policy.js';
import { copyText } from './clipboard.js';
import {
  createSummaryModel,
  normalizeSummaryModel,
  summaryModelToText,
  addEditedItem,
  removeSummaryItem
} from './summary-model.js';

const $=selector=>document.querySelector(selector);
const onboardingView=$('#onboarding-view');
const home=$('#home-view');
const conversationView=$('#conversation-view');
const summaryView=$('#summary-view');
const privacyView=$('#privacy-view');
const safetyView=$('#safety-view');
const safetyMessage=$('#safety-message');
const safetyResources=$('#safety-resources');
const messages=$('#messages');
const reply=$('#reply');
const replyForm=$('#reply-form');
const freePanel=$('#free-writing-panel');
const freeText=$('#free-writing-text');
const freeStatus=$('#free-writing-status');
const depthLabel=$('#depth-label');
const summaryText=$('#summary-text');
const summaryEditor=$('#summary-editor');
const resumePanel=$('#resume-panel');
const resumeInfo=$('#resume-info');
const copyPanel=$('#copy-panel');
const copyStatus=$('#copy-status');
const localDataStatus=$('#local-data-status');
const adultConfirm=$('#adult-confirm');
const acknowledgeButton=$('#acknowledge-test');
const pwaStatus=$('#pwa-status');
const persistStatus=$('#persist-status');
const refreshAppStatus=$('#refresh-app-status');

let session=null;
let currentView='onboarding';
let summaryApproved=false;
let summaryModel=null;

function focusViewEntry(view){
  if(view===conversationView){
    reply.focus({preventScroll:true});
    return;
  }

  const labelledBy=view.getAttribute('aria-labelledby');
  const heading=labelledBy?document.getElementById(labelledBy):null;
  heading?.focus({preventScroll:true});
}

function show(view,{focusEntry=true}={}){
  [onboardingView,home,conversationView,summaryView,privacyView,safetyView].forEach(node=>node.classList.add('hidden'));
  view.classList.remove('hidden');
  if(view===privacyView) void refreshLocalDataStatus();
  currentView=view===summaryView?'summary':view===conversationView?'conversation':view===privacyView?'privacy':view===safetyView?'safety':view===onboardingView?'onboarding':'home';
  updateProgress();
  if(focusEntry) focusViewEntry(view);
}

function updateProgress(){
  if(currentView!=='conversation') return;
  const turn=Number(session?.turn || 0);
  const stage=turn<1?'start':turn<3?'understand':'organize';
  document.querySelectorAll('#conversation-view [data-progress]').forEach(node=>{
    node.classList.toggle('active',node.dataset.progress===stage);
  });
}

function addMessage(kind,text){
  const node=document.createElement('div');
  node.className='message '+kind;
  node.textContent=text;
  messages.appendChild(node);
}

function renderConversation(savedSession){
  messages.replaceChildren();
  const transcript=Array.isArray(savedSession.transcript) && savedSession.transcript.length
    ? savedSession.transcript
    : legacyTranscript(savedSession);
  transcript.forEach(item=>addMessage(item.role==='user'?'user':'ai',item.text));
  messages.lastElementChild?.scrollIntoView({block:'end'});
}

function legacyTranscript(savedSession){
  const result=[];
  if(savedSession.entries?.length) savedSession.entries.forEach(item=>result.push({role:'user',text:item.text}));
  if(savedSession.lastQuestion) result.push({role:'ai',text:savedSession.lastQuestion});
  return result;
}

function syncSummaryText(){
  summaryText.value=summaryModelToText(summaryModel);
}

function invalidateSummaryApproval(){
  summaryApproved=false;
  copyPanel.classList.add('hidden');
  copyStatus.textContent='';
}

function findSummaryItem(itemId){
  return [...summaryEditor.querySelectorAll('textarea[data-item-id]')]
    .find(node=>node.dataset.itemId===String(itemId)) || null;
}

function focusSummaryItem(itemId,{select=false}={}){
  const target=findSummaryItem(itemId);
  if(!target) return false;
  target.focus();
  if(select) target.select();
  return true;
}

function focusSummaryAdd(sectionId){
  const target=[...summaryEditor.querySelectorAll('button[data-add-section]')]
    .find(node=>node.dataset.addSection===String(sectionId)) || null;
  target?.focus();
  return Boolean(target);
}

function renderSummaryEditor(){
  summaryEditor.replaceChildren();
  if(!summaryModel) return;

  for(const section of summaryModel.sections){
    const wrapper=document.createElement('section');
    wrapper.className='summary-section';
    wrapper.dataset.sectionId=section.id;

    const header=document.createElement('div');
    header.className='summary-section-header';
    const title=document.createElement('h3');
    title.id='summary-section-'+section.id+'-title';
    title.textContent=section.title;
    wrapper.setAttribute('aria-labelledby',title.id);
    const structure=document.createElement('span');
    structure.className='structure-badge';
    structure.textContent='Estrutura do app';
    header.append(title,structure);
    wrapper.appendChild(header);

    if(!section.items.length){
      const empty=document.createElement('p');
      empty.className='empty-section';
      empty.textContent='Ainda não ficou claro no que você escreveu.';
      wrapper.appendChild(empty);
    }

    for(const item of section.items){
      const row=document.createElement('div');
      row.className='summary-item';
      const area=document.createElement('textarea');
      area.rows=2;
      area.value=item.text;
      area.dataset.itemId=item.id;
      area.setAttribute('aria-label',section.title+' — ponto da síntese');
      const badge=document.createElement('span');
      badge.id='summary-origin-'+section.id+'-'+section.items.indexOf(item);
      badge.className='origin-badge';
      badge.textContent=item.origin==='edited'?'Você editou':'Você escreveu';
      area.setAttribute('aria-describedby',badge.id);
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='remove-item';
      remove.textContent='Remover';
      remove.setAttribute('aria-label','Remover ponto de '+section.title);

      area.addEventListener('input',()=>{
        item.text=area.value;
        item.origin='edited';
        badge.textContent='Você editou';
        invalidateSummaryApproval();
        syncSummaryText();
        void persist('summary');
      });
      remove.addEventListener('click',()=>{
        const index=section.items.findIndex(entry=>entry.id===item.id);
        const fallbackId=section.items[index+1]?.id || section.items[index-1]?.id || null;
        summaryModel=removeSummaryItem(summaryModel,section.id,item.id);
        invalidateSummaryApproval();
        syncSummaryText();
        renderSummaryEditor();
        if(!fallbackId || !focusSummaryItem(fallbackId)) focusSummaryAdd(section.id);
        void persist('summary');
      });
      row.append(area,badge,remove);
      wrapper.appendChild(row);
    }

    const add=document.createElement('button');
    add.type='button';
    add.className='add-item';
    add.dataset.addSection=section.id;
    add.textContent='+ Adicionar um ponto com minhas palavras';
    add.addEventListener('click',()=>{
      summaryModel=addEditedItem(summaryModel,section.id,'Novo ponto');
      const updatedSection=summaryModel.sections.find(entry=>entry.id===section.id);
      const addedId=updatedSection?.items.at(-1)?.id || null;
      invalidateSummaryApproval();
      syncSummaryText();
      renderSummaryEditor();
      if(addedId) focusSummaryItem(addedId,{select:true});
      void persist('summary');
    });
    wrapper.appendChild(add);
    summaryEditor.appendChild(wrapper);
  }
}

function createOrRestoreSummary(savedModel=null){
  const structured=session?.mode==='free'
    ? {facts:(session.entries||[]).map(entry=>entry.text).filter(Boolean),emotions:[],difficulties:[],sessionPoints:[]}
    : buildStructuredSummary(session);
  summaryModel=normalizeSummaryModel(savedModel) || createSummaryModel(structured);
  syncSummaryText();
  renderSummaryEditor();
  invalidateSummaryApproval();
}

async function persist(view=currentView){
  if(!session) return null;
  return saveConversationState({
    session,
    view,
    summaryDraft:summaryText.value,
    summaryModel
  });
}

function hasAcknowledgedTest(){
  return Boolean(loadAcknowledgement());
}

function landingView(){
  return hasAcknowledgedTest()?home:onboardingView;
}

function depthName(depth){
  return {light:'Só começar',medium:'Falar um pouco',deep:'Mais detalhes'}[depth] || 'Conversa';
}

function configureWritingMode(){
  const free=session?.mode==='free';
  freePanel.classList.toggle('hidden',!free);
  messages.classList.toggle('hidden',free);
  replyForm.classList.toggle('hidden',free);
  const progress=conversationView.querySelector('.progress-track');
  if(progress) progress.classList.toggle('hidden',free);
  if(!free) freeText.value='';
}

function start(mode){
  const depth=document.querySelector('input[name="depth"]:checked')?.value||'light';
  session=createConversation({mode,depth});
  if(mode==='free'){
    session.lastQuestion='';
    session.transcript=[];
    session.ruleHistory=[];
    session.entries=[];
    freeText.value='';
    freeStatus.textContent='Use “Guardar texto” para salvar localmente antes de sair.';
  }
  summaryModel=null;
  messages.replaceChildren();
  depthLabel.textContent=mode==='free'?'Escrita livre':depthName(depth);
  configureWritingMode();
  show(conversationView);
  if(mode!=='free') addMessage('ai',openingQuestion(session));
  summaryText.value='';
  invalidateSummaryApproval();
  void persist('conversation');
}

async function resumeSavedConversation(){
  const saved=await loadConversationState();
  if(!saved?.session) return;
  session=saved.session;
  depthLabel.textContent=session.mode==='free'?'Escrita livre':depthName(session.depth);
  configureWritingMode();
  if(session.mode==='free') freeText.value=(session.entries||[]).map(item=>item.text).join('\n\n');
  else renderConversation(session);
  summaryModel=normalizeSummaryModel(saved.summaryModel);
  summaryText.value=saved.summaryDraft || '';
  invalidateSummaryApproval();
  if(saved.view==='summary'){
    createOrRestoreSummary(summaryModel);
    show(summaryView);
  }else{
    show(conversationView);
  }
}

async function refreshLocalDataStatus(){
  const status=await getConversationStorageStatus();
  const acknowledgement=loadAcknowledgement();
  const storageDescription=status.mode==='encrypted-indexeddb'
    ? 'Armazenamento da conversa: cifrado localmente no navegador'
    : status.mode==='locked-indexeddb'
      ? 'Armazenamento anterior: cifrado, mas sem a chave local necessária para abrir'
      : 'Armazenamento da conversa: somente na memória desta aba';

  const parts=[
    status.hasConversation
      ? 'Conversa disponível: sim'+(status.savedAt?' · '+new Date(status.savedAt).toLocaleString('pt-BR'):'')
      : 'Conversa disponível: não',
    storageDescription,
    acknowledgement?'Aviso inicial confirmado: sim':'Aviso inicial confirmado: não'
  ];

  if(status.recoveredFromBackup){
    parts.push('A cópia anterior cifrada foi usada porque o registro atual não pôde ser lido');
  }
  if(status.legacyPlaintextPresent){
    parts.push('Existe uma conversa antiga em texto local aguardando migração segura');
  }
  if(status.hasUnreadableData){
    parts.push('Os dados cifrados anteriores foram preservados e não serão sobrescritos. Novas alterações ficam apenas em memória até você apagar os dados inacessíveis e começar de novo');
  }
  if(status.error && !['recovered-from-backup','missing-encryption-key'].includes(status.error)){
    parts.push('O navegador relatou uma falha de persistência; confira antes de fechar esta página');
  }

  localDataStatus.textContent=parts.join(' · ');
}

async function refreshResumePanel(){
  const saved=await loadConversationState();
  const hasConversation=Boolean(saved?.session?.entries?.length || saved?.session?.transcript?.length);
  resumePanel.classList.toggle('hidden',!hasConversation);
  if(!hasConversation) return;

  const status=await getConversationStorageStatus();
  const when=saved.savedAt?new Date(saved.savedAt).toLocaleString('pt-BR'):'registrada nesta sessão';
  const persistence=status.persistenceConfirmed
    ? 'persistida cifrada neste navegador'
    : 'somente nesta sessão; persistência não confirmada';
  resumeInfo.textContent=depthName(saved.session.depth)+' · '+when+' · '+persistence;
}

function showUrgentHelp(messageOverride=null){
  const guidance=urgentHelpGuidance('BR');
  safetyMessage.textContent=typeof messageOverride==='string'?messageOverride:guidance.message;
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
  if(guidance.outside){
    const note=document.createElement('p');
    note.className='muted small';
    note.textContent=guidance.outside;
    safetyResources.appendChild(note);
  }
  show(safetyView);
}

async function forgetConversation(){
  try{
    await clearConversationState();
  }catch{
    alert('Não foi possível confirmar a exclusão dos dados locais. Tente novamente antes de considerar a conversa apagada.');
    return false;
  }
  session=null;
  summaryModel=null;
  summaryText.value='';
  invalidateSummaryApproval();
  messages.replaceChildren();
  await refreshResumePanel();
  show(home);
  return true;
}

function updatePwaStatus(){
  if(!navigator.onLine){
    pwaStatus.textContent='Offline · app disponível';
    return;
  }
  pwaStatus.textContent=navigator.serviceWorker?.controller?'Pronto para uso offline':'Online';
}

async function refreshApplicationShell(){
  if(!navigator.onLine){
    refreshAppStatus.textContent='Conecte-se à internet para buscar a versão mais recente.';
    return;
  }

  refreshAppStatus.textContent='Limpando o cache do aplicativo…';
  try{
    if(currentView==='conversation'||currentView==='summary') await persist(currentView);

    if('serviceWorker' in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration=>registration.unregister()));
    }

    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(
        keys
          .filter(key=>key.startsWith('ombro-amigo-'))
          .map(key=>caches.delete(key))
      );
    }

    refreshAppStatus.textContent='Buscando a versão mais recente…';
    const target=new URL(window.location.href);
    target.searchParams.set('refresh',Date.now().toString());
    window.location.replace(target.toString());
  }catch{
    refreshAppStatus.textContent='Não foi possível limpar todo o cache. Tentando recarregar mesmo assim…';
    window.location.reload();
  }
}


function retainFreeWriting(){
  if(session?.mode!=='free') return false;
  const text=freeText.value.trim();
  if(!text){freeStatus.textContent='Escreva algo antes de guardar ou organizar.';return false;}
  const safety=assessSafety({explicitImmediateDanger:detectExplicitImmediateDanger(text)});
  if(safety.interrupt){showUrgentHelp(safety.message);return false;}
  // Save the original text verbatim, never infer categories or split a sentence.
  session.entries=[{kind:'user_statement',text,source:'declared',categories:['fact']}];
  session.transcript=[{role:'user',text}];
  session.turn=1;
  summaryModel=null;
  invalidateSummaryApproval();
  freeStatus.textContent='Texto guardado neste aparelho, conforme a disponibilidade do armazenamento local.';
  void persist('conversation');
  return true;
}
$('#save-free-writing').addEventListener('click',()=>{retainFreeWriting();});
$('#organize-free-writing').addEventListener('click',()=>{
  if(!retainFreeWriting()) return;
  createOrRestoreSummary();
  show(summaryView);
  void persist('summary');
});
freeText.addEventListener('input',()=>{
  freeStatus.textContent='Alterações ainda não guardadas. Use “Guardar texto” para salvar.';
});

document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>start(button.dataset.start)));

document.querySelectorAll('input[name="depth"]').forEach(input=>input.addEventListener('change',()=>{
  const label=$('.pace-details summary strong');
  if(label) label.textContent=depthName(input.value);
}));

replyForm.addEventListener('submit',event=>{
  event.preventDefault();
  const text=reply.value.trim();
  if(!text||!session) return;
  reply.value='';

  const safety=assessSafety({explicitImmediateDanger:detectExplicitImmediateDanger(text)});
  if(safety.interrupt){
    addMessage('user',text);
    showUrgentHelp(safety.message);
    return;
  }

  const controlIntent=detectConversationControlIntent(text);
  if(controlIntent==='summary'){
    createOrRestoreSummary();
    show(summaryView);
    void persist('summary');
    return;
  }

  addMessage('user',text);
  const question=nextQuestion(session,text);
  addMessage('ai',question);
  void persist('conversation');
  updateProgress();
});

$('#skip-question').addEventListener('click',()=>{
  if(!session) return;
  const question=skipQuestion(session);
  addMessage('user','Prefiro não responder a essa pergunta.');
  addMessage('ai',question);
  void persist('conversation');
  updateProgress();
});

$('#say-this').addEventListener('click',()=>{
  if(!session) return;
  createOrRestoreSummary();
  show(summaryView);
  void persist('summary');
});

$('#back-home').addEventListener('click',()=>{
  if(session?.mode==='free' && freeText.value.trim()){
    if(!retainFreeWriting()) return;
  }else void persist('conversation');
  show(home);
  void refreshResumePanel();
});

$('#summary-back').addEventListener('click',()=>{
  invalidateSummaryApproval();
  show(conversationView);
});

$('#accept-summary').addEventListener('click',()=>{
  summaryApproved=true;
  copyPanel.classList.remove('hidden');
  copyStatus.textContent='Confirmada neste aparelho. Nada foi enviado.';
  void persist('summary');
});

$('#reject-summary').addEventListener('click',()=>{
  invalidateSummaryApproval();
  show(conversationView);
});

$('#resume-conversation').addEventListener('click',resumeSavedConversation);

adultConfirm.addEventListener('change',()=>{
  acknowledgeButton.disabled=!adultConfirm.checked;
});

acknowledgeButton.addEventListener('click',()=>{
  if(!adultConfirm.checked) return;
  saveAcknowledgement();
  show(home);
  void refreshResumePanel();
});

$('#onboarding-privacy').addEventListener('click',()=>show(privacyView));
$('#review-onboarding').addEventListener('click',()=>{
  adultConfirm.checked=false;
  acknowledgeButton.disabled=true;
  show(onboardingView);
});

$('#delete-all-local').addEventListener('click',async()=>{
  if(!confirm('Apagar conversa, rascunho e confirmação deste teste neste navegador? Essa ação não pode ser desfeita.')) return;
  try{
    await clearAllSensitiveState();
    clearAcknowledgement();
  }catch{
    localDataStatus.textContent='Não foi possível confirmar a exclusão completa. Tente novamente antes de considerar os dados apagados.';
    return;
  }
  session=null;
  summaryModel=null;
  summaryText.value='';
  invalidateSummaryApproval();
  messages.replaceChildren();
  adultConfirm.checked=false;
  acknowledgeButton.disabled=true;
  show(onboardingView);
});

$('#open-privacy').addEventListener('click',()=>show(privacyView));
$('#privacy-link').addEventListener('click',()=>show(privacyView));
$('#privacy-back').addEventListener('click',()=>{
  show(landingView());
  if(hasAcknowledgedTest()) void refreshResumePanel();
});
document.querySelectorAll('[data-urgent-help]').forEach(button=>button.addEventListener('click',()=>showUrgentHelp()));
$('#safety-back').addEventListener('click',()=>{
  if(session) show(conversationView);
  else{
    show(landingView());
    if(hasAcknowledgedTest()) void refreshResumePanel();
  }
});

$('#new-conversation').addEventListener('click',async()=>{
  if(confirm('Começar outra conversa e apagar a conversa salva neste aparelho?')) await forgetConversation();
});
$('#delete-conversation').addEventListener('click',async()=>{
  if(confirm('Apagar a conversa salva neste aparelho? Essa ação não pode ser desfeita.')) await forgetConversation();
});

$('#copy-summary').addEventListener('click',async()=>{
  if(!summaryApproved) return;
  try{
    syncSummaryText();
    await copyText(summaryText.value);
    copyStatus.textContent='Copiado para a área de transferência. O app não enviou o texto para nenhum servidor.';
  }catch{
    copyStatus.textContent='Não foi possível copiar automaticamente. Você pode selecionar e copiar manualmente.';
  }
});

$('#refresh-app').addEventListener('click',()=>{
  if(!confirm('Atualizar os arquivos do aplicativo agora? Sua conversa salva neste aparelho será preservada.')) return;
  void refreshApplicationShell();
});

$('#persist-storage').addEventListener('click',async()=>{
  if(!navigator.storage?.persist){
    persistStatus.textContent='Este navegador não oferece essa opção.';
    return;
  }
  try{
    const already=await navigator.storage.persisted?.();
    const granted=already || await navigator.storage.persist();
    persistStatus.textContent=granted
      ? 'O navegador aceitou dar mais proteção contra remoção automática dos dados locais.'
      : 'O navegador não concedeu armazenamento persistente. Seus dados continuam locais, mas podem ser removidos pelo navegador.';
  }catch{
    persistStatus.textContent='Não foi possível consultar essa opção neste navegador.';
  }
});

window.addEventListener('pagehide',()=>{
  if(currentView==='conversation'||currentView==='summary') void persist(currentView);
});
window.addEventListener('online',updatePwaStatus);
window.addEventListener('offline',updatePwaStatus);

async function bootstrap(){
  const currentUrl=new URL(window.location.href);
  if(currentUrl.searchParams.has('refresh')){
    currentUrl.searchParams.delete('refresh');
    const clean=currentUrl.pathname+currentUrl.search+currentUrl.hash;
    window.history.replaceState(null,'',clean);
  }

  await initializeConversationStorage();
  if(hasAcknowledgedTest()){
    show(home,{focusEntry:false});
    await refreshResumePanel();
  }else{
    show(onboardingView,{focusEntry:false});
  }
  updatePwaStatus();
}

void bootstrap();
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'})
    .then(registration=>registration.update().then(()=>navigator.serviceWorker.ready))
    .then(updatePwaStatus)
    .catch(()=>{pwaStatus.textContent='Online · modo offline indisponível';});
}
