// ===============================
// BANCO LOCAL
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
// TROCAR SEÇÃO
// ===============================

function mostrarSecao(id) {
  document.querySelectorAll('.secao').forEach(secao => {
    secao.classList.remove('ativa');
  });

  document.getElementById(id).classList.add('ativa');

  if (id === 'mapa') {
    setTimeout(() => map.invalidateSize(), 200);
  }

  if (id === 'dashboard') {
    atualizarDashboard();
  }
}

// ===============================
// CADASTRO
// ===============================

function salvarRegistro() {

  const tipo = document.getElementById("tipoRegistro").value;
  const descricao = document.getElementById("descricao").value;
  const data = document.getElementById("dataRegistro").value;

  if (!descricao || !data) {
    alert("Preencha todos os campos");
    return;
  }

  const novo = {
    descricao,
    data,
    criadoEm: new Date()
  };

  DB[tipo + "s"].push(novo);

  salvarDB();
  atualizarDashboard();

  alert("Salvo com sucesso!");
  document.getElementById("descricao").value = "";
}

// ===============================
// DASHBOARD
// ===============================

let grafico;

function atualizarDashboard() {

  document.getElementById("dashTerrenos").innerText = DB.terrenos.length;
  document.getElementById("dashAlvaras").innerText = DB.alvaras.length;
  document.getElementById("dashOcorrencias").innerText = DB.ocorrencias.length;

  atualizarGrafico();
}

function atualizarGrafico() {

  const meses = Array(12).fill(0);

  const todos = [
    ...DB.terrenos,
    ...DB.alvaras,
    ...DB.ocorrencias
  ];

  todos.forEach(item => {
    const mes = new Date(item.data).getMonth();
    meses[mes]++;
  });

  const ctx = document.getElementById('graficoMensal');

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [
        'Jan','Fev','Mar','Abr','Mai','Jun',
        'Jul','Ago','Set','Out','Nov','Dez'
      ],
      datasets: [{
        label: 'Registros por mês',
        data: meses
      }]
    }
  });
}

// ===============================
// MAPA
// ===============================

const map = L.map('map').setView([-23.660, -46.768], 12);

const camadaPadrao = L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map);

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

// Inicializa dashboard ao abrir
atualizarDashboard();

