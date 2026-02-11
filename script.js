// ===============================
// BANCO DE DADOS LOCAL
// ===============================

const DB = {
  terrenos: JSON.parse(localStorage.getItem("terrenos")) || [],
  alvaras: JSON.parse(localStorage.getItem("alvaras")) || [],
  ocorrencias: JSON.parse(localStorage.getItem("ocorrencias")) || []
};

function salvarDB() {
  localStorage.setItem("terrenos", JSON.stringify(DB.terrenos));
  localStorage.setItem("alvaras", JSON.stringify(DB.alvaras));
  localStorage.setItem("ocorrencias", JSON.stringify(DB.ocorrencias));
}

// ===============================
// CONTROLE DE SEÇÕES
// ===============================

function mostrarSecao(id) {
  document.querySelectorAll('.secao').forEach(secao => {
    secao.classList.remove('ativa');
  });

  document.getElementById(id).classList.add('ativa');

  if (id === 'mapa') {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }

  if (id === 'dashboard') {
    atualizarDashboard();
  }
}

// ===============================
// MAPA
// ===============================

const map = L.map('map').setView([-23.660, -46.768], 12);

const camadaPadrao = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

const camadaSatelite = L.tileLayer(
  'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
);

const baseMaps = {
  "Padrão": camadaPadrao,
  "Satélite": camadaSatelite
};

L.control.layers(baseMaps).addTo(map);

const camadaEdicao = new L.FeatureGroup();
map.addLayer(camadaEdicao);

const drawControl = new L.Control.Draw({
  edit: { featureGroup: camadaEdicao },
  draw: {
    polygon: true,
    rectangle: true,
    marker: true,
    circle: false,
    polyline: false
  }
});

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (event) {
  camadaEdicao.addLayer(event.layer);
});

// ===============================
// DASHBOARD (BÁSICO POR ENQUANTO)
// ===============================

function atualizarDashboard() {
  const totalTerrenos = DB.terrenos.length;
  const totalAlvaras = DB.alvaras.length;
  const totalOcorrencias = DB.ocorrencias.length;

  document.getElementById("dashTerrenos").innerText = totalTerrenos;
  document.getElementById("dashAlvaras").innerText = totalAlvaras;
  document.getElementById("dashOcorrencias").innerText = totalOcorrencias;
}

