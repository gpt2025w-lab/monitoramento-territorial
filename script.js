// ===============================
// INICIALIZAÇÃO DO MAPA
// ===============================

// Coordenadas iniciais (Represa Guarapiranga – ajuste depois se quiser)
const map = L.map('map').setView([-23.660, -46.768], 12);

// ===============================
// CAMADA BASE (MAPA PADRÃO)
// ===============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// ===============================
// CAMADA EDITÁVEL
// (áreas verdes, desmatadas, polígonos etc.)
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
// EVENTO: QUANDO DESENHAR NO MAPA
// ===============================
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  camadaEdicao.addLayer(layer);
});

// ===============================
// AJUSTE AUTOMÁTICO AO REDIMENSIONAR
// ===============================
window.addEventListener('resize', () => {
  map.invalidateSize();
});
