// ============================================
// VARIABLES GLOBALES
// ============================================

let cantidadColores = 6;
let coloresActuales = [];
let colorSeleccionado = -1;
let formatoCopia = 'hex';

const guardadas = localStorage.getItem('paletasGuardadas');
let paletasGuardadas = guardadas ? JSON.parse(guardadas) : [];


// ============================================
// FUNCIONES DE COLOR
// ============================================

function numeroAleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generarColorHSL() {
  const h = numeroAleatorio(0, 360);
  const s = numeroAleatorio(40, 90);
  const l = numeroAleatorio(35, 65);
  return { h, s, l };
}

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

function polarACartesiano(angulo, radio) {
  const rad = (angulo - 90) * (Math.PI / 180);
  return {
    x: radio * Math.cos(rad),
    y: radio * Math.sin(rad)
  };
}

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

function dibujarRueda() {
  const svg = document.querySelector('.rueda');
  svg.innerHTML = '';

  const radioExterno = 1.0;
  const radioInterno = 0.25;
  const radioExternoSeleccionado = 1.08;
  const anguloPorColor = 360 / cantidadColores;
  const fontSize = Math.max(0.04, 0.13 - cantidadColores * 0.01);

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const anguloInicio = index * anguloPorColor;
    const anguloFin = anguloInicio + anguloPorColor;
    const anguloMedio = anguloInicio + anguloPorColor / 2;

    const radioActual = index === colorSeleccionado
      ? radioExternoSeleccionado : radioExterno;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', crearSegmento(anguloInicio, anguloFin, radioActual, radioInterno));
    path.setAttribute('fill', `hsl(${h}, ${s}%, ${l}%)`);
    path.setAttribute('stroke', '#111');
    path.setAttribute('stroke-width', '0.02');
    path.style.cursor = 'pointer';
    path.style.transition = 'all 0.2s ease';

    path.addEventListener('click', () => {
      colorSeleccionado = colorSeleccionado === index ? -1 : index;
      dibujarRueda();
      dibujarListaColores();
      copiarColor(h, s, l);
    });

    svg.appendChild(path);

    const radioTexto = (radioActual + radioInterno) / 2;
    const posTexto = polarACartesiano(anguloMedio, radioTexto);

    const grupo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grupo.setAttribute('transform',
      `translate(${posTexto.x}, ${posTexto.y}) rotate(${anguloMedio})`);

    const textoColor = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textoColor.setAttribute('text-anchor', 'middle');
    textoColor.setAttribute('font-size', fontSize.toString());
    textoColor.setAttribute('font-weight', 'bold');
    textoColor.setAttribute('fill', '#ffffff');
    textoColor.setAttribute('dy', '0');
    textoColor.textContent = formatoCopia === 'hex'
      ? hex : `hsl(${h},${s}%,${l}%)`;

    grupo.appendChild(textoColor);
    svg.appendChild(grupo);
  });

  const circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circulo.setAttribute('cx', '0');
  circulo.setAttribute('cy', '0');
  circulo.setAttribute('r', radioInterno.toString());
  circulo.setAttribute('fill', '#111111');
  svg.appendChild(circulo);
}


// ============================================
// DIBUJAR LISTA DE COLORES
// ============================================

function dibujarListaColores() {
  const lista = document.querySelector('.lista-colores');
  lista.innerHTML = '';

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const item = document.createElement('li');
    item.classList.add('lista-colores__item');
    item.style.cursor = 'pointer';

    if (index === colorSeleccionado) {
      item.classList.add('lista-colores__item--seleccionado');
    }

    const muestra = document.createElement('div');
    muestra.classList.add('lista-colores__muestra');
    muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;

    const texto = document.createElement('span');
    texto.classList.add('lista-colores__hex');
    texto.textContent = formatoCopia === 'hex'
      ? hex : `hsl(${h}, ${s}%, ${l}%)`;

    const candado = document.createElement('button');
    candado.classList.add('lista-colores__candado');
    candado.textContent = color.bloqueado ? '🔒' : '🔓';

    candado.addEventListener('click', (e) => {
      e.stopPropagation();
      coloresActuales[index].bloqueado = !coloresActuales[index].bloqueado;
      dibujarListaColores();
    });

    item.addEventListener('click', () => {
      colorSeleccionado = colorSeleccionado === index ? -1 : index;
      dibujarRueda();
      dibujarListaColores();
      copiarColor(h, s, l);
    });

    item.appendChild(muestra);
    item.appendChild(texto);
    item.appendChild(candado);
    lista.appendChild(item);
  });
}


// ============================================
// EVENTOS DE CONTROLES ESCRITORIO
// ============================================

const selectorCantidad = document.querySelector('.barra-controles__selector');
const botonGirar = document.querySelector('.boton-girar');

