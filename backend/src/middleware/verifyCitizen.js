const supabaseAdmin = require('../config/supabaseAdmin');

// Verifies the Supabase session token sent by the frontend and attaches
// the authenticated citizen's info to req.citizen. Never trust a user_id
// sent directly from the frontend body/query for citizen-owned data.
async function verifyCitizen(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.citizen = {
    id: data.user.id,
    email: data.user.email,
  };

  next();
}

module.exports = { verifyCitizen };