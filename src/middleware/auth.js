// middleware/auth.js
require('dotenv').config();

const authenticate = async (req, res, next) => {
  // Permitir desarrollo local sin autenticación (temporal)
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Modo desarrollo - Autenticación desactivada');
    return next();
  }

  // Resto de tu lógica original...
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Token requerido',
      details: 'Incluye el header Authorization: Bearer <token>' 
    });
  }

  const [bearer, token] = authHeader.split(' ');
  
  if (bearer !== 'Bearer' || !token) {
    return res.status(400).json({ 
      error: 'Formato de token inválido',
      details: 'Usa el formato: Bearer <token>'
    });
  }

  // 3. Comparación segura contra timing attacks
  const validApiKey = process.env.API_KEY;
  if (!validApiKey) {
    console.error('❌ ERROR: API_KEY no configurada en variables de entorno');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  // Comparación segura que no revela información por tiempo de respuesta
  const crypto = require('crypto');
  const providedKeyHash = crypto.createHash('sha256').update(token).digest('hex');
  const validKeyHash = crypto.createHash('sha256').update(validApiKey).digest('hex');
  
  if (crypto.timingSafeEqual(Buffer.from(providedKeyHash), Buffer.from(validKeyHash))) {
    return next();
  }

  return res.status(403).json({ 
    error: 'Acceso no autorizado',
    details: 'El token proporcionado no es válido'
  });
};

module.exports = authenticate;