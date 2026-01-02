# OneSkin CRM

Sistema de gestión de relaciones con clientes (CRM) con capacidades de prospecting usando IA.

## Características

- 🔍 **Prospecting Inteligente**: Búsqueda de prospectos usando Google y LinkedIn vía SerpAPI
- 👥 **Gestión de Clientes**: CRUD completo de clientes y contactos
- 📊 **Dashboard**: Visualización de métricas y KPIs
- 🤖 **IA Integrada**: Asistente con Gemini AI + fallback automático a OpenRouter
  - Selector de modelos gratuitos de OpenRouter cuando la cuota de Gemini se agota
  - 8+ modelos free disponibles (OpenAI GPT OSS, Xiaomi MiMo, Mistral, DeepSeek, etc.)
  - Selección automática de modelos con capacidad de visión para escáner de tarjetas
- 🎨 **Personalización**: Temas y branding customizable
- 📧 **Reportes**: Generación y envío automático de reportes

## Requisitos Previos

- Node.js 18+ 
- Cuenta en [Supabase](https://supabase.com)
- API Keys:
  - [Gemini API](https://ai.google.dev/)
  - [SerpAPI](https://serpapi.com/) (almacenada en Supabase)

## Configuración Local

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` con:

```env
VITE_GEMINI_API_KEY=tu_clave_gemini
VITE_OPENROUTER_API_KEY=tu_clave_openrouter  # Opcional: fallback automático cuando Gemini se agote
SUPABASE_URL=https://mobyfwaiqixcaenijfim.supabase.co
SUPABASE_ANON_KEY=tu_clave_supabase
```

**Nota sobre OpenRouter:**
- OpenRouter se activa automáticamente cuando la cuota de Gemini se agota (error 429)
- El modelo por defecto es `openai/gpt-oss-20b:free`
- El usuario puede seleccionar otros modelos gratuitos desde la interfaz
- Obtén tu clave gratuita en [openrouter.ai](https://openrouter.ai/)

### 3. Configurar SerpAPI Key en Supabase

La clave de SerpAPI se almacena en Supabase para mayor seguridad:

```sql
INSERT INTO secure_settings (key, value)
VALUES ('VITE_SERPAPI_KEY', 'tu_clave_serpapi');
```

### 4. Ejecutar en Desarrollo

Necesitas **dos terminales**:

**Terminal 1 - Proxy Server:**
```bash
npm run proxy
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

## Despliegue en Vercel

Para desplegar en producción, consulta la [Guía de Despliegue](DEPLOYMENT.md).

**Resumen rápido:**

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

## Estructura del Proyecto

```
oneskin-crm/
├── api/                    # Funciones serverless (Vercel)
│   └── serpapi.ts         # Proxy SerpAPI
├── components/            # Componentes React
│   ├── layout/           # Layouts (Sidebar, Header)
│   └── pages/            # Páginas principales
├── contexts/             # React Contexts
├── services/             # Servicios y lógica de negocio
├── server/               # Servidor Express (desarrollo local)
│   └── serpapi-proxy.ts
├── types/                # Definiciones TypeScript
└── public/               # Archivos estáticos
```

## Scripts Disponibles

```bash
npm run dev      # Ejecutar frontend (Vite)
npm run proxy    # Ejecutar proxy server (desarrollo)
npm run build    # Build para producción
npm run preview  # Preview del build
```

## Tecnologías

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Vercel Serverless Functions
- **Base de Datos**: Supabase (PostgreSQL)
- **IA**: 
  - Google Gemini (primario)
  - OpenRouter (fallback automático con 8+ modelos gratuitos)
- **APIs**: SerpAPI para prospecting
- **Deployment**: Vercel

## Modelos de IA Disponibles

### Gemini- **Primarios (Gemini)**: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-flash` (via VITE_GEMINI_API_KEY)
- **Voz (Live)**: `gemini-2.5-flash-native-audio-dialog` (Multimodal Live API)

### OpenRouter Free Models (Fallback automático)
- `google/gemini-2.0-flash-exp:free` ⭐ (por defecto)
- `xiaomi/mimo-v2-flash:free`
- `mistralai/mistral-small-24b-instruct-2501:free`
- `nvidia/nemotron-nano-12b-v2-vl:free`
- `google/learnlm-1.5-pro-experimental:free`

El selector de modelos aparece automáticamente cuando la cuota de Gemini se agota.

## Documentación

- [Guía de Despliegue](DEPLOYMENT.md) - Instrucciones completas para Vercel
- [Serverless Functions](serverless/README.md) - Funciones serverless disponibles

## Soporte

Para problemas o preguntas:
1. Revisa la documentación
2. Consulta los logs en Vercel (producción) o consola (desarrollo)
3. Verifica la configuración de variables de entorno
