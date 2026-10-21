# Eventos de Trade

Sitio para los eventos del equipo de Trade: banners, fechas, confirmación de asistencia
(nombre + cédula) y galería de fotos de cada evento.

- **Inscripciones** → una planilla de Google (hoja `Inscripciones`). Las cédulas solo se ven ahí;
  en la página solo aparecen los nombres de quienes van.
- **Fotos** → una carpeta de Google Drive (`Eventos de Trade - Fotos`), una subcarpeta por evento.
- La cédula se valida con el dígito verificador uruguayo y no se puede anotar dos veces en el
  mismo evento. Para darse de baja, se ingresa la cédula.

Mientras no esté conectado a Google Sheets, el sitio funciona en **modo demo** (los datos
quedan solo en el navegador de cada uno) y lo avisa con una franja naranja arriba.

## Estructura

```
index.html              página
css/styles.css          estilos
js/config.js            nombre del sitio y URL del backend (SCRIPT_URL)
js/events.js            lista de eventos  ← acá se agregan eventos nuevos
js/app.js               lógica de la página
js/api.js               conexión con Google Apps Script (o modo demo)
js/cedula.js            validación de cédula
assets/banners/         imágenes de los eventos
apps-script/Code.gs     backend para pegar en Google Apps Script
```

## 1. Conectar con Google Sheets (una sola vez, ~5 minutos)

1. Creá una planilla nueva en Google Sheets (por ejemplo "Eventos de Trade").
2. En la planilla: **Extensiones → Apps Script**.
3. Borrá lo que haya en `Código.gs` y pegá todo el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Guardá.
4. Arriba, elegí la función `setup` y tocá **Ejecutar**. Google pide permisos (planilla y Drive):
   aceptalos. Esto crea las hojas `Inscripciones` y `Fotos` y la carpeta de fotos en tu Drive.
5. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario**
6. Copiá la URL que termina en `/exec` y pegala en `js/config.js`:
   ```js
   SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
7. Subí el cambio. La franja de modo demo desaparece.

Si más adelante modificás `Code.gs`, hacé **Implementar → Gestionar implementaciones → Editar →
Nueva versión** para que la URL siga siendo la misma.

## 2. Publicar el sitio (GitHub Pages, gratis)

En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, elegí la rama
y la carpeta `/ (root)`. En un minuto queda en
`https://<usuario>.github.io/<repositorio>/`.

Cada evento tiene su propio link: `…/#halloween-trade-2026` (y `…/#halloween-trade-2026-fotos`
lleva directo a las fotos).

## Agregar un evento

1. Subí el banner a `assets/banners/`.
2. En `js/events.js`, copiá el bloque de un evento y cambiá los datos (`id`, `title`, `date`,
   `place`, `banner`…).

El inicio muestra el próximo evento destacado, después los demás próximos y abajo los
anteriores. Un evento pasa a "anteriores" 12 horas después de su hora de inicio; desde ahí
se cierran las inscripciones, pero se pueden seguir subiendo fotos.
