// ============================================
// VARIABLES GLOBALES
// ============================================

// Cantidad de colores actual en la paleta
let cantidadColores = 6;

// Array que guarda los colores actuales
// Cada color es un objeto con su valor HSL y si está bloqueado
let coloresActuales = [];

// Formato de copia: 'hex' o 'hsl'
let formatoCopia = 'hex';

// Array que guarda las paletas guardadas
let paletasGuardadas = [];


// ============================================
// FUNCIONES DE COLOR
// ============================================

// Genera un número aleatorio entre min y max
function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Genera un color aleatorio en formato HSL
// HSL = Hue (tono 0-360), Saturation (saturación 0-100), Lightness (luminosidad 0-100)
function generarColorHSL() {
  const h = numeroAleatorio(0, 360);
  const s = numeroAleatorio(40, 90);
  const l = numeroAleatorio(35, 65);
  return { h, s, l };
}

// Convierte un color HSL a HEX
function hslAHex(h, s, l) {
  s /= 100;
  l /= 100;

  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);

  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Genera todos los colores de la paleta
// Si un color está bloqueado, lo mantiene igual
function generarPaleta() {
  if (coloresActuales.length === 0) {
    coloresActuales = Array.from({ length: cantidadColores }, () => ({
      hsl: generarColorHSL(),
      bloqueado: false
    }));
    return;
  }

  if (coloresActuales.length < cantidadColores) {
    while (coloresActuales.length < cantidadColores) {
      coloresActuales.push({ hsl: generarColorHSL(), bloqueado: false });
    }
  } else if (coloresActuales.length > cantidadColores) {
    coloresActuales = coloresActuales.slice(0, cantidadColores);
  }

  coloresActuales = coloresActuales.map(color => {
    if (color.bloqueado) return color;
    return { hsl: generarColorHSL(), bloqueado: false };
  });
}


// ============================================
// DIBUJAR RUEDA SVG
// ============================================

// Convierte coordenadas polares a cartesianas
// Necesario para calcular los puntos de cada segmento de la rueda
function polarACartesiano(angulo, radio) {
  const rad = (angulo - 90) * (Math.PI / 180);
  return {
    x: radio * Math.cos(rad),
    y: radio * Math.sin(rad)
  };
}

// Crea el path SVG de un segmento de la rueda
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
    'Z'
  ].join(' ');
}

// Dibuja la rueda completa con todos los colores
function dibujarRueda() {
  const svg = document.querySelector('.rueda');
  svg.innerHTML = '';

  const radioExterno = 1.0;
  const radioInterno = 0.4;
  const anguloPorColor = 360 / cantidadColores;

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const anguloInicio = index * anguloPorColor;
    const anguloFin = anguloInicio + anguloPorColor;
    const anguloMedio = anguloInicio + anguloPorColor / 2;

    // Crea el segmento de color
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', crearSegmento(anguloInicio, anguloFin, radioExterno, radioInterno));
    path.setAttribute('fill', `hsl(${h}, ${s}%, ${l}%)`);
    path.setAttribute('stroke', '#111');
    path.setAttribute('stroke-width', '0.02');
    svg.appendChild(path);

    // Calcula la posición del texto en el segmento
    const radioTexto = (radioExterno + radioInterno) / 2;
    const posTexto = polarACartesiano(anguloMedio, radioTexto);

    // Grupo de texto con HEX y HSL
    const grupo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grupo.setAttribute('transform', `translate(${posTexto.x}, ${posTexto.y}) rotate(${anguloMedio})`);

    // Texto HEX
    const textoHex = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textoHex.setAttribute('text-anchor', 'middle');
    textoHex.setAttribute('font-size', '0.09');
    textoHex.setAttribute('font-weight', 'bold');
    textoHex.setAttribute('fill', '#ffffff');
    textoHex.setAttribute('dy', '-0.05');
    textoHex.textContent = hex;

    // Texto HSL
    const textoHsl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textoHsl.setAttribute('text-anchor', 'middle');
    textoHsl.setAttribute('font-size', '0.07');
    textoHsl.setAttribute('fill', 'rgba(255,255,255,0.8)');
    textoHsl.setAttribute('dy', '0.07');
    textoHsl.textContent = `hsl(${h},${s}%,${l}%)`;

    grupo.appendChild(textoHex);
    grupo.appendChild(textoHsl);
    svg.appendChild(grupo);
  });

  // Círculo negro del centro
  const circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circulo.setAttribute('cx', '0');
  circulo.setAttribute('cy', '0');
  circulo.setAttribute('r', radioInterno.toString());
  circulo.setAttribute('fill', '#111111');
  svg.appendChild(circulo);
}

// ============================================
// DIBUJAR LISTA DE COLORES CON CANDADOS
// ============================================

function dibujarListaColores() {
  const lista = document.querySelector('.lista-colores');
  lista.innerHTML = '';

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    // Crea el elemento li
    const item = document.createElement('li');
    item.classList.add('lista-colores__item');

    // Muestra del color
    const muestra = document.createElement('div');
    muestra.classList.add('lista-colores__muestra');
    muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;

    // Texto del color (HEX o HSL según el modo)
    const texto = document.createElement('span');
    texto.classList.add('lista-colores__hex');
    texto.textContent = formatoCopia === 'hex'
      ? hex
      : `hsl(${h}, ${s}%, ${l}%)`;

    // Botón candado
    const candado = document.createElement('button');
    candado.classList.add('lista-colores__candado');
    candado.textContent = color.bloqueado ? '🔒' : '🔓';

    // Al hacer clic en el candado, bloquea o desbloquea el color
    candado.addEventListener('click', () => {
      coloresActuales[index].bloqueado = !coloresActuales[index].bloqueado;
      dibujarListaColores();
    });

    item.appendChild(muestra);
    item.appendChild(texto);
    item.appendChild(candado);
    lista.appendChild(item);
  });
}

