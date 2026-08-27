const CERT_W = 3369;
const CERT_H = 2382;
const ASSET_PATHS = {
  robot:'/assets/robot.webp', dayane:'/assets/dayane.webp', glauco:'/assets/glauco.webp',
  alex:'/assets/alex.webp', logos:'/assets/logos.webp'
};
const ASSETS = {};
const assetsReady = Promise.all(Object.entries(ASSET_PATHS).map(([key,src]) => new Promise((resolve,reject)=>{
  const img = new Image(); img.onload=()=>{ASSETS[key]=img;resolve()}; img.onerror=reject; img.src=src;
})));
const previewCanvas = document.getElementById('preview');
let participants = [], previewIndex = 0;
const els = {
  excelInput:document.getElementById('excelInput'), manual:document.getElementById('manual'),
  addManual:document.getElementById('addManual'), clear:document.getElementById('clear'), feedback:document.getElementById('feedback'),
  search:document.getElementById('search'), rows:document.getElementById('rows'), total:document.getElementById('total'),
  validEmails:document.getElementById('validEmails'), selected:document.getElementById('selected'), previewName:document.getElementById('previewName'),
  nextPreview:document.getElementById('nextPreview'), pdfZip:document.getElementById('pdfZip'), pngZip:document.getElementById('pngZip'),
  progressBar:document.getElementById('progressBar'), generationMsg:document.getElementById('generationMsg'), selectAll:document.getElementById('selectAll'),
  unselectAll:document.getElementById('unselectAll'), send:document.getElementById('send'), subject:document.getElementById('subject'),
  message:document.getElementById('message'), emailMsg:document.getElementById('emailMsg'), emailProgress:document.getElementById('emailProgress'),
  mailStatus:document.getElementById('mailStatus')
};
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const safeFilename=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]/g,'').trim().replace(/\s+/g,'_');
const isValidEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function updateFeedback(type,text){els.feedback.className='feedback '+type;els.feedback.textContent=text}
function setGenerationProgress(done,total,text){els.progressBar.style.width=(total?done/total*100:0)+'%';els.generationMsg.textContent=text}
function setEmailProgress(done,total,text){els.emailProgress.style.width=(total?done/total*100:0)+'%';els.emailMsg.textContent=text}
async function ensureFont(){try{await assetsReady;await Promise.all([document.fonts.load('120px Allura'),document.fonts.load('200px "Bodoni Moda"'),document.fonts.load('70px "Roboto Condensed"')]);await document.fonts.ready}catch(e){console.warn(e)}}
function centerText(ctx,text,y,size,family='Roboto Condensed',weight='400',color='#00527e'){
  ctx.fillStyle=color;ctx.font=`${weight} ${size}px "${family}"`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,CERT_W/2,y);
}
function segmentedBars(ctx){const colors=['#0086ad','#f58220','#ffc20e','#0086ad','#f58220','#ffc20e','#0086ad','#f58220','#ffc20e','#0086ad'],h=46,sw=CERT_W/colors.length;colors.forEach((c,i)=>{ctx.fillStyle=c;ctx.fillRect(i*sw,0,sw+1,h);ctx.fillRect(i*sw,CERT_H-h,sw+1,h)})}
function assetCrop(ctx,img,sx,sy,sw,sh,dx,dy,dw,dh){ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh)}
function mixedLine(ctx,y,segments,size=70){
  let total=0;for(const s of segments){ctx.font=`${s.weight||'400'} ${size}px "Roboto Condensed"`;total+=ctx.measureText(s.text).width}
  let x=(CERT_W-total)/2;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#00527e';
  for(const s of segments){ctx.font=`${s.weight||'400'} ${size}px "Roboto Condensed"`;ctx.fillText(s.text,x,y);x+=ctx.measureText(s.text).width}
}
function drawCertificate(canvas,name='Nome do aluno'){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
  const sx=canvas.width/CERT_W, sy=canvas.height/CERT_H;ctx.scale(sx,sy);
  ctx.fillStyle='#f4f9fc';ctx.fillRect(0,0,CERT_W,CERT_H);segmentedBars(ctx);
  if(ASSETS.robot) assetCrop(ctx,ASSETS.robot,38,23,96,152,370,105,2640,3300);
  centerText(ctx,'CERTIFICADO',430,255,'Bodoni Moda','400','#0083ad');
  centerText(ctx,'Certificamos que,',655,70,'Roboto Condensed','400','#004f7b');
  let nameSize=132;ctx.fillStyle='#0b0b0b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${nameSize}px Allura`;while(ctx.measureText(name).width>2200&&nameSize>80){nameSize-=3;ctx.font=`${nameSize}px Allura`}ctx.fillText(name,CERT_W/2,790);
  ctx.strokeStyle='#f47c16';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(475,875);ctx.lineTo(CERT_W-475,875);ctx.stroke();
  centerText(ctx,'completou, com desempenho satisfatório, a oficina de',965,67);
  mixedLine(ctx,1075,[{text:'Empreendedorismo,',weight:'700'},{text:' com carga horária de '},{text:'02 horas,',weight:'700'},{text:' realizada na Casa da'}],70);
  centerText(ctx,'Inovação Ziraldo, em Queimados/RJ.',1180,72);
  centerText(ctx,'Data de emissão:   21 / 08 / 2026   .',1285,72);
  if(ASSETS.dayane) assetCrop(ctx,ASSETS.dayane,46,38,143,57,585,1425,610,245);
  if(ASSETS.glauco) ctx.drawImage(ASSETS.glauco,1495,1350,380,268);
  if(ASSETS.alex) assetCrop(ctx,ASSETS.alex,13,38,146,37,2130,1450,690,175);
  ctx.strokeStyle='#f47c16';ctx.lineWidth=10;[[505,1695,1210],[1330,1585,2030],[2135,1695,2860]].forEach(p=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[1]);ctx.stroke()});
  centerText(ctx,'Dayane Aragoso',858,1785,67,'Roboto Condensed','700','#12384e');
  centerText(ctx,'Secretária de Projetos Especiais',858,1860,42,'Roboto Condensed','400','#12384e');centerText(ctx,'e Gestão de Convênios',858,1910,42,'Roboto Condensed','400','#12384e');
  centerText(ctx,'Glauco Kaizer',1680,1675,67,'Roboto Condensed','700','#12384e');centerText(ctx,'Prefeito Municipal de Queimados/RJ',1680,1745,40,'Roboto Condensed','400','#12384e');
  centerText(ctx,'Alexander Martins',2500,1785,67,'Roboto Condensed','700','#12384e');centerText(ctx,'Presidente do Instituto Vielas',2500,1860,42,'Roboto Condensed','400','#12384e');
  if(ASSETS.logos) assetCrop(ctx,ASSETS.logos,6,160,166,24,1200,1965,970,140);
  ctx.restore();
}
async function renderPreview(){await ensureFont();const p=participants[previewIndex]||{name:'Nome do aluno'};els.previewName.textContent=p.name;drawCertificate(previewCanvas,p.name);els.generationMsg.textContent=participants.length?'Pronto para emitir.':'Modelo carregado. Adicione participantes para emitir.'}
function selectedParticipants(){return participants.filter(p=>p.selected)}
function refreshStats(){els.total.textContent=participants.length;els.validEmails.textContent=participants.filter(p=>isValidEmail(p.email)).length;els.selected.textContent=selectedParticipants().length;els.pdfZip.disabled=!participants.length;els.pngZip.disabled=!participants.length;els.send.disabled=selectedParticipants().filter(p=>isValidEmail(p.email)).length===0||els.mailStatus.dataset.ready!=='true'}
function participantStatus(p){if(!p.email)return{label:'Sem e-mail',cls:'warn'};if(!isValidEmail(p.email))return{label:'E-mail inválido',cls:'bad'};return{label:'Pronto',cls:'ok'}}
function renderTable(){const q=normalize(els.search.value),f=participants.filter(p=>!q||normalize(p.name).includes(q)||normalize(p.email).includes(q));els.rows.innerHTML=f.length?f.map(p=>{const i=participants.indexOf(p),s=participantStatus(p);return `<tr><td><input type="checkbox" data-index="${i}" class="rowSelect" ${p.selected?'checked':''} ${isValidEmail(p.email)?'':'disabled'}></td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.email||'—')}</td><td><span class="pill ${s.cls}">${s.label}</span></td><td><button class="iconBtn" data-remove="${i}" title="Remover">✕</button></td></tr>`}).join(''):`<tr><td colspan="5" class="empty">${participants.length?'Nenhum resultado encontrado.':'Importe uma planilha para começar.'}</td></tr>`;refreshStats()}
async function rerenderAll(){renderTable();if(previewIndex>=participants.length)previewIndex=0;await renderPreview()}
function addParticipants(list){let a=0,d=0;for(const it of list){const name=String(it.name||'').trim(),email=String(it.email||'').trim();if(!name)continue;if(participants.some(p=>normalize(p.name)===normalize(name))){d++;continue}participants.push({name,email,selected:isValidEmail(email)});a++}updateFeedback(a&&d?'warn':a?'ok':d?'warn':'neutral',a&&d?`${a} participante(s) adicionado(s). ${d} duplicado(s) ignorado(s).`:a?`${a} participante(s) adicionado(s) com sucesso.`:d?`Nenhum novo: ${d} duplicado(s) ignorado(s).`:'Nenhum participante válido encontrado.');rerenderAll()}
assetsReady.then(()=>renderPreview()).catch(()=>setGenerationProgress(0,1,'Não foi possível carregar os elementos do certificado.'));
