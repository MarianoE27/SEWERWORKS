import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'La API Key de Gemini no está configurada en el servidor (Vercel).' });
  }

  try {
    // Inicializamos la conexión a Google GenAI de manera segura en el servidor
    const ai = new GoogleGenAI({ apiKey });
    
    // Si la inicialización es correcta, retornamos éxito.
    // En una implementación completa aquí recibiríamos el prompt y consultaríamos a Gemini.
    return res.status(200).json({ 
      success: true, 
      message: 'Conexión iniciada con Google GenAI a través del proxy seguro de Vercel.' 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al conectar con Google GenAI' });
  }
}
