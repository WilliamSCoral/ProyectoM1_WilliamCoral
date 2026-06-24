// ============================================
// ESTADO GLOBAL DE LA APLICACIÓN
// Todas las variables que representan el estado
// actual de la app se declaran aquí arriba.
// ============================================

/** Cantidad de colores activa en la paleta (entre 4 y 9) */
let cantidadColores = 6;

/** Array de objetos { hsl: {h, s, l}, bloqueado: boolean } */
let coloresActuales = [];

/** Índice del color seleccionado en la rueda y la lista (-1 = ninguno) */
let colorSeleccionado = -1;

/** Formato activo para copiar al portapapeles: 'hex' o 'hsl' */
let formatoCopia = "hex";

/** Paletas guardadas, persistidas en localStorage */
let paletasGuardadas = JSON.parse(localStorage.getItem("paletasGuardadas") ?? "[]");

// ============================================
// ESTADO DE LA ANIMACIÓN DE GIRO
// ============================================

/** Ángulo acumulado de rotación de la rueda (en radianes) */
let anguloActual = 0;

/** Velocidad actual del giro (rad/frame), se reduce con fricción */
let velocidadGiro = 0;

/** true mientras la rueda está girando */
let estaGirando = false;

/** Partículas de chispas activas durante el giro */
let chispas = [];

/** Factor de fricción: reduce la velocidad cada frame (0.975 = frena suavemente) */
const FRICCION = 0.975;

/** Velocidad mínima antes de considerar que la rueda se detuvo */
const VELOCIDAD_MINIMA = 0.001;


// ============================================
// UTILIDADES DE COLOR
// ============================================

/**
 * Genera un número entero aleatorio entre min y max (inclusive).
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {number}
 */
function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera un color aleatorio en formato HSL con rangos controlados
 * para que los colores sean siempre vivos y distinguibles.
 * @returns {{ h: number, s: number, l: number }}
 */
function generarColorHSL() {
  return {
    h: numeroAleatorio(0, 360),
    s: numeroAleatorio(40, 90),
    l: numeroAleatorio(35, 65),
  };
}

/**
 * Convierte un color HSL a su representación HEX (#RRGGBB).
 * @param {number} h - Tono (0-360)
 * @param {number} s - Saturación (0-100)
 * @param {number} l - Luminosidad (0-100)
 * @returns {string} Color en formato HEX en mayúsculas, ej: "#A3F2C1"
 */
function hslAHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const aHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${aHex(f(0))}${aHex(f(8))}${aHex(f(4))}`.toUpperCase();
}

/**
 * Calcula si el texto sobre un color HSL debe ser blanco o negro
 * para garantizar contraste legible.
 * @param {number} h - Tono
 * @param {number} s - Saturación
 * @param {number} l - Luminosidad
 * @returns {string} '#ffffff' o '#000000'
 */
function colorContraste(h, s, l) {
  const lNorm = l / 100;
  const sNorm = s / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const luminancia = lNorm - c * 0.5;
  return luminancia > 0.45 ? "#000000" : "#ffffff";
}

/**
 * Genera o actualiza el array `coloresActuales` según `cantidadColores`.
 * - Si está vacío: crea todos los colores desde cero.
 * - Si la cantidad cambió: ajusta el tamaño del array.
 * - Los colores bloqueados se conservan siempre.
 */
function generarPaleta() {
  if (coloresActuales.length === 0) {
    coloresActuales = Array.from({ length: cantidadColores }, () => ({
      hsl: generarColorHSL(),
      bloqueado: false,
    }));
    return;
  }

  // Ajustar tamaño si cambió la cantidad
  while (coloresActuales.length < cantidadColores) {
    coloresActuales.push({ hsl: generarColorHSL(), bloqueado: false });
  }
  if (coloresActuales.length > cantidadColores) {
    coloresActuales = coloresActuales.slice(0, cantidadColores);
  }

  // Regenerar solo los colores no bloqueados
  coloresActuales = coloresActuales.map((color) =>
    color.bloqueado ? color : { hsl: generarColorHSL(), bloqueado: false }
  );
}

/**
 * Guarda el estado actual de `paletasGuardadas` en localStorage.
 */
function persistirPaletas() {
  localStorage.setItem("paletasGuardadas", JSON.stringify(paletasGuardadas));
}


// ============================================
// CANVAS DE CHISPAS
// Overlay transparente encima de la rueda SVG
// donde se dibujan las partículas de chispas.
// ============================================

/**
 * Obtiene el canvas de chispas existente o lo crea y lo inserta
 * como hijo absoluto del contenedor de la rueda.
 * @returns {HTMLCanvasElement}
 */
function obtenerOCrearCanvas() {
  let canvas = document.getElementById("canvas-chispas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "canvas-chispas";
    Object.assign(canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "10",
    });
    const contenedor = document.querySelector(".rueda-contenedor");
    if (contenedor) {
      contenedor.style.position = "relative";
      contenedor.appendChild(canvas);
    }
  }
  return canvas;
}

/**
 * Ajusta la resolución interna del canvas al tamaño visual de su contenedor.
 * Debe llamarse antes de dibujar para evitar distorsión.
 * @param {HTMLCanvasElement} canvas
 */
function ajustarCanvas(canvas) {
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (!rect) return;
  canvas.width = rect.width;
  canvas.height = rect.height;
}

/**
 * Crea nuevas partículas de chispas proporcionales a la velocidad actual.
 * Cada chispa tiene posición, velocidad, color, tamaño y vida propios.
 * @param {HTMLCanvasElement} canvas
 */
function crearChispas(canvas) {
  const centroX = canvas.width / 2;
  const centroY = canvas.height / 2;
  const cantidad = Math.floor(velocidadGiro * 18);
  const coloresChispas = ["#fed811", "#ff9f1c", "#ff4757", "#ffffff", "#00bcd4"];

  for (let i = 0; i < cantidad; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const vel = Math.random() * 5 + 2;
    chispas.push({
      x: centroX + Math.cos(angulo) * 50,
      y: centroY + Math.sin(angulo) * 50,
      vx: Math.cos(angulo) * vel + (Math.random() - 0.5) * 1.5,
      vy: Math.sin(angulo) * vel + (Math.random() - 0.5) * 1.5,
      color: coloresChispas[Math.floor(Math.random() * coloresChispas.length)],
      radio: Math.random() * 2.5 + 1,
      vida: 1.0,
      decaimiento: Math.random() * 0.03 + 0.015,
    });
  }
}

/**
 * Dibuja y actualiza todas las chispas activas en el canvas.
 * Aplica física simple: gravedad, movimiento y desvanecimiento.
 * @param {HTMLCanvasElement} canvas
 */
function dibujarChispas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Filtrar chispas muertas antes de dibujar
  chispas = chispas.filter((c) => c.vida > 0);

  chispas.forEach((c) => {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.08; // gravedad
    c.vida -= c.decaimiento;

    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radio, 0, Math.PI * 2);
    ctx.fillStyle = c.color;
    ctx.globalAlpha = Math.max(0, c.vida);
    ctx.shadowBlur = 8;
    ctx.shadowColor = c.color;
    ctx.fill();
    ctx.restore();
  });
}


// ============================================
// CONSTRUCCIÓN DE LA RUEDA SVG
// ============================================

/**
 * Convierte coordenadas polares (ángulo en grados, radio) a cartesianas (x, y).
 * El ángulo 0° apunta hacia arriba (eje Y negativo), igual que un reloj.
 * @param {number} angulo - En grados
 * @param {number} radio
 * @returns {{ x: number, y: number }}
 */
function polarACartesiano(angulo, radio) {
  const rad = (angulo - 90) * (Math.PI / 180);
  return { x: radio * Math.cos(rad), y: radio * Math.sin(rad) };
}

/**
 * Genera el atributo `d` de un path SVG en forma de segmento de dona
 * (arco exterior + arco interior invertido).
 * @param {number} anguloInicio - En grados
 * @param {number} anguloFin - En grados
 * @param {number} radioExterno
 * @param {number} radioInterno
 * @returns {string} Path SVG
 */
function crearSegmento(anguloInicio, anguloFin, radioExterno, radioInterno) {
  const inicio = polarACartesiano(anguloInicio, radioExterno);
  const fin = polarACartesiano(anguloFin, radioExterno);
  const inicioInterno = polarACartesiano(anguloFin, radioInterno);
  const finInterno = polarACartesiano(anguloInicio, radioInterno);
  const arcoGrande = anguloFin - anguloInicio > 180 ? 1 : 0;

  return [
    `M ${inicio.x} ${inicio.y}`,
    `A ${radioExterno} ${radioExterno} 0 ${arcoGrande} 1 ${fin.x} ${fin.y}`,
    `L ${inicioInterno.x} ${inicioInterno.y}`,
    `A ${radioInterno} ${radioInterno} 0 ${arcoGrande} 0 ${finInterno.x} ${finInterno.y}`,
    "Z",
  ].join(" ");
}

/**
 * Construye todos los elementos SVG de la rueda (segmentos + textos + círculo central)
 * dentro del SVG recibido. Se usa tanto para la rueda de escritorio como la de móvil.
 * @param {SVGElement} svg - Elemento SVG donde se construye la rueda
 */
function construirRuedaEnSVG(svg) {
  svg.innerHTML = "";

  const RADIO_EXTERNO = 1.0;
  const RADIO_INTERNO = 0.25;
  const RADIO_SELECCIONADO = 1.08;
  const anguloPorColor = 360 / cantidadColores;
  const fontSize = Math.max(0.04, 0.13 - cantidadColores * 0.01);

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const anguloInicio = index * anguloPorColor;
    const anguloFin = anguloInicio + anguloPorColor;
    const anguloMedio = anguloInicio + anguloPorColor / 2;
    const radioActual = index === colorSeleccionado ? RADIO_SELECCIONADO : RADIO_EXTERNO;

    // Segmento de color
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", crearSegmento(anguloInicio, anguloFin, radioActual, RADIO_INTERNO));
    path.setAttribute("fill", `hsl(${h}, ${s}%, ${l}%)`);
    path.setAttribute("stroke", "#111");
    path.setAttribute("stroke-width", "0.02");
    path.style.cursor = estaGirando ? "default" : "pointer";
    path.style.transition = "all 0.2s ease";

    path.addEventListener("click", () => {
      if (estaGirando) return;
      colorSeleccionado = colorSeleccionado === index ? -1 : index;
      dibujarRueda();
      dibujarRuedaMovil();
      dibujarListaColores();
      dibujarListaColoresMovil();
      copiarColor(h, s, l);
    });

    svg.appendChild(path);

    // Texto del color centrado en el segmento
    const radioTexto = (radioActual + RADIO_INTERNO) / 2;
    const posTexto = polarACartesiano(anguloMedio, radioTexto);

    const grupo = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grupo.setAttribute(
      "transform",
      `translate(${posTexto.x}, ${posTexto.y}) rotate(${anguloMedio})`
    );

    const textoColor = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textoColor.setAttribute("text-anchor", "middle");
    textoColor.setAttribute("font-size", fontSize.toString());
    textoColor.setAttribute("font-weight", "bold");
    textoColor.setAttribute("fill", "#ffffff");
    textoColor.setAttribute("dy", "0");
    textoColor.textContent = formatoCopia === "hex" ? hex : `hsl(${h},${s}%,${l}%)`;

    grupo.appendChild(textoColor);
    svg.appendChild(grupo);
  });

  // Círculo central decorativo
  const circulo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circulo.setAttribute("cx", "0");
  circulo.setAttribute("cy", "0");
  circulo.setAttribute("r", RADIO_INTERNO.toString());
  circulo.setAttribute("fill", "#111111");
  svg.appendChild(circulo);
}

/**
 * Reconstruye y aplica la rotación actual a la rueda de escritorio.
 */
function dibujarRueda() {
  const svg = document.querySelector(".rueda");
  if (!svg) return;
  construirRuedaEnSVG(svg);
  svg.style.transform = `rotate(${anguloActual}rad)`;
  svg.style.transformOrigin = "center";
}

/**
 * Reconstruye y aplica la rotación actual a la rueda de móvil.
 */
function dibujarRuedaMovil() {
  const svg = document.querySelector(".rueda--movil");
  if (!svg) return;
  construirRuedaEnSVG(svg);
  svg.style.transform = `rotate(${anguloActual}rad)`;
  svg.style.transformOrigin = "center";
}


// ============================================
// ANIMACIÓN DE GIRO CON CHISPAS Y BLUR
// ============================================

/**
 * Loop de animación principal usando requestAnimationFrame.
 * Cada frame: reduce la velocidad por fricción, rota los SVG,
 * aplica blur proporcional a la velocidad, genera chispas y las dibuja.
 * Cuando la velocidad llega al mínimo, detiene la animación y redibuja todo.
 */
function animarGiro() {
  if (!estaGirando && chispas.length === 0) return;

  if (estaGirando) {
    velocidadGiro *= FRICCION;
    anguloActual += velocidadGiro;

    const blur = velocidadGiro > 0.12 ? Math.min(velocidadGiro * 6, 3) : 0;
    const svgPrincipal = document.querySelector(".rueda");
    const svgMovil = document.querySelector(".rueda--movil");

    // Actualizar colores y rotación en cada frame
    if (svgPrincipal) construirRuedaEnSVG(svgPrincipal);
    if (svgMovil) construirRuedaEnSVG(svgMovil);

    if (svgPrincipal) {
      svgPrincipal.style.transform = `rotate(${anguloActual}rad)`;
      svgPrincipal.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
    }
    if (svgMovil) {
      svgMovil.style.transform = `rotate(${anguloActual}rad)`;
      svgMovil.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
    }

    // Generar chispas mientras gira rápido
    if (velocidadGiro > 0.05) {
      const canvas = document.getElementById("canvas-chispas");
      if (canvas) crearChispas(canvas);
    }

    // Detener cuando la velocidad es mínima
    if (velocidadGiro < VELOCIDAD_MINIMA) {
      estaGirando = false;
      velocidadGiro = 0;
      if (svgPrincipal) svgPrincipal.style.filter = "none";
      if (svgMovil) svgMovil.style.filter = "none";
      dibujarRueda();
      dibujarRuedaMovil();
      dibujarListaColores();
      dibujarListaColoresMovil();
    }
  }

  // Dibujar chispas en el canvas overlay
  const canvas = document.getElementById("canvas-chispas");
  if (canvas) dibujarChispas(canvas);

  requestAnimationFrame(animarGiro);
}

/**
 * Inicia el giro de la rueda con velocidad aleatoria.
 * Genera la nueva paleta antes de arrancar para que los colores
 * cambien visualmente durante el giro.
 * Bloquea la interacción mientras gira.
 */
function dispararGiro() {
  if (estaGirando) return;

  const bloqueados = coloresActuales.filter((c) => c.bloqueado).length;
  if (bloqueados === cantidadColores) {
    alert("Todos los colores están bloqueados. Desbloquea al menos uno para girar.");
    return;
  }

  const canvas = obtenerOCrearCanvas();
  ajustarCanvas(canvas);

  // Generar nueva paleta antes de girar para ver el cambio durante la animación
  generarPaleta();

  estaGirando = true;
  chispas = [];
  colorSeleccionado = -1;
  velocidadGiro = Math.random() * 0.32 + 0.55;

  animarGiro();
}


// ============================================
// LISTA DE COLORES CON CANDADOS
// ============================================

/**
 * Construye y renderiza la lista de colores lateral (escritorio).
 * Cada ítem muestra la muestra de color, el código y el candado.
 * El clic en el ítem selecciona el color y lo copia.
 * El clic en el candado bloquea/desbloquea sin propagar el evento.
 */
function dibujarListaColores() {
  const lista = document.querySelector(".lista-colores");
  if (!lista) return;
  lista.innerHTML = "";

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const item = document.createElement("li");
    item.classList.add("lista-colores__item");
    item.style.cursor = "pointer";
    if (index === colorSeleccionado) item.classList.add("lista-colores__item--seleccionado");

    const muestra = document.createElement("div");
    muestra.classList.add("lista-colores__muestra");
    muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;

    const texto = document.createElement("span");
    texto.classList.add("lista-colores__hex");
    texto.textContent = formatoCopia === "hex" ? hex : `hsl(${h}, ${s}%, ${l}%)`;

    const candado = document.createElement("button");
    candado.classList.add("lista-colores__candado");
    candado.textContent = color.bloqueado ? "🔒" : "🔓";
    candado.title = color.bloqueado ? "Desbloquear color" : "Bloquear color";

    candado.addEventListener("click", (e) => {
      e.stopPropagation(); // Evitar que el clic llegue al ítem
      coloresActuales[index].bloqueado = !coloresActuales[index].bloqueado;
      dibujarListaColores();
      dibujarListaColoresMovil();
    });

    item.addEventListener("click", () => {
      if (estaGirando) return;
      colorSeleccionado = colorSeleccionado === index ? -1 : index;
      dibujarRueda();
      dibujarRuedaMovil();
      dibujarListaColores();
      dibujarListaColoresMovil();
      copiarColor(h, s, l);
    });

    item.appendChild(muestra);
    item.appendChild(texto);
    item.appendChild(candado);
    lista.appendChild(item);
  });
}

/**
 * Construye y renderiza la lista de colores horizontal para móvil.
 * Misma lógica que dibujarListaColores pero apunta al selector móvil.
 */
function dibujarListaColoresMovil() {
  const lista = document.querySelector(".lista-colores--movil");
  if (!lista) return;
  lista.innerHTML = "";

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const item = document.createElement("li");
    item.classList.add("lista-colores__item");
    item.style.cursor = "pointer";
    if (index === colorSeleccionado) item.classList.add("lista-colores__item--seleccionado");

    const muestra = document.createElement("div");
    muestra.classList.add("lista-colores__muestra");
    muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;

    const texto = document.createElement("span");
    texto.classList.add("lista-colores__hex");
    texto.textContent = formatoCopia === "hex" ? hex : `hsl(${h}, ${s}%, ${l}%)`;

    const candado = document.createElement("button");
    candado.classList.add("lista-colores__candado");
    candado.textContent = color.bloqueado ? "🔒" : "🔓";
    candado.title = color.bloqueado ? "Desbloquear color" : "Bloquear color";

    candado.addEventListener("click", (e) => {
      e.stopPropagation();
      coloresActuales[index].bloqueado = !coloresActuales[index].bloqueado;
      dibujarListaColores();
      dibujarListaColoresMovil();
    });

    item.addEventListener("click", () => {
      if (estaGirando) return;
      colorSeleccionado = colorSeleccionado === index ? -1 : index;
      dibujarRuedaMovil();
      dibujarListaColoresMovil();
      copiarColor(h, s, l);
    });

    item.appendChild(muestra);
    item.appendChild(texto);
    item.appendChild(candado);
    lista.appendChild(item);
  });
}


// ============================================
// PALETAS GUARDADAS
// ============================================

/**
 * Renderiza la lista de paletas guardadas en el panel lateral de escritorio.
 * Si no hay paletas, muestra un mensaje vacío.
 */
function dibujarPaletasGuardadas() {
  listaGuardadas.innerHTML = "";

  if (paletasGuardadas.length === 0) {
    listaGuardadas.innerHTML = '<p class="lista-guardadas__vacia">No hay paletas guardadas</p>';
    return;
  }

  paletasGuardadas.forEach((paleta, index) => {
    const item = document.createElement("li");
    item.classList.add("lista-guardadas__item");

    const encabezado = document.createElement("div");
    encabezado.classList.add("lista-guardadas__encabezado");

    const nombre = document.createElement("span");
    nombre.classList.add("lista-guardadas__nombre");
    nombre.textContent = `Paleta (${paleta.length} colores)`;

    const acciones = document.createElement("div");
    acciones.classList.add("lista-guardadas__acciones");

    const botonCopiar = document.createElement("button");
    botonCopiar.classList.add("boton-copiar-paleta");
    botonCopiar.textContent = "📋";
    botonCopiar.title = "Copiar colores de la paleta";
    botonCopiar.addEventListener("click", () => copiarPaleta(paleta));

    const botonEliminar = document.createElement("button");
    botonEliminar.classList.add("boton-eliminar-paleta");
    botonEliminar.textContent = "🗑️";
    botonEliminar.title = "Eliminar paleta";
    botonEliminar.addEventListener("click", () => {
      paletasGuardadas.splice(index, 1);
      persistirPaletas();
      dibujarPaletasGuardadas();
      dibujarModalGuardadas();
    });

    acciones.appendChild(botonCopiar);
    acciones.appendChild(botonEliminar);
    encabezado.appendChild(nombre);
    encabezado.appendChild(acciones);

    // Barra de muestras de color
    const muestras = document.createElement("div");
    muestras.classList.add("lista-guardadas__muestras");
    paleta.forEach((color) => {
      const { h, s, l } = color.hsl;
      const muestra = document.createElement("div");
      muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
      muestra.style.flex = "1";
      muestras.appendChild(muestra);
    });

    item.appendChild(encabezado);
    item.appendChild(muestras);
    listaGuardadas.appendChild(item);
  });
}

/**
 * Copia todos los colores de una paleta guardada al portapapeles
 * en el formato activo (HEX o HSL), separados por comas.
 * @param {Array} paleta - Array de objetos { hsl: {h, s, l} }
 */
function copiarPaleta(paleta) {
  const textos = paleta.map(({ hsl: { h, s, l } }) =>
    formatoCopia === "hex" ? hslAHex(h, s, l) : `hsl(${h}, ${s}%, ${l}%)`
  );
  navigator.clipboard
    .writeText(textos.join(", "))
    .then(() => alert("Paleta copiada al portapapeles"))
    .catch(() => alert("No se pudo copiar"));
}

/**
 * Renderiza el modal de paletas guardadas para móvil.
 * Comparte la misma lógica visual que dibujarPaletasGuardadas.
 */
function dibujarModalGuardadas() {
  if (!modalLista) return;
  modalLista.innerHTML = "";

  if (paletasGuardadas.length === 0) {
    modalLista.innerHTML = '<p class="modal-guardadas__vacia">No hay paletas guardadas</p>';
    return;
  }

  paletasGuardadas.forEach((paleta, index) => {
    const item = document.createElement("li");
    item.classList.add("lista-guardadas__item");

    const encabezado = document.createElement("div");
    encabezado.classList.add("lista-guardadas__encabezado");

    const nombre = document.createElement("span");
    nombre.classList.add("lista-guardadas__nombre");
    nombre.textContent = `Paleta (${paleta.length} colores)`;

    const acciones = document.createElement("div");
    acciones.classList.add("lista-guardadas__acciones");

    const botonCopiar = document.createElement("button");
    botonCopiar.classList.add("boton-copiar-paleta");
    botonCopiar.textContent = "📋";
    botonCopiar.title = "Copiar colores de la paleta";
    botonCopiar.addEventListener("click", () => copiarPaleta(paleta));

    const botonEliminar = document.createElement("button");
    botonEliminar.classList.add("boton-eliminar-paleta");
    botonEliminar.textContent = "🗑️";
    botonEliminar.title = "Eliminar paleta";
    botonEliminar.addEventListener("click", () => {
      paletasGuardadas.splice(index, 1);
      persistirPaletas();
      dibujarPaletasGuardadas();
      dibujarModalGuardadas();
    });

    acciones.appendChild(botonCopiar);
    acciones.appendChild(botonEliminar);
    encabezado.appendChild(nombre);
    encabezado.appendChild(acciones);

    const muestras = document.createElement("div");
    muestras.classList.add("lista-guardadas__muestras");
    paleta.forEach(({ hsl: { h, s, l } }) => {
      const muestra = document.createElement("div");
      muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
      muestra.style.flex = "1";
      muestras.appendChild(muestra);
    });

    item.appendChild(encabezado);
    item.appendChild(muestras);
    modalLista.appendChild(item);
  });
}


// ============================================
// NOTIFICACIÓN FLOTANTE AL COPIAR COLOR
// ============================================

/**
 * Muestra una notificación flotante con el color copiado.
 * El fondo es el propio color seleccionado y el texto usa
 * contraste automático (blanco o negro) para ser legible.
 * En desktop aparece abajo a la derecha; en móvil desde arriba centrada.
 * @param {number} h - Tono del color copiado
 * @param {number} s - Saturación
 * @param {number} l - Luminosidad
 * @param {string} texto - Código del color (HEX o HSL)
 */
function mostrarNotificacion(h, s, l, texto) {
  // Eliminar notificación previa si existe
  document.querySelector(".notificacion")?.remove();

  const notificacion = document.createElement("div");
  notificacion.classList.add("notificacion");
  notificacion.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
  notificacion.style.color = colorContraste(h, s, l);

  // Círculo decorativo con el color
  const circulo = document.createElement("div");
  circulo.classList.add("notificacion__circulo");
  circulo.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
  const bordeContraste = colorContraste(h, s, l) === "#ffffff"
    ? "rgba(255,255,255,0.4)"
    : "rgba(0,0,0,0.2)";
  circulo.style.border = `2px solid ${bordeContraste}`;

  // Texto: etiqueta + código
  const etiqueta = document.createElement("span");
  etiqueta.style.cssText = "font-size:11px; opacity:0.8; display:block;";
  etiqueta.textContent = "Color copiado";

  const codigo = document.createElement("span");
  codigo.classList.add("notificacion__codigo");
  codigo.textContent = texto;

  const contenedorTexto = document.createElement("div");
  contenedorTexto.style.cssText = "display:flex; flex-direction:column; gap:2px;";
  contenedorTexto.appendChild(etiqueta);
  contenedorTexto.appendChild(codigo);

  notificacion.appendChild(circulo);
  notificacion.appendChild(contenedorTexto);
  document.body.appendChild(notificacion);

  // Animación de entrada y salida
  setTimeout(() => notificacion.classList.add("notificacion--visible"), 10);
  setTimeout(() => {
    notificacion.classList.remove("notificacion--visible");
    setTimeout(() => notificacion.remove(), 400);
  }, 2500);
}

/**
 * Copia un color individual al portapapeles en el formato activo
 * y muestra la notificación flotante.
 * @param {number} h - Tono
 * @param {number} s - Saturación
 * @param {number} l - Luminosidad
 */
function copiarColor(h, s, l) {
  const texto = formatoCopia === "hex"
    ? hslAHex(h, s, l)
    : `hsl(${h}, ${s}%, ${l}%)`;

  // Fallback para navegadores sin soporte de clipboard API
  const area = document.createElement("textarea");
  area.value = texto;
  area.style.cssText = "position:fixed; opacity:0;";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);

  mostrarNotificacion(h, s, l, texto);
}


// ============================================
// INTERRUPTOR HEX / HSL
// ============================================

// Referencias a los botones de ambas vistas
const botonHex = document.querySelectorAll(".alternador-copia__boton")[0];
const botonHsl = document.querySelectorAll(".alternador-copia__boton")[1];
const botonHexMovil = document.querySelector(".boton-hex-movil");
const botonHslMovil = document.querySelector(".boton-hsl-movil");

/**
 * Cambia el formato de copia entre HEX y HSL.
 * Actualiza las clases activas en los botones de escritorio y móvil,
 * la clase del body para el tema global, y redibuja la interfaz.
 * @param {'hex'|'hsl'} formato
 */
function cambiarFormato(formato) {
  formatoCopia = formato;

  // Tema global en el body (por si se necesita en CSS vía var)
  document.body.classList.toggle("tema-hex", formato === "hex");
  document.body.classList.toggle("tema-hsl", formato === "hsl");

  // Actualizar estados activos en escritorio
  botonHex.classList.toggle("alternador-copia__boton--activo-hex", formato === "hex");
  botonHex.classList.toggle("alternador-copia__boton--activo-hsl", false);
  botonHsl.classList.toggle("alternador-copia__boton--activo-hsl", formato === "hsl");
  botonHsl.classList.toggle("alternador-copia__boton--activo-hex", false);

  // Actualizar estados activos en móvil
  botonHexMovil?.classList.toggle("alternador-copia__boton--activo-hex", formato === "hex");
  botonHexMovil?.classList.toggle("alternador-copia__boton--activo-hsl", false);
  botonHslMovil?.classList.toggle("alternador-copia__boton--activo-hsl", formato === "hsl");
  botonHslMovil?.classList.toggle("alternador-copia__boton--activo-hex", false);

  // Refrescar toda la interfaz con el nuevo formato
  dibujarListaColores();
  dibujarListaColoresMovil();
  dibujarRueda();
  dibujarRuedaMovil();
}

botonHex.addEventListener("click", () => cambiarFormato("hex"));
botonHsl.addEventListener("click", () => cambiarFormato("hsl"));
botonHexMovil?.addEventListener("click", () => cambiarFormato("hex"));
botonHslMovil?.addEventListener("click", () => cambiarFormato("hsl"));


// ============================================
// REFERENCIAS A ELEMENTOS DEL DOM
// Se declaran aquí para no repetir querySelector en cada función.
// ============================================

const selectorCantidad = document.querySelector(".barra-controles__selector");
const selectorMovil = document.querySelector(".barra-controles__selector-movil");
const botonGirar = document.querySelector(".boton-girar");
const botonGuardar = document.querySelector(".boton-guardar");
const listaGuardadas = document.querySelector(".lista-guardadas");
const modal = document.querySelector(".modal-guardadas");
const modalLista = document.querySelector(".modal-guardadas__lista");
const modalCerrar = document.querySelector(".modal-guardadas__cerrar");


// ============================================
// EVENTOS DE CONTROLES — ESCRITORIO
// ============================================

/** Cambia la cantidad de colores de la paleta desde el selector de escritorio */
selectorCantidad.addEventListener("change", () => {
  if (estaGirando) { selectorCantidad.value = cantidadColores; return; }

  const nuevaCantidad = parseInt(selectorCantidad.value);
  const bloqueados = coloresActuales.filter((c) => c.bloqueado).length;

  if (nuevaCantidad <= bloqueados) {
    alert(`Tienes ${bloqueados} colores bloqueados. Desbloquea algunos antes de reducir.`);
    selectorCantidad.value = cantidadColores;
    return;
  }

  cantidadColores = nuevaCantidad;
  generarPaleta();
  dibujarRueda();
  dibujarRuedaMovil();
  dibujarListaColores();
  dibujarListaColoresMovil();
});

/** Dispara el giro al presionar el botón principal */
botonGirar.addEventListener("click", dispararGiro);

/** Guarda la paleta actual en localStorage y la muestra en el panel */
botonGuardar.addEventListener("click", () => {
  if (estaGirando) return;
  const copia = coloresActuales.map(({ hsl, }) => ({ hsl: { ...hsl }, bloqueado: false }));
  paletasGuardadas.push(copia);
  persistirPaletas();
  dibujarPaletasGuardadas();
  dibujarModalGuardadas();
});


// ============================================
// EVENTOS DE CONTROLES — MÓVIL
// ============================================

/** Cambia la cantidad de colores desde el selector de móvil y sincroniza con escritorio */
selectorMovil?.addEventListener("change", () => {
  if (estaGirando) { selectorMovil.value = cantidadColores; return; }

  const nuevaCantidad = parseInt(selectorMovil.value);
  const bloqueados = coloresActuales.filter((c) => c.bloqueado).length;

  if (nuevaCantidad <= bloqueados) {
    alert(`Tienes ${bloqueados} colores bloqueados. Desbloquea algunos antes de reducir.`);
    selectorMovil.value = cantidadColores;
    return;
  }

  cantidadColores = nuevaCantidad;
  selectorCantidad.value = cantidadColores; // Sincronizar selector de escritorio
  generarPaleta();
  dibujarRueda();
  dibujarRuedaMovil();
  dibujarListaColores();
  dibujarListaColoresMovil();
});

/** Botón girar en móvil — usa la misma función que escritorio */
document.querySelector(".boton-girar--movil")?.addEventListener("click", dispararGiro);

/** Botón guardar en móvil */
document.querySelector(".boton-guardar--movil")?.addEventListener("click", () => {
  if (estaGirando) return;
  const copia = coloresActuales.map(({ hsl }) => ({ hsl: { ...hsl }, bloqueado: false }));
  paletasGuardadas.push(copia);
  persistirPaletas();
  dibujarPaletasGuardadas();
  dibujarModalGuardadas();
});

/** Abre el modal de paletas guardadas en móvil */
document.querySelector(".boton-ver-guardadas")?.addEventListener("click", () => {
  dibujarModalGuardadas();
  modal?.classList.add("modal-guardadas--visible");
});

/** Cierra el modal con el botón X */
modalCerrar?.addEventListener("click", () => {
  modal?.classList.remove("modal-guardadas--visible");
});

/** Cierra el modal al tocar el fondo oscuro */
modal?.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("modal-guardadas--visible");
});


// ============================================
// INICIALIZACIÓN
// Orden importante: primero generar datos,
// luego renderizar cada parte de la UI.
// ============================================

generarPaleta();
dibujarRueda();
dibujarRuedaMovil();
dibujarListaColores();
dibujarListaColoresMovil();
dibujarPaletasGuardadas();
cambiarFormato("hex");
