// ===============================
// CONTROLE DE SEÇÕES
// ===============================
function mostrarSecao(id) {
  document.querySelectorAll('.secao').forEach(secao => {
    secao.classList.remove('ativa');
  });

  document.getElementById(id).classList.add('ativa');

  if (id === 'mapa' && window.map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }
}

// ===============================
// INICIALIZAÇÃO DO MAPA
// ===============================

// Coordenadas iniciais (Represa Guarapiranga)
const map = L.map('map').setView([-23.660, -46.768], 12);

// ===============================
// CAMADA BASE
// ===============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// ===============================
// CAMADA EDITÁVEL
// ===============================
const camadaEdicao = new L.FeatureGroup();
map.addLayer(camadaEdicao);

// ===============================
// CONTROLE DE DESENHO
// ===============================
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: camadaEdicao,
    remove: true
  },
  draw: {
    polygon: true,
    rectangle: true,
    polyline: false,
    circle: false,
    marker: true,
    circlemarker: false
  }
});

map.addControl(drawControl);

// ===============================
// EVENTO DE DESENHO
// ===============================
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  camadaEdicao.addLayer(layer);
});

// ===============================
// AJUSTE AUTOMÁTICO DE TELA
// ===============================
window.addEventListener('resize', () => {
  map.invalidateSize();
});

