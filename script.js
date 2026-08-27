const MODEL_URL='/public/certificado-modelo.webp';
const PDF_BASE_URL='/public/certificado-base.pdf';
const NAME_X=.5,NAME_Y=458/1414,NAME_MAX=1080/2000,BASE_FONT=55*(96/72);
const canvas=document.getElementById('preview'),model=new Image();model.src=MODEL_URL;
let names=[],previewIndex=0,basePdfBytes=null;
const $=id=>document.getElementById(id),els={excel:$('excelInput'),manual:$('manual'),add:$('addManual'),clear:$('clear'),feedback:$('feedback'),search:$('search'),rows:$('rows'),total:$('total'),unique:$('unique'),ready:$('ready'),previewName:$('previewName'),prev:$('prevPreview'),next:$('nextPreview'),download:$('downloadCurrent'),zip:$('pdfZip'),bar:$('progressBar'),msg:$('generationMsg')};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const safe=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]/g,'').trim().replace(/\s+/g,'_')||'certificado';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function feedback(type,text){els.feedback.className='feedback '+type;els.feedback.textContent=text}
function progress(done,total,text){els.bar.style.width=(total?done/total*100:0)+'%';els.msg.textContent=text}
async function fontReady(){try{await document.fonts.load(`${BASE_FONT}px Allura`);await document.fonts.ready}catch{}}
function current(){return names[previewIndex]||'Nome do aluno'}
function draw(name=current()){
 if(!model.complete||!model.naturalWidth)return;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(model,0,0,canvas.width,canvas.height);
 let px=BASE_FONT*(canvas.width/2000),max=canvas.width*NAME_MAX;ctx.fillStyle='#0b0b0b';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${px}px Allura,cursive`;
 while(ctx.measureText(name).width>max&&px>60){px-=2;ctx.font=`${px}px Allura,cursive`}
 ctx.fillText(name,canvas.width*NAME_X,canvas.height*NAME_Y);els.previewName.textContent=name;
}
function renderTable(){
 const q=norm(els.search.value),items=names.map((name,index)=>({name,index})).filter(x=>!q||norm(x.name).includes(q));
 els.rows.innerHTML=items.length?items.map(x=>`<tr><td>${x.index+1}</td><td>${esc(x.name)}</td><td><button class="btn ghost small" data-preview="${x.index}">Visualizar</button> <button class="btn primary small" data-download="${x.index}">PDF</button> <button class="remove" data-remove="${x.index}">Remover</button></td></tr>`).join(''):`<tr><td colspan="3" class="empty">${names.length?'Nenhum nome encontrado.':'Importe uma planilha ou adicione nomes para começar.'}</td></tr>`;
 els.total.textContent=names.length;els.unique.textContent=names.length;els.ready.textContent=names.length;els.zip.disabled=!names.length;els.download.disabled=!names.length;
}
async function renderAll(){if(previewIndex>=names.length)previewIndex=Math.max(0,names.length-1);renderTable();await fontReady();draw()}
function addNames(list){
 const existing=new Set(names.map(norm));let added=0,dup=0;
 for(const raw of list){const name=String(raw||'').split(';')[0].trim();if(!name)continue;const key=norm(name);if(existing.has(key)){dup++;continue}existing.add(key);names.push(name);added++}
 if(added&&dup)feedback('warn',`${added} nome(s) adicionado(s). ${dup} duplicado(s) ignorado(s).`);else if(added)feedback('ok',`${added} nome(s) adicionado(s) com sucesso.`);else if(dup)feedback('warn',`${dup} nome(s) já estavam na lista.`);else feedback('neutral','Nenhum nome válido encontrado.');renderAll();
}
function nameColumn(headers){const aliases=['nome','nome completo','aluno','nome do aluno','participante','estudante'],n=headers.map(norm);for(const a of aliases){let i=n.findIndex(h=>h===norm(a));if(i>=0)return headers[i]}for(const a of aliases){let i=n.findIndex(h=>h.includes(norm(a)));if(i>=0)return headers[i]}return null}
async function loadBase(){try{const r=await fetch(PDF_BASE_URL,{cache:'no-store'});if(!r.ok)throw 0;basePdfBytes=await r.arrayBuffer();els.msg.textContent='PDF original carregado. Pronto para emitir.'}catch{els.msg.textContent='Modo compatível ativo. Os PDFs continuam disponíveis.'}}
async function namePng(name){await fontReady();const c=document.createElement('canvas');c.width=1800;c.height=260;const x=c.getContext('2d');let px=140;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#0b0b0b';x.font=`${px}px Allura,cursive`;while(x.measureText(name).width>1550&&px>75){px-=3;x.font=`${px}px Allura,cursive`}x.fillText(name,900,134);return c.toDataURL('image/png')}
async function buildPdf(name){
 if(basePdfBytes&&window.PDFLib){const {PDFDocument}=PDFLib,pdf=await PDFDocument.load(basePdfBytes.slice(0)),page=pdf.getPages()[0],{width,height}=page.getSize(),png=await pdf.embedPng(await namePng(name)),w=width*.58,h=w*(260/1800),cy=height*NAME_Y;page.drawImage(png,{x:(width-w)/2,y:height-cy-h/2,width:w,height:h});return await pdf.save()}
 if(!model.complete||!model.naturalWidth)throw new Error('Certificado-base não carregou.');
 await fontReady();const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const x=c.getContext('2d');x.drawImage(model,0,0,c.width,c.height);let px=BASE_FONT*(c.width/2000),max=c.width*NAME_MAX;x.fillStyle='#0b0b0b';x.textAlign='center';x.textBaseline='middle';x.font=`${px}px Allura,cursive`;while(x.measureText(name).width>max&&px>60){px-=2;x.font=`${px}px Allura,cursive`}x.fillText(name,c.width*NAME_X,c.height*NAME_Y);const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'px',format:[c.width,c.height],hotfixes:['px_scaling']});pdf.addImage(c.toDataURL('image/jpeg',.98),'JPEG',0,0,c.width,c.height,undefined,'FAST');return new Uint8Array(pdf.output('arraybuffer'));
}
function download(bytes,name){const blob=new Blob([bytes],{type:'application/pdf'});if(typeof saveAs==='function')saveAs(blob,name);else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}
els.add.onclick=()=>addNames(els.manual.value.split(/\r?\n/));
els.clear.onclick=()=>{names=[];previewIndex=0;els.manual.value='';els.excel.value='';els.search.value='';feedback('neutral','Lista limpa.');renderAll()};
els.search.oninput=renderTable;
els.prev.onclick=()=>{if(!names.length)return;previewIndex=(previewIndex-1+names.length)%names.length;draw()};
els.next.onclick=()=>{if(!names.length)return;previewIndex=(previewIndex+1)%names.length;draw()};
els.download.onclick=async()=>{if(!names.length)return;els.download.disabled=true;try{const n=current();download(await buildPdf(n),safe(n)+'.pdf')}catch(e){alert('Erro ao gerar PDF: '+e.message)}finally{els.download.disabled=false}};
els.rows.onclick=async e=>{const p=e.target.closest('[data-preview]'),d=e.target.closest('[data-download]'),r=e.target.closest('[data-remove]');if(p){previewIndex=Number(p.dataset.preview);draw()}if(d){const i=Number(d.dataset.download),n=names[i];d.disabled=true;try{download(await buildPdf(n),safe(n)+'.pdf')}catch(err){alert('Erro ao gerar PDF: '+err.message)}finally{d.disabled=false}}if(r){names.splice(Number(r.dataset.remove),1);feedback('ok','Nome removido.');renderAll()}};
els.excel.onchange=async e=>{const f=e.target.files[0];if(!f)return;try{let rows=[];if(f.name.toLowerCase().endsWith('.csv')){const text=await f.text(),lines=text.split(/\r?\n/).filter(x=>x.trim());if(!lines.length)throw new Error('A planilha está vazia.');const sep=lines[0].split(';').length>lines[0].split(',').length?';':',',headers=lines[0].split(sep).map(v=>v.trim());rows=lines.slice(1).map(line=>{const vals=line.split(sep),o={};headers.forEach((h,i)=>o[h]=(vals[i]||'').trim());return o})}else{const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''})}if(!rows.length)throw new Error('A planilha está vazia.');const col=nameColumn(Object.keys(rows[0]));if(!col)throw new Error('Não encontrei uma coluna de Nome.');addNames(rows.map(r=>r[col]))}catch(err){feedback('warn','Erro ao importar: '+err.message)}};
els.zip.onclick=async()=>{if(!names.length)return;els.zip.disabled=true;try{const zip=new JSZip();for(let i=0;i<names.length;i++){const n=names[i];zip.file(safe(n)+'.pdf',await buildPdf(n));progress(i+1,names.length,`Gerando ${i+1}/${names.length}: ${n}`)}saveAs(await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}}),'certificados_pdf.zip');progress(names.length,names.length,'ZIP com PDFs gerado com sucesso.')}catch(e){progress(0,1,'Erro ao gerar PDFs: '+e.message)}finally{els.zip.disabled=!names.length}};
model.onload=async()=>{await fontReady();draw()};model.onerror=()=>{els.msg.textContent='Prévia indisponível, mas tente gerar o PDF.'};loadBase();renderTable();