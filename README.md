<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SewerWorks Pro

SewerWorks Pro es una plataforma web avanzada para modelación hidráulica y diseño de alcantarillado sanitario por gravedad, optimizada para desplegarse fácilmente. 

## 🚀 Despliegue en Vercel (Recomendado)

El proyecto está pre-configurado para desplegarse en **Vercel** de manera óptima, incluyendo:
- **`vercel.json`**: Configurado para redirigir las rutas (SPA) hacia `index.html`.
- **API Serverless (`api/advisor.ts`)**: Para mantener segura tu clave de Gemini sin exponerla en el navegador.
- **División de código (Code-Splitting)**: El build (`vite.config.ts`) separa las librerías pesadas para carga ultrarrápida.

### Pasos para Desplegar:

1. **Sube el código a GitHub, GitLab o Bitbucket**.
2. **Crea un nuevo proyecto en Vercel**:
   - Conecta tu repositorio.
   - Vercel detectará automáticamente que es un proyecto **Vite**.
   - Comando de Build: `npm run build`
   - Directorio de Output: `dist`
3. **Configura las Variables de Entorno en Vercel**:
   - Ve a la pestaña de **Settings > Environment Variables**.
   - Añade una nueva variable:
     - **Key**: `GEMINI_API_KEY`
     - **Value**: `[TU_CLAVE_DE_API_DE_GEMINI]`
4. **¡Despliega!** Haz clic en "Deploy" y Vercel se encargará del resto.

## 💻 Desarrollo Local

**Prerrequisitos:** Node.js (v18+)

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Configura tu API Key localmente. Crea o edita el archivo `.env.local` y añade:
   ```env
   GEMINI_API_KEY=tu_clave_aqui
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *(También puedes usar el script `start.bat` incluido en Windows)*

## 🏗️ Estructura para Producción (Build)

Para probar cómo quedará la aplicación compilada localmente:

```bash
npm run build
npm run preview
```
