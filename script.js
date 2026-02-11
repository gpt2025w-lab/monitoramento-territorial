<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Cadastro de Terrenos</title>

<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet-draw/dist/leaflet.draw.css"/>

<style>
#map { height: 400px; margin-top:10px; }
.lista-terrenos { margin-top:20px; }
button { margin-top:5px; }
</style>
</head>
<body>

<h2>Cadastro de Terreno</h2>

<input type="text" id="endereco" placeholder="Digite país, cidade, rua ou bairro" />
<button onclick="buscarEndereco()">Buscar</button>

<div id="map"></div>

<h3>Relatório</h3>
<div id="relatorio"></div>

<h3>Terrenos Salvos</h3>
<div id="lista" class="lista-terrenos"></div>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"></script>

<script>

// MAPA
var map = L.map('map').setView([-23.5505, -46.6333], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// CONTROLE DE DESENHO
var drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: true,
        marker: true,
        rectangle: true,
        circle: false,
        polyline: false
    }
});
map.addControl(drawControl);

// QUANDO DESENHAR
map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    drawnItems.addLayer(layer);

    salvarTerreno(layer);
});

// BUSCA AUTOMÁTICA AO APERTAR ENTER
document.getElementById("endereco").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        buscarEndereco();
    }
});

// FUNÇÃO DE BUSCA
function buscarEndereco() {

    var endereco = document.getElementById("endereco").value;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${endereco}`)
    .then(res => res.json())
    .then(data => {

        if (data.length > 0) {
            var lat = data[0].lat;
            var lon = data[0].lon;

            map.flyTo([lat, lon], 17);

            L.marker([lat, lon]).addTo(map);
        } else {
            alert("Local não encontrado");
        }
    });
}

// SALVAR TERRENO
function salvarTerreno(layer) {

    var terrenos = JSON.parse(localStorage.getItem("terrenos")) || [];

    var geo = layer.toGeoJSON();

    terrenos.push(geo);

    localStorage.setItem("terrenos", JSON.stringify(terrenos));

    atualizarLista();
    atualizarRelatorio();
}

// ATUALIZAR LISTA VISUAL
function atualizarLista() {

    var listaDiv = document.getElementById("lista");
    listaDiv.innerHTML = "";

    var terrenos = JSON.parse(localStorage.getItem("terrenos")) || [];

    terrenos.forEach((t, index) => {

        var div = document.createElement("div");

        div.innerHTML = `
        Terreno ${index+1}
        <button onclick="excluirTerreno(${index})">Excluir</button>
        `;

        listaDiv.appendChild(div);
    });
}

// EXCLUIR
function excluirTerreno(index) {

    var terrenos = JSON.parse(localStorage.getItem("terrenos")) || [];

    terrenos.splice(index, 1);

    localStorage.setItem("terrenos", JSON.stringify(terrenos));

    atualizarLista();
    atualizarRelatorio();

    location.reload();
}

// RELATÓRIO
function atualizarRelatorio() {

    var relatorio = document.getElementById("relatorio");
    relatorio.innerHTML = "";

    var terrenos = JSON.parse(localStorage.getItem("terrenos")) || [];

    terrenos.forEach((t, i) => {

        relatorio.innerHTML += `
        <p><b>Terreno ${i+1}</b><br>
        Tipo: ${t.geometry.type}<br>
        Coordenadas: ${JSON.stringify(t.geometry.coordinates)}</p>
        `;
    });
}

// CARREGAR AO INICIAR
window.onload = function() {

    atualizarLista();
    atualizarRelatorio();

    var terrenos = JSON.parse(localStorage.getItem("terrenos")) || [];

    terrenos.forEach(t => {
        L.geoJSON(t).addTo(drawnItems);
    });
};

</script>
</body>
</html>

