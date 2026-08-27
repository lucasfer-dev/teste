module.exports = async (req, res) => {
  const ready = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
  res.status(200).json({
    ready,
    message: ready ? 'E-mail mestre configurado.' : 'Configure SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS na Vercel.'
  });
};
