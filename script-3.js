els.pngZip.addEventListener('click', async () => {
  if(!participants.length) return;
  const zip = new JSZip();
  try{
    for(let i=0;i<participants.length;i++){
      const p = participants[i];
      const canvas = await makeCanvasFor(p.name);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
      zip.file(`${safeFilename(p.name)}.png`, blob);
      setGenerationProgress(i+1, participants.length, `Gerando ${i+1}/${participants.length}: ${p.name}`);
    }
    const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
    downloadBlob(zipBlob, 'certificados_png.zip');
    setGenerationProgress(participants.length, participants.length, 'ZIP em PNG gerado com sucesso.');
  } catch (error){
    console.error(error);
    setGenerationProgress(0, 1, 'Erro ao gerar o ZIP em PNG.');
  }
});

els.pdfZip.addEventListener('click', async () => {
  if(!participants.length) return;
  const zip = new JSZip();
  try{
    for(let i=0;i<participants.length;i++){
      const p = participants[i];
      zip.file(`${safeFilename(p.name)}.pdf`, await makePdfArrayBuffer(p.name));
      setGenerationProgress(i+1, participants.length, `Gerando PDF ${i+1}/${participants.length}: ${p.name}`);
    }
    const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:6 } });
    downloadBlob(zipBlob, 'certificados_pdf.zip');
    setGenerationProgress(participants.length, participants.length, 'ZIP em PDF gerado com sucesso.');
  } catch (error){
    console.error(error);
    setGenerationProgress(0, 1, 'Erro ao gerar o ZIP em PDF.');
  }
});

els.send.addEventListener('click', async () => {
  const chosen = selectedParticipants().filter(p => isValidEmail(p.email));
  if(!chosen.length) return;
  if(!confirm(`Enviar ${chosen.length} certificado(s) agora?`)) return;
  try{
    const payload = [];
    for(let i=0;i<chosen.length;i++){
      const p = chosen[i];
      const bytes = await makePdfArrayBuffer(p.name);
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      payload.push({ name:p.name, email:p.email, pdfBase64:base64 });
      setEmailProgress(i+1, chosen.length*2, `Preparando ${i+1}/${chosen.length}: ${p.name}`);
    }

    const res = await fetch('/api/send-certificates', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ subject: els.subject.value, message: els.message.value, participants: payload })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Falha no envio.');
    const ok = data.results.filter(r => r.ok).length;
    const fail = data.results.length - ok;
    setEmailProgress(chosen.length, chosen.length, `Envio concluído: ${ok} sucesso(s), ${fail} falha(s).`);
    alert(`Envio concluído: ${ok} sucesso(s), ${fail} falha(s).`);
  } catch (error){
    console.error(error);
    setEmailProgress(0,1, error.message || 'Erro ao enviar certificados.');
    alert(error.message || 'Erro ao enviar certificados.');
  }
});

modelImg.onload = async () => { await renderPreview(); };
modelImg.onerror = () => { setGenerationProgress(0,1,'Não foi possível carregar o certificado base.'); };

checkMailStatus();
refreshStats();