// ============================================
// EVENTOS DE CONTROLES
// ============================================

// Referencia al selector de cantidad de colores
const selectorCantidad = document.querySelector('.barra-controles__selector');

// Referencia al botón girar
const botonGirar = document.querySelector('.boton-girar');

// Cuando cambia el selector de cantidad de colores
selectorCantidad.addEventListener('change', () => {
  // Extrae el número del texto "X colores"
  const nuevaCantidad = parseInt(selectorCantidad.value);

  // Cuenta cuántos colores están bloqueados actualmente
  const bloqueados = coloresActuales.filter(c => c.bloqueado).length;

  // No permite cambiar a una cantidad menor o igual a los bloqueados
  if (nuevaCantidad <= bloqueados) {
    alert(`Tienes ${bloqueados} colores bloqueados. Desbloquea algunos antes de reducir la paleta.`);
    // Regresa el selector al valor anterior
    selectorCantidad.value = `${cantidadColores} colores`;
    return;
  }

  cantidadColores = nuevaCantidad;
  generarPaleta();
  dibujarRueda();
  dibujarListaColores();
});

// Cuando se hace clic en el botón girar
botonGirar.addEventListener('click', () => {
  // Cuenta cuántos colores están bloqueados
  const bloqueados = coloresActuales.filter(c => c.bloqueado).length;

  // No permite girar si todos los colores están bloqueados
  if (bloqueados === cantidadColores) {
    alert('Todos los colores están bloqueados. Desbloquea al menos uno para girar.');
    return;
  }

  generarPaleta();
  dibujarRueda();
  dibujarListaColores();
});

// ============================================
// PALETAS GUARDADAS
// ============================================

// Referencia al botón guardar y a la lista de guardadas
const botonGuardar = document.querySelector('.boton-guardar');
const listaGuardadas = document.querySelector('.lista-guardadas');

// Dibuja la lista de paletas guardadas
function dibujarPaletasGuardadas() {
  listaGuardadas.innerHTML = '';

  if (paletasGuardadas.length === 0) {
    listaGuardadas.innerHTML = '<p class="lista-guardadas__vacia">No hay paletas guardadas</p>';
    return;
  }

  paletasGuardadas.forEach((paleta, index) => {
    const item = document.createElement('li');
    item.classList.add('lista-guardadas__item');

    // Encabezado con nombre y botones
    const encabezado = document.createElement('div');
    encabezado.classList.add('lista-guardadas__encabezado');

    const nombre = document.createElement('span');
    nombre.classList.add('lista-guardadas__nombre');
    nombre.textContent = `Paleta (${paleta.length} colores)`;

    const acciones = document.createElement('div');
    acciones.classList.add('lista-guardadas__acciones');

    // Botón copiar
    const botonCopiar = document.createElement('button');
    botonCopiar.classList.add('boton-copiar-paleta');
    botonCopiar.textContent = '📋';
    botonCopiar.addEventListener('click', () => copiarPaleta(paleta));

    // Botón eliminar
    const botonEliminar = document.createElement('button');
    botonEliminar.classList.add('boton-eliminar-paleta');
    botonEliminar.textContent = '🗑️';
    botonEliminar.addEventListener('click', () => {
      paletasGuardadas.splice(index, 1);
      dibujarPaletasGuardadas();
    });

    acciones.appendChild(botonCopiar);
    acciones.appendChild(botonEliminar);
    encabezado.appendChild(nombre);
    encabezado.appendChild(acciones);

    // Muestras de colores
    const muestras = document.createElement('div');
    muestras.classList.add('lista-guardadas__muestras');

    paleta.forEach(color => {
      const { h, s, l } = color.hsl;
      const muestra = document.createElement('div');
      muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;
      muestra.style.flex = '1';
      muestras.appendChild(muestra);
    });

    item.appendChild(encabezado);
    item.appendChild(muestras);
    listaGuardadas.appendChild(item);
  });
}

// Copia los colores de una paleta al portapapeles
function copiarPaleta(paleta) {
  const textos = paleta.map(color => {
    const { h, s, l } = color.hsl;
    return formatoCopia === 'hex'
      ? hslAHex(h, s, l)
      : `hsl(${h}, ${s}%, ${l}%)`;
  });

  navigator.clipboard.writeText(textos.join(', '))
    .then(() => alert('Paleta copiada al portapapeles'))
    .catch(() => alert('No se pudo copiar'));
}

// Guarda la paleta actual
botonGuardar.addEventListener('click', () => {
  // Guarda una copia profunda de los colores actuales
  const copia = coloresActuales.map(color => ({
    hsl: { ...color.hsl },
    bloqueado: false
  }));

  paletasGuardadas.push(copia);
  dibujarPaletasGuardadas();
});

// ============================================
// INICIO
// ============================================

generarPaleta();
dibujarRueda();
dibujarListaColores();
console.log('Colores generados:', coloresActuales);