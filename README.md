# 🎨 Generador de Paletas Circular

Herramienta web interactiva para generar, explorar y guardar paletas de colores mediante una rueda SVG animada. Permite copiar colores en formato HEX o HSL, bloquear colores favoritos y guardar paletas para uso futuro.

---

## ✨ Funcionalidades

- Rueda de colores SVG con animación de giro, efecto blur y chispas
- Generación aleatoria de paletas de 4 a 9 colores
- Bloqueo de colores individuales para conservarlos al girar
- Copia de colores en formato HEX o HSL con un clic
- Paletas guardadas con persistencia en `localStorage`
- Diseño responsive: funciona en escritorio y móvil
- Modal de paletas guardadas en móvil

---

## 🗂️ Estructura del proyecto

```
color-palette-generator/
├── index.html        # Estructura HTML de la aplicación
├── css/
│   └── style.css     # Estilos y diseño responsive
└── js/
    └── script.js     # Lógica, animaciones e interactividad
```

---

## 🌐 Ver en producción

El proyecto está desplegado en **GitHub Pages** y puedes verlo directamente en tu navegador sin instalar nada:

```
https://<tu-usuario>.github.io/<nombre-del-repositorio>/
```

> Reemplaza `<tu-usuario>` con tu nombre de usuario de GitHub y `<nombre-del-repositorio>` con el nombre exacto de tu repositorio.

---

## 💻 Ejecutar en local

Tienes dos opciones para correr el proyecto en tu computador.

---

### Opción 1 — Clonar desde GitHub (recomendado)

Necesitas tener **Git** instalado. Puedes verificarlo con:

```bash
git --version
```

Si no lo tienes, descárgalo desde [https://git-scm.com](https://git-scm.com).

**Paso 1 — Clonar el repositorio:**

```bash
git clone https://github.com/<tu-usuario>/<nombre-del-repositorio>.git
```

**Paso 2 — Entrar a la carpeta del proyecto:**

```bash
cd <nombre-del-repositorio>
```

**Paso 3 — Iniciar un servidor local:**

Necesitas un servidor local porque los navegadores modernos bloquean ciertas funciones al abrir archivos HTML directamente. Tienes varias opciones:

**Con Node.js** (recomendado — requiere Node.js instalado):

```bash
npx serve .
```

Luego abre en tu navegador: `http://localhost:3000`

**Con Python** (si tienes Python instalado):

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Luego abre en tu navegador: `http://localhost:8000`

**Con la extensión Live Server de VS Code:**

1. Instala la extensión **Live Server** en VS Code
2. Haz clic derecho sobre `index.html`
3. Selecciona **"Open with Live Server"**

Se abrirá automáticamente en `http://127.0.0.1:5500`

---

### Opción 2 — Descargar el ZIP

Si no quieres usar Git:

1. Ve al repositorio en GitHub
2. Haz clic en el botón verde **`<> Code`**
3. Selecciona **"Download ZIP"**
4. Descomprime el archivo descargado
5. Abre la carpeta y sigue el **Paso 3** de la Opción 1 para iniciar el servidor local

---

## 🚀 Desplegar en GitHub Pages

Si quieres publicar tu propia versión en GitHub Pages:

**Paso 1 — Asegúrate de que el repositorio sea público**

En GitHub, ve a **Settings → General → Visibility** y verifica que sea público.

**Paso 2 — Activar GitHub Pages**

1. Ve a tu repositorio en GitHub
2. Entra a **Settings** (configuración)
3. En el menú lateral busca **Pages**
4. En **Source**, selecciona la rama `main` (o `master`)
5. Selecciona la carpeta `/ (root)`
6. Haz clic en **Save**

**Paso 3 — Esperar el despliegue**

GitHub tarda entre 1 y 3 minutos en publicar el sitio. Una vez listo, verás la URL en la misma sección **Pages**:

```
https://<tu-usuario>.github.io/<nombre-del-repositorio>/
```

**Paso 4 — Actualizar el sitio**

Cada vez que hagas un `git push` a la rama `main`, GitHub Pages actualizará el sitio automáticamente en pocos minutos.

```bash
git add .
git commit -m "descripción del cambio"
git push origin main
```

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura semántica con BEM |
| CSS3 | Flexbox, variables CSS, media queries |
| JavaScript (ES6+) | Lógica, SVG dinámico, animaciones con `requestAnimationFrame` |
| SVG | Rueda de colores interactiva |
| Canvas API | Partículas de chispas durante el giro |
| localStorage | Persistencia de paletas guardadas |

---

## 📋 Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Node.js (solo si usas `npx serve` para el servidor local)
- Git (solo si clonas el repositorio)

No requiere frameworks, librerías externas ni proceso de compilación.

---

## 📌 Historial de commits principales

| # | Commit | Descripción |
|---|---|---|
| 1 | `feat: estructura HTML base` | Estructura HTML con BEM |
| 2 | `style: fondo negro y dos columnas` | Layout base en flexbox |
| 3 | `style: barra de controles y rueda` | Controles y área de la rueda |
| 4 | `style: panel de paletas guardadas` | Panel lateral derecho |
| 5 | `feat: variables globales y generador HSL` | Lógica de generación de colores |
| 6 | `feat: rueda SVG con colores` | Dibujado de la rueda con SVG |
| 7 | `feat: lista de colores con candados` | Lista lateral interactiva |
| 8 | `feat: girar rueda y selector de cantidad` | Controles con validación |
| 9 | `feat: guardar, copiar y eliminar paletas` | Gestión de paletas guardadas |
| 10 | `feat: interruptor HEX/HSL` | Alternador de formato de copia |
| 11 | `feat: animación de giro con chispas` | Efecto visual con canvas y blur |
| 12 | `feat: diseño responsive móvil` | Adaptación completa para móvil |
