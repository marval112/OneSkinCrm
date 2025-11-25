# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar OneSkin CRM en Vercel paso a paso.

## Requisitos Previos

- Cuenta en [Vercel](https://vercel.com) (gratis)
- Repositorio Git (GitHub, GitLab, o Bitbucket)
- Acceso a tu base de datos Supabase

## Paso 1: Preparar el Repositorio

1. **Asegúrate de que todos los cambios estén commiteados:**
   ```bash
   git add .
   git commit -m "Preparar para despliegue en Vercel"
   git push origin main
   ```

2. **Verifica que estos archivos existan:**
   - ✅ `/api/serpapi.ts` - Función serverless
   - ✅ `vercel.json` - Configuración de Vercel
   - ✅ `src/vite-env.d.ts` - Tipos de TypeScript

## Paso 2: Conectar con Vercel

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio Git
4. Vercel detectará automáticamente que es un proyecto Vite

### Opción B: Desde la Terminal (CLI)

```bash
# Instalar Vercel CLI globalmente
npm i -g vercel

# Iniciar sesión
vercel login

# Desplegar
vercel
```

## Paso 3: Configurar Variables de Entorno (Opcional)

> [!NOTE]
> **¡No necesitas configurar variables de entorno!** Tu aplicación ya tiene las credenciales hardcodeadas en el código:
> - Supabase URL y Anon Key están en `supabaseClient.ts` y `api/serpapi.ts`
> - SerpAPI Key se obtiene automáticamente desde Supabase
> - Gemini API Key se compila en build time (si compilas localmente)

**Puedes saltar este paso** y proceder directamente al Paso 4.

### Solo si quieres usar variables de entorno (avanzado)

Si prefieres usar variables de entorno en lugar de credenciales hardcodeadas:

| Variable | Valor | Uso |
|----------|-------|-----|
| `GEMINI_API_KEY` | Tu clave de Gemini | Solo si compilas en Vercel |

> [!TIP]
> La mayoría de usuarios NO necesitan configurar nada aquí. La aplicación funcionará perfectamente sin variables de entorno.

## Paso 4: Configurar el Build

Vercel debería detectar automáticamente la configuración, pero verifica:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Paso 5: Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que el build se complete (2-3 minutos)
3. Una vez completado, Vercel te dará una URL como: `https://oneskin-crm.vercel.app`

## Paso 6: Verificar el Despliegue

Prueba las siguientes funcionalidades:

- [ ] **Login**: Autenticación con Supabase
- [ ] **Dashboard**: Visualización de datos
- [ ] **Prospecting**: Búsqueda con SerpAPI
  - Prueba búsqueda en Google
  - Prueba búsqueda en LinkedIn
- [ ] **Clientes**: CRUD de clientes
- [ ] **Reportes**: Generación de reportes

## Desarrollo Local vs Producción

### Desarrollo Local

Para desarrollo local, sigue usando:

```bash
# Terminal 1: Servidor proxy Express
npm run proxy

# Terminal 2: Frontend Vite
npm run dev
```

El frontend usará `http://localhost:3001/api/serpapi` automáticamente.

### Producción (Vercel)

En producción, el frontend usará `/api/serpapi` que apunta a la función serverless de Vercel.

## Troubleshooting

### Error: "Configuration error: API key not found"

**Causa**: La función serverless no puede acceder a Supabase o la clave no está en la tabla.

**Solución**:
1. Verifica que las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén configuradas en Vercel
2. Verifica que la clave existe en Supabase:
   ```sql
   SELECT * FROM secure_settings WHERE key = 'VITE_SERPAPI_KEY';
   ```

### Error: "Failed to fetch from SerpAPI"

**Causa**: Problema con la petición a SerpAPI.

**Solución**:
1. Ve a Vercel → Functions → Logs
2. Busca el error específico en los logs de la función `serpapi`
3. Verifica que la clave de SerpAPI sea válida

### Error 404 en rutas

**Causa**: El SPA routing no está configurado correctamente.

**Solución**: Verifica que `vercel.json` tenga el rewrite correcto:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Build falla

**Causa**: Errores de TypeScript o dependencias faltantes.

**Solución**:
1. Ejecuta `npm run build` localmente para ver el error
2. Corrige los errores
3. Haz commit y push
4. Vercel volverá a desplegar automáticamente

## Comandos Útiles

```bash
# Ver logs en tiempo real
vercel logs

# Desplegar a producción
vercel --prod

# Desplegar a preview
vercel

# Ver lista de despliegues
vercel ls

# Abrir el proyecto en el dashboard
vercel open
```

## Dominios Personalizados

Para usar tu propio dominio:

1. Ve a Vercel → Settings → Domains
2. Añade tu dominio (ej: `crm.tuempresa.com`)
3. Configura los registros DNS según las instrucciones de Vercel
4. Vercel configurará SSL automáticamente

## Actualizaciones Automáticas

Vercel está configurado para desplegar automáticamente:

- **Commits a `main`** → Producción
- **Pull Requests** → Preview deployments
- **Otras ramas** → Preview deployments

## Monitoreo

Vercel proporciona:

- **Analytics**: Tráfico y rendimiento
- **Logs**: Logs de funciones serverless en tiempo real
- **Speed Insights**: Métricas de rendimiento
- **Error Tracking**: Errores en producción

Accede a todo esto desde el dashboard de Vercel.

## Soporte

Si tienes problemas:

1. Revisa los logs en Vercel Dashboard
2. Verifica la [documentación de Vercel](https://vercel.com/docs)
3. Consulta la [comunidad de Vercel](https://github.com/vercel/vercel/discussions)

---

¡Listo! Tu aplicación OneSkin CRM ahora está desplegada en Vercel 🚀
