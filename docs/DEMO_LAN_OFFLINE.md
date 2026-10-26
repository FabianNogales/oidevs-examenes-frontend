# EIDA en hotspot Wi-Fi sin Internet

La guía completa de ambos repositorios está en [backend/docs/DEMO_LAN_OFFLINE.md](../../oidevs-examenes-backend/docs/DEMO_LAN_OFFLINE.md). Incluye PostgreSQL/DB_URL, configuración Laravel, login Sanctum, IP dinámica, firewall Windows, certificados móviles, diagnóstico y checklist.

Desde este repositorio, Git Bash:

```bash
# Si .env.local existe, integrar los cambios manualmente; conservar sus valores.
test -e .env.local || cp .env.local.example .env.local
npm run dev -- --host 0.0.0.0
```

`.env.local` usa `VITE_BACKEND_URL=/backend` y `VITE_API_URL=/backend/api/v1`, mocks=false. No requiere una IP fija. Desde laptop/celular abrir http://IP_LAPTOP:5173, usando la IPv4 de Windows en el hotspot. Laravel debe estar corriendo en 127.0.0.1:8000, con el perfil parcial `.env.hotspot.example` del backend integrado y Sanctum configurado para esa IP:5173.

El proxy de desarrollo elimina /backend una vez; también reenvía /storage para fotos locales. Conserva Host/Origin y reenvía el protocolo para Laravel. No cambia vercel.json ni los rewrites de producción.

Para cámara móvil se requiere HTTPS confiable: el escáner usa getUserMedia y crypto.subtle. Las variables opcionales EIDA_DEV_HTTPS_KEY/EIDA_DEV_HTTPS_CERT de `.env.local.example` habilitan TLS en Vite usando archivos que debe generar el responsable con mkcert, incluyendo la IP real en el certificado. Instalar la CA pública en el celular y seguir la guía completa. No se generaron claves ni certificados; nunca versionarlos o ponerlos en public.

Al cambiar de red: modificar EIDA_LAN_HOST en el `.env` del backend, recargar su configuración y reiniciar Laravel; las URLs relativas frontend permanecen. Para HTTPS regenerar el certificado con la nueva IP y reiniciar Vite. Revisar la regla de firewall limitada al celular. No hace falta publicar 5432: se detectó que PostgreSQL actualmente escucha en todas las interfaces y la guía explica cómo restringirlo manualmente.

Preparación revisada estáticamente. No se ejecutaron servidores/builds/lint/tests, migraciones, seeders, operaciones de BD ni cambios de firewall. No se editó ningún `.env` privado ni se hizo commit/push. Probar en los tres dispositivos antes de la exposición.
