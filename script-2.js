function parseManualLines(text){
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split(/[;\t]/).map(v => v.trim());
    return { name: parts[0] || '', email: parts[1] || '' };
  });
}

function pickColumn(headers, aliases){
  const normalized = headers.map(normalize);
  for(const alias of aliases){
    const i = normalized.findIndex(h => h === normalize(alias));
    if(i >= 0) return headers[i];
  }
  for(const alias of aliases){
    const i = normalized.findIndex(h => h.includes(normalize(alias)));
    if(i >= 0) return headers[i];
  }
  return null;
}

function parseSpreadsheetRows(rows){
  if(!rows.length) return [];
  const headers = Object.keys(rows[0]);
  const nameCol = pickColumn(headers, ['nome','nome completo','aluno','participante']);
  const emailCol = pickColumn(headers, ['email','e-mail','mail']);
  if(!nameCol) throw new Error('Não encontrei uma coluna de nome na planilha.');
  return rows.map(r => ({ name: String(r[nameCol] || '').trim(), email: emailCol ? String(r[emailCol] || '').trim() : '' })).filter(r => r.name);
}

function downloadBlob(blob, filename){
  if(typeof saveAs === 'function') return saveAs(blob, filename);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function makeCanvasFor(name){
  await ensureFont();
  const canvas = document.createElement('canvas');
  canvas.width = modelImg.naturalWidth || 3369;
  canvas.height = modelImg.naturalHeight || 2382;
  drawNameOnCanvas(canvas, name);
  return canvas;
}

async function makePdfArrayBuffer(name){
  const canvas = await makeCanvasFor(name);
  const jpeg = canvas.toDataURL('image/jpeg', 0.98);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation:'landscape', unit:'px', format:[canvas.width, canvas.height], hotfixes:['px_scaling'] });
  pdf.addImage(jpeg, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
  return pdf.output('arraybuffer');
}

async function checkMailStatus(){
  try{
    const res = await fetch('/api/status', { cache:'no-store' });
    const data = await res.json();
    if(data.ready){
      els.mailStatus.textContent = 'E-mail mestre configurado';
      els.mailStatus.className = 'badge ok';
      els.mailStatus.dataset.ready = 'true';
      els.emailMsg.textContent = 'E-mail habilitado.';
    } else {
      els.mailStatus.textContent = 'E-mail mestre não configurado';
      els.mailStatus.className = 'badge off';
      els.mailStatus.dataset.ready = 'false';
      els.emailMsg.textContent = data.message || 'Configure o e-mail mestre na Vercel para habilitar o envio.';
    }
  } catch (e){
    els.mailStatus.textContent = 'Falha ao verificar e-mail';
    els.mailStatus.className = 'badge off';
    els.mailStatus.dataset.ready = 'false';
  }
  refreshStats();
}

els.addManual.addEventListener('click', () => addParticipants(parseManualLines(els.manual.value)));
els.clear.addEventListener('click', async () => {
  participants = [];
  previewIndex = 0;
  els.manual.value = '';
  els.excelInput.value = '';
  els.search.value = '';
  updateFeedback('neutral', 'Lista limpa.');
  await rerenderAll();
});
els.search.addEventListener('input', renderTable);
els.nextPreview.addEventListener('click', async () => {
  if(!participants.length) return;
  previewIndex = (previewIndex + 1) % participants.length;
  await renderPreview();
});

els.rows.addEventListener('change', (e) => {
  const input = e.target.closest('.rowSelect');
  if(!input) return;
  const idx = Number(input.dataset.index);
  participants[idx].selected = input.checked;
  refreshStats();
});
els.rows.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-remove]');
  if(!btn) return;
  const idx = Number(btn.dataset.remove);
  participants.splice(idx, 1);
  updateFeedback('ok', 'Participante removido.');
  await rerenderAll();
});

els.selectAll.addEventListener('click', () => {
  participants.forEach(p => p.selected = isValidEmail(p.email));
  renderTable();
});
els.unselectAll.addEventListener('click', () => {
  participants.forEach(p => p.selected = false);
  renderTable();
});

els.excelInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  try{
    let rows = [];
    if(file.name.toLowerCase().endsWith('.csv')){
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
      const headers = lines[0].split(sep).map(v => v.trim());
      rows = lines.slice(1).map(line => {
        const values = line.split(sep);
        const obj = {};
        headers.forEach((h,i) => obj[h] = (values[i] || '').trim());
        return obj;
      });
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array' });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' });
    }
    addParticipants(parseSpreadsheetRows(rows));
  } catch (error){
    console.error(error);
    updateFeedback('warn', error.message || 'Erro ao ler a planilha.');
  }
});
