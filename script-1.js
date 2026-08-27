const MODEL_URL = '/public/certificado-modelo.webp';
const NAME_X_RATIO = 1000 / 2000;
const NAME_Y_RATIO = 458 / 1414;
const NAME_MAX_RATIO = 1080 / 2000;
const BASE_FONT_PX_AT_2000 = 55 * (96 / 72);

const previewCanvas = document.getElementById('preview');
const previewCtx = previewCanvas.getContext('2d');
const modelImg = new Image();
modelImg.src = MODEL_URL;

let participants = [];
let previewIndex = 0;

const els = {
  excelInput: document.getElementById('excelInput'),
  manual: document.getElementById('manual'),
  addManual: document.getElementById('addManual'),
  clear: document.getElementById('clear'),
  feedback: document.getElementById('feedback'),
  search: document.getElementById('search'),
  rows: document.getElementById('rows'),
  total: document.getElementById('total'),
  validEmails: document.getElementById('validEmails'),
  selected: document.getElementById('selected'),
  previewName: document.getElementById('previewName'),
  nextPreview: document.getElementById('nextPreview'),
  pdfZip: document.getElementById('pdfZip'),
  pngZip: document.getElementById('pngZip'),
  progressBar: document.getElementById('progressBar'),
  generationMsg: document.getElementById('generationMsg'),
  selectAll: document.getElementById('selectAll'),
  unselectAll: document.getElementById('unselectAll'),
  send: document.getElementById('send'),
  subject: document.getElementById('subject'),
  message: document.getElementById('message'),
  emailMsg: document.getElementById('emailMsg'),
  emailProgress: document.getElementById('emailProgress'),
  mailStatus: document.getElementById('mailStatus')
};

function normalize(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
function safeFilename(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]/g,'').trim().replace(/\s+/g,'_');
}
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function isValidEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
function updateFeedback(type, text){
  els.feedback.className = 'feedback ' + type;
  els.feedback.textContent = text;
}
function setGenerationProgress(done,total,text){
  els.progressBar.style.width = (total ? done/total*100 : 0) + '%';
  els.generationMsg.textContent = text;
}
function setEmailProgress(done,total,text){
  els.emailProgress.style.width = (total ? done/total*100 : 0) + '%';
  els.emailMsg.textContent = text;
}
async function ensureFont(){
  try{
    await document.fonts.load(`${BASE_FONT_PX_AT_2000}px Allura`);
    await document.fonts.ready;
  }catch(e){}
}

function getDrawMetrics(canvas){
  return {
    x: canvas.width * NAME_X_RATIO,
    y: canvas.height * NAME_Y_RATIO,
    maxWidth: canvas.width * NAME_MAX_RATIO,
    fontPx: BASE_FONT_PX_AT_2000 * (canvas.width / 2000)
  };
}

function drawNameOnCanvas(canvas, name){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(modelImg,0,0,canvas.width,canvas.height);

  const metrics = getDrawMetrics(canvas);
  let fontPx = metrics.fontPx;
  ctx.fillStyle = '#0b0b0b';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontPx}px "Allura", cursive`;

  while(ctx.measureText(name).width > metrics.maxWidth && fontPx > 48){
    fontPx -= 2;
    ctx.font = `${fontPx}px "Allura", cursive`;
  }

  ctx.fillText(name, metrics.x, metrics.y);
}

async function renderPreview(){
  await ensureFont();
  const current = participants[previewIndex] || {name:'Nome do aluno'};
  els.previewName.textContent = current.name;
  drawNameOnCanvas(previewCanvas, current.name);
}

function selectedParticipants(){
  return participants.filter(p => p.selected);
}

function refreshStats(){
  els.total.textContent = participants.length;
  els.validEmails.textContent = participants.filter(p => isValidEmail(p.email)).length;
  els.selected.textContent = selectedParticipants().length;
  els.pdfZip.disabled = participants.length === 0;
  els.pngZip.disabled = participants.length === 0;
  els.send.disabled = selectedParticipants().filter(p => isValidEmail(p.email)).length === 0 || els.mailStatus.dataset.ready !== 'true';
}

function participantStatus(p){
  if(!p.email) return {label:'Sem e-mail', cls:'warn'};
  if(!isValidEmail(p.email)) return {label:'E-mail inválido', cls:'bad'};
  return {label:'Pronto', cls:'ok'};
}

function renderTable(){
  const term = normalize(els.search.value);
  const filtered = participants.filter(p => !term || normalize(p.name).includes(term) || normalize(p.email).includes(term));

  if(filtered.length === 0){
    els.rows.innerHTML = `<tr><td colspan="5" class="empty">${participants.length ? 'Nenhum resultado encontrado.' : 'Importe uma planilha para começar.'}</td></tr>`;
  } else {
    els.rows.innerHTML = filtered.map((p, idx) => {
      const realIndex = participants.indexOf(p);
      const status = participantStatus(p);
      return `<tr>
        <td><input type="checkbox" data-index="${realIndex}" class="rowSelect" ${p.selected ? 'checked' : ''} ${isValidEmail(p.email) ? '' : 'disabled'}></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.email || '—')}</td>
        <td><span class="pill ${status.cls}">${status.label}</span></td>
        <td><button class="iconBtn" data-remove="${realIndex}" title="Remover">✕</button></td>
      </tr>`;
    }).join('');
  }

  refreshStats();
}

async function rerenderAll(){
  renderTable();
  if(previewIndex >= participants.length) previewIndex = 0;
  await renderPreview();
}

function addParticipants(list){
  let added = 0;
  let duplicates = 0;

  for(const item of list){
    const name = String(item.name || '').trim();
    const email = String(item.email || '').trim();
    if(!name) continue;
    if(participants.some(p => normalize(p.name) === normalize(name))){
      duplicates++;
      continue;
    }
    participants.push({ name, email, selected: isValidEmail(email) });
    added++;
  }

  if(added && duplicates){
    updateFeedback('warn', `${added} participante(s) adicionado(s). ${duplicates} nome(s) duplicado(s) foram ignorados.`);
  } else if(added){
    updateFeedback('ok', `${added} participante(s) adicionado(s) com sucesso.`);
  } else if(duplicates){
    updateFeedback('warn', `Nenhum participante novo adicionado. ${duplicates} nome(s) duplicado(s) foram ignorados.`);
  } else {
    updateFeedback('neutral', 'Nenhum participante válido encontrado.');
  }

  rerenderAll();
}
