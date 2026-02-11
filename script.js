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

// Camada padrão
const camadaPadrao = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  { attribution: '© OpenStreetMap' }
).addTo(map);

// Camada satélite (ESRI real)
const camadaSatelite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Tiles © Esri' }
);

const baseMaps = {
  "Padrão": camadaPadrao,
  "Satélite": camadaSatelite
};

L.control.layers(baseMaps).addTo(map);

// Grupo editável
const camadaEdicao = new L.FeatureGroup();
map.addLayer(camadaEdicao);

// Controle desenho
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: camadaEdicao,
    remove: true
  },
  draw: {
    polygon: true,
    rectangle: true,
    marker: true,
    circle: false,
    polyline: false,
    circlemarker: false
  }
});

map.addControl(drawControl);

// ===============================
// SALVAR DESENHOS NO DB
// ===============================

map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  camadaEdicao.addLayer(layer);

  const geojson = layer.toGeoJSON();
  DB.terrenos.push(geojson);
  salvarDB();
});

// ===============================
// RESTAURAR DESENHOS SALVOS
// ===============================

function restaurarDesenhos() {
  DB.terrenos.forEach(item => {
    const layer = L.geoJSON(item);
    layer.eachLayer(l => {
      camadaEdicao.addLayer(l);
    });
  });
}

restaurarDesenhos();

// ===============================
// DASHBOARD + GRÁFICO
// ===============================

let grafico;

function gerarGrafico() {

  const ctx = document.getElementById('graficoOcorrencias');
  if (!ctx) return;

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Terrenos', 'Alvarás', 'Ocorrências'],
      datasets: [{
        label: 'Registros',
        data: [
          DB.terrenos.length,
          DB.alvaras.length,
          DB.ocorrencias.length
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function atualizarDashboard() {

  const t = document.getElementById("dashTerrenos");
  const a = document.getElementById("dashAlvaras");
  const o = document.getElementById("dashOcorrencias");

  if (t) t.innerText = DB.terrenos.length;
  if (a) a.innerText = DB.alvaras.length;
  if (o) o.innerText = DB.ocorrencias.length;

  gerarGrafico();
}

// ===============================
// AJUSTE AO REDIMENSIONAR
// ===============================

window.addEventListener('resize', () => {
  map.invalidateSize();
});
