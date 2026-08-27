const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_FROM_NAME } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return res.status(500).json({ message: 'E-mail mestre não configurado na Vercel.' });
  }

  const { subject, message, participants } = req.body || {};
  if (!Array.isArray(participants) || !participants.length) {
    return res.status(400).json({ message: 'Nenhum participante enviado.' });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE || 'true') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  const results = [];
  for (const p of participants) {
    const name = String(p.name || '').trim();
    const email = String(p.email || '').trim();
    const pdfBase64 = String(p.pdfBase64 || '');
    if (!name || !email || !pdfBase64) {
      results.push({ name, email, ok: false, error: 'Dados incompletos.' });
      continue;
    }
    try {
      await transporter.sendMail({
        from: MAIL_FROM || (MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${SMTP_USER}>` : SMTP_USER),
        to: email,
        subject: subject || 'Seu certificado - Casa da Inovação',
        text: `Olá, ${name}!\n\n${message || 'Segue em anexo o seu certificado.'}`,
        attachments: [{ filename: `${name}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
      });
      results.push({ name, email, ok: true });
    } catch (error) {
      results.push({ name, email, ok: false, error: error.message });
    }
  }

  res.status(200).json({ ok: true, results });
};