selectorCantidad.addEventListener('change', () => {
  const nuevaCantidad = parseInt(selectorCantidad.value);
  const bloqueados = coloresActuales.filter(c => c.bloqueado).length;

  if (nuevaCantidad <= bloqueados) {
    alert(`Tienes ${bloqueados} colores bloqueados. Desbloquea algunos antes de reducir la paleta.`);
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

botonGirar.addEventListener('click', () => {
  const bloqueados = coloresActuales.filter(c => c.bloqueado).length;

  if (bloqueados === cantidadColores) {
    alert('Todos los colores están bloqueados. Desbloquea al menos uno para girar.');
    return;
  }

  colorSeleccionado = -1;
  generarPaleta();
  dibujarRueda();
  dibujarRuedaMovil();
  dibujarListaColores();
  dibujarListaColoresMovil();
});


// ============================================
// PALETAS GUARDADAS
// ============================================

const botonGuardar = document.querySelector('.boton-guardar');
const listaGuardadas = document.querySelector('.lista-guardadas');

function dibujarPaletasGuardadas() {
  listaGuardadas.innerHTML = '';

  if (paletasGuardadas.length === 0) {
    listaGuardadas.innerHTML = '<p class="lista-guardadas__vacia">No hay paletas guardadas</p>';
    return;
  }

  paletasGuardadas.forEach((paleta, index) => {
    const item = document.createElement('li');
    item.classList.add('lista-guardadas__item');

    const encabezado = document.createElement('div');
    encabezado.classList.add('lista-guardadas__encabezado');

    const nombre = document.createElement('span');
    nombre.classList.add('lista-guardadas__nombre');
    nombre.textContent = `Paleta (${paleta.length} colores)`;

    const acciones = document.createElement('div');
    acciones.classList.add('lista-guardadas__acciones');

    const botonCopiar = document.createElement('button');
    botonCopiar.classList.add('boton-copiar-paleta');
    botonCopiar.textContent = '📋';
    botonCopiar.addEventListener('click', () => copiarPaleta(paleta));

    const botonEliminar = document.createElement('button');
    botonEliminar.classList.add('boton-eliminar-paleta');
    botonEliminar.textContent = '🗑️';
    botonEliminar.addEventListener('click', () => {
      paletasGuardadas.splice(index, 1);
      localStorage.setItem('paletasGuardadas', JSON.stringify(paletasGuardadas));
      dibujarPaletasGuardadas();
    });

    acciones.appendChild(botonCopiar);
    acciones.appendChild(botonEliminar);
    encabezado.appendChild(nombre);
    encabezado.appendChild(acciones);

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

botonGuardar.addEventListener('click', () => {
  const copia = coloresActuales.map(color => ({
    hsl: { ...color.hsl },
    bloqueado: false
  }));
  paletasGuardadas.push(copia);
  localStorage.setItem('paletasGuardadas', JSON.stringify(paletasGuardadas));
  dibujarPaletasGuardadas();
  dibujarModalGuardadas();
});


// ============================================
// INTERRUPTOR HEX / HSL
// ============================================

const botonHex = document.querySelectorAll('.alternador-copia__boton')[0];
const botonHsl = document.querySelectorAll('.alternador-copia__boton')[1];
const botonHexMovil = document.querySelector('.boton-hex-movil');
const botonHslMovil = document.querySelector('.boton-hsl-movil');

function cambiarFormato(formato) {
  formatoCopia = formato;

  document.body.classList.remove('tema-hex', 'tema-hsl');
  document.body.classList.add(formato === 'hex' ? 'tema-hex' : 'tema-hsl');

  // Escritorio
  botonHex.classList.remove('alternador-copia__boton--activo-hex', 'alternador-copia__boton--activo-hsl');
  botonHsl.classList.remove('alternador-copia__boton--activo-hex', 'alternador-copia__boton--activo-hsl');

  // Móvil
  botonHexMovil?.classList.remove('alternador-copia__boton--activo-hex', 'alternador-copia__boton--activo-hsl');
  botonHslMovil?.classList.remove('alternador-copia__boton--activo-hex', 'alternador-copia__boton--activo-hsl');

  if (formato === 'hex') {
    botonHex.classList.add('alternador-copia__boton--activo-hex');
    botonHexMovil?.classList.add('alternador-copia__boton--activo-hex');
  } else {
    botonHsl.classList.add('alternador-copia__boton--activo-hsl');
    botonHslMovil?.classList.add('alternador-copia__boton--activo-hsl');
  }

  dibujarListaColores();
  dibujarRueda();
  dibujarRuedaMovil();
  dibujarListaColoresMovil();
}

botonHex.addEventListener('click', () => cambiarFormato('hex'));
botonHsl.addEventListener('click', () => cambiarFormato('hsl'));
if (botonHexMovil) botonHexMovil.addEventListener('click', () => cambiarFormato('hex'));
if (botonHslMovil) botonHslMovil.addEventListener('click', () => cambiarFormato('hsl'));


// ============================================
// NOTIFICACIÓN FLOTANTE
// ============================================

function mostrarNotificacion(h, s, l, texto) {
  const anterior = document.querySelector('.notificacion');
  if (anterior) anterior.remove();

  const notificacion = document.createElement('div');
  notificacion.classList.add('notificacion');

  const circulo = document.createElement('div');
  circulo.classList.add('notificacion__circulo');
  circulo.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;

  const codigo = document.createElement('span');
  codigo.classList.add('notificacion__codigo');
  codigo.textContent = texto;

  notificacion.appendChild(circulo);
  notificacion.appendChild(codigo);

  if (formatoCopia === 'hex') {
    notificacion.classList.add('notificacion--hex');
  } else {
    notificacion.classList.add('notificacion--hsl');
  }

  document.body.appendChild(notificacion);
  setTimeout(() => notificacion.classList.add('notificacion--visible'), 10);
  setTimeout(() => {
    notificacion.classList.remove('notificacion--visible');
    setTimeout(() => notificacion.remove(), 400);
  }, 2500);
}

function copiarColor(h, s, l) {
  const texto = formatoCopia === 'hex'
    ? hslAHex(h, s, l)
    : `hsl(${h}, ${s}%, ${l}%)`;

  const area = document.createElement('textarea');
  area.value = texto;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  document.body.removeChild(area);

  mostrarNotificacion(h, s, l, texto);
}


// ============================================
// RUEDA Y LISTA MÓVIL
// ============================================

function dibujarRuedaMovil() {
  const svg = document.querySelector('.rueda--movil');
  if (!svg) return;

  svg.innerHTML = '';

  const radioExterno = 1.0;
  const radioInterno = 0.25;
  const radioExternoSeleccionado = 1.08;
  const anguloPorColor = 360 / cantidadColores;
  const fontSize = Math.max(0.04, 0.13 - cantidadColores * 0.01);

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const anguloInicio = index * anguloPorColor;
    const anguloFin = anguloInicio + anguloPorColor;
    const anguloMedio = anguloInicio + anguloPorColor / 2;

    const radioActual = index === colorSeleccionado
      ? radioExternoSeleccionado : radioExterno;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', crearSegmento(anguloInicio, anguloFin, radioActual, radioInterno));
    path.setAttribute('fill', `hsl(${h}, ${s}%, ${l}%)`);
    path.setAttribute('stroke', '#111');
    path.setAttribute('stroke-width', '0.02');
    path.style.cursor = 'pointer';

    path.addEventListener('click', () => {
      colorSeleccionado = colorSeleccionado === index ? -1 : index;
      dibujarRuedaMovil();
      dibujarListaColoresMovil();
      copiarColor(h, s, l);
    });

    svg.appendChild(path);

    const radioTexto = (radioActual + radioInterno) / 2;
    const posTexto = polarACartesiano(anguloMedio, radioTexto);

    const grupo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grupo.setAttribute('transform',
      `translate(${posTexto.x}, ${posTexto.y}) rotate(${anguloMedio})`);

    const textoColor = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textoColor.setAttribute('text-anchor', 'middle');
    textoColor.setAttribute('font-size', fontSize.toString());
    textoColor.setAttribute('font-weight', 'bold');
    textoColor.setAttribute('fill', '#ffffff');
    textoColor.setAttribute('dy', '0');
    textoColor.textContent = formatoCopia === 'hex'
      ? hex : `hsl(${h},${s}%,${l}%)`;

    grupo.appendChild(textoColor);
    svg.appendChild(grupo);
  });

  const circulo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circulo.setAttribute('cx', '0');
  circulo.setAttribute('cy', '0');
  circulo.setAttribute('r', radioInterno.toString());
  circulo.setAttribute('fill', '#111111');
  svg.appendChild(circulo);
}

function dibujarListaColoresMovil() {
  const lista = document.querySelector('.lista-colores--movil');
  if (!lista) return;

  lista.innerHTML = '';

  coloresActuales.forEach((color, index) => {
    const { h, s, l } = color.hsl;
    const hex = hslAHex(h, s, l);

    const item = document.createElement('li');
    item.classList.add('lista-colores__item');
    item.style.cursor = 'pointer';

    if (index === colorSeleccionado) {
      item.classList.add('lista-colores__item--seleccionado');
    }

    const muestra = document.createElement('div');
    muestra.classList.add('lista-colores__muestra');
    muestra.style.backgroundColor = `hsl(${h}, ${s}%, ${l}%)`;

    const texto = document.createElement('span');
    texto.classList.add('lista-colores__hex');
    texto.textContent = formatoCopia === 'hex'
      ? hex : `hsl(${h}, ${s}%, ${l}%)`;

    const candado = document.createElement('button');
    candado.classList.add('lista-colores__candado');
    candado.textContent = color.bloqueado ? '🔒' : '🔓';

    candado.addEventListener('click', (e) => {
      e.stopPropagation();
      coloresActuales[index].bloqueado = !coloresActuales[index].bloqueado;
      dibujarListaColores();
      dibujarListaColoresMovil();
    });

    item.addEventListener('click', () => {
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
// CONTROLES MÓVIL
// ============================================

const selectorMovil = document.querySelector('.barra-controles__selector-movil');
if (selectorMovil) {
  selectorMovil.addEventListener('change', () => {
    const nuevaCantidad = parseInt(selectorMovil.value);
    const bloqueados = coloresActuales.filter(c => c.bloqueado).length;

    if (nuevaCantidad <= bloqueados) {
      alert(`Tienes ${bloqueados} colores bloqueados. Desbloquea algunos antes de reducir.`);
      selectorMovil.value = cantidadColores;
      return;
    }

    cantidadColores = nuevaCantidad;
    selectorCantidad.value = cantidadColores;
    generarPaleta();
    dibujarRueda();
    dibujarRuedaMovil();
    dibujarListaColores();
    dibujarListaColoresMovil();
  });
}

document.querySelector('.boton-girar--movil')?.addEventListener('click', () => {
  const bloqueados = coloresActuales.filter(c => c.bloqueado).length;
  if (bloqueados === cantidadColores) {
    alert('Todos los colores están bloqueados.');
    return;
  }
  colorSeleccionado = -1;
  generarPaleta();
  dibujarRueda();
  dibujarRuedaMovil();
  dibujarListaColores();
  dibujarListaColoresMovil();
});

document.querySelector('.boton-guardar--movil')?.addEventListener('click', () => {
  const copia = coloresActuales.map(color => ({
    hsl: { ...color.hsl },
    bloqueado: false
  }));
  paletasGuardadas.push(copia);
  localStorage.setItem('paletasGuardadas', JSON.stringify(paletasGuardadas));
  dibujarPaletasGuardadas();
  dibujarModalGuardadas();
});


// ============================================
// MODAL PALETAS GUARDADAS MÓVIL
// ============================================

const modal = document.querySelector('.modal-guardadas');
const modalLista = document.querySelector('.modal-guardadas__lista');
const modalCerrar = document.querySelector('.modal-guardadas__cerrar');

function dibujarModalGuardadas() {
  if (!modalLista) return;
  modalLista.innerHTML = '';

  if (paletasGuardadas.length === 0) {
    modalLista.innerHTML = '<p class="modal-guardadas__vacia">No hay paletas guardadas</p>';
    return;
  }

  paletasGuardadas.forEach((paleta, index) => {
    const item = document.createElement('li');
    item.classList.add('lista-guardadas__item');

    const encabezado = document.createElement('div');
    encabezado.classList.add('lista-guardadas__encabezado');

    const nombre = document.createElement('span');
    nombre.classList.add('lista-guardadas__nombre');
    nombre.textContent = `Paleta (${paleta.length} colores)`;

    const acciones = document.createElement('div');
    acciones.classList.add('lista-guardadas__acciones');

    const botonCopiar = document.createElement('button');
    botonCopiar.classList.add('boton-copiar-paleta');
    botonCopiar.textContent = '📋';
    botonCopiar.addEventListener('click', () => copiarPaleta(paleta));

    const botonEliminar = document.createElement('button');
    botonEliminar.classList.add('boton-eliminar-paleta');
    botonEliminar.textContent = '🗑️';
    botonEliminar.addEventListener('click', () => {
      paletasGuardadas.splice(index, 1);
      localStorage.setItem('paletasGuardadas', JSON.stringify(paletasGuardadas));
      dibujarPaletasGuardadas();
      dibujarModalGuardadas();
    });

    acciones.appendChild(botonCopiar);
    acciones.appendChild(botonEliminar);
    encabezado.appendChild(nombre);
    encabezado.appendChild(acciones);

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
    modalLista.appendChild(item);
  });
}

document.querySelector('.boton-ver-guardadas')?.addEventListener('click', () => {
  dibujarModalGuardadas();
  modal?.classList.add('modal-guardadas--visible');
});

modalCerrar?.addEventListener('click', () => {
  modal?.classList.remove('modal-guardadas--visible');
});

modal?.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('modal-guardadas--visible');
  }
});


// ============================================
// INICIO
// ============================================

generarPaleta();
dibujarRueda();
dibujarRuedaMovil();
dibujarListaColores();
dibujarListaColoresMovil();
dibujarPaletasGuardadas();
cambiarFormato('hex');
console.log('Colores generados:', coloresActuales);