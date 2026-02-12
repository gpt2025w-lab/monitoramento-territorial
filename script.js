<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Monitoramento Territorial Preventivo</title>

<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet-draw/dist/leaflet.draw.css"/>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet-draw/dist/leaflet.draw.js"></script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="https://unpkg.com/leaflet-image/leaflet-image.js"></script>

<style>
body{font-family:Arial;margin:0;background:#f4f6f8}
header{background:#1e293b;color:white;padding:10px 20px;display:flex;justify-content:space-between}
nav{background:#334155;padding:10px}
nav button{margin-right:10px}
.secao{display:none;padding:20px}
.secao.ativa{display:block}
.cards{display:flex;gap:10px}
.card{background:white;padding:20px;border-radius:8px}
#map{height:400px;margin-top:10px}
.hidden{display:none}
.login-container{height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center}
input,textarea,select,button{display:block;margin:8px 0;padding:8px;width:300px}
.lista-item{background:white;margin:5px 0;padding:10px;border-radius:6px;display:flex;justify-content:space-between}
</style>
</head>

<body>

<div id="loginTela" class="login-container">
<h2>Acesso Técnico</h2>
<input id="loginUsuario" placeholder="Usuário">
<input id="loginSenha" type="password" placeholder="Senha">
<button onclick="login()">Entrar</button>
</div>

<div id="sistema" class="hidden">
<header>
<h1>Monitoramento Territorial Preventivo</h1>
<button onclick="logout()">Sair</button>
</header>

<nav>
<button onclick="mostrarSecao('dashboard')">Dashboard</button>
<button onclick="mostrarSecao('ponto')">Ponto de Atenção</button>
</nav>

<section id="dashboard" class="secao ativa">
<h2>Painel Estratégico</h2>
<div class="cards">
<div class="card">Terrenos <h3 id="totalPontos">0</h3></div>
<div class="card">Em análise <h3 id="emAnalise">0</h3></div>
<div class="card">Monitoramento <h3 id="monitoramento">0</h3></div>
<div class="card">Arquivados <h3 id="arquivados">0</h3></div>
</div>
</section>

<section id="ponto" class="secao">
<h2>Cadastro de Ponto</h2>
<form id="formPonto">
<input id="codigoRef" readonly>
<input id="dataIdentificacao" type="date" readonly>
<input id="endereco" placeholder="Endereço" required>
<input id="bairro" placeholder="Bairro" required>

<select id="status">
<option>Em Análise</option>
<option>Monitoramento Ativo</option>
<option>Arquivado</option>
</select>

<textarea id="descricao" placeholder="Descrição"></textarea>

<div id="map"></div>

<h3>Pontos cadastrados</h3>
<div id="listaPontos"></div>

<button type="submit">Salvar</button>
</form>
</section>
</div>

<script>
/* LOGIN */
function login(){
if(loginUsuario.value && loginSenha.value){
loginTela.classList.add('hidden')
sistema.classList.remove('hidden')
inicializarMapa()
carregarPontos()
}
}
function logout(){location.reload()}

function mostrarSecao(id){
document.querySelectorAll('.secao').forEach(s=>s.classList.remove('ativa'))
document.getElementById(id).classList.add('ativa')
}

/* MAPA */
let map, drawnItems, marcador
function inicializarMapa(){
map=L.map('map').setView([-23.7,-46.8],13)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

drawnItems=new L.FeatureGroup()
map.addLayer(drawnItems)

const drawControl=new L.Control.Draw({edit:{featureGroup:drawnItems}})
map.addControl(drawControl)

map.on(L.Draw.Event.CREATED,e=>{
drawnItems.clearLayers()
drawnItems.addLayer(e.layer)
})
}

/* AUTOCOMPLETE ENDEREÇO */
endereco.addEventListener('change',async()=>{
const url=`https://nominatim.openstreetmap.org/search?format=json&q=${endereco.value}`
const r=await fetch(url)
const d=await r.json()
if(d.length){
const lat=parseFloat(d[0].lat)
const lon=parseFloat(d[0].lon)
map.setView([lat,lon],18)
if(marcador) map.removeLayer(marcador)
marcador=L.marker([lat,lon]).addTo(map)
}
})

/* INDEXEDDB */
let db
const req=indexedDB.open('monitoramentoDB',1)
req.onupgradeneeded=e=>{
db=e.target.result
if(!db.objectStoreNames.contains('pontos')) db.createObjectStore('pontos',{keyPath:'id'})
}
req.onsuccess=e=>db=e.target.result

function salvarDB(p){
const tx=db.transaction('pontos','readwrite')
tx.objectStore('pontos').put(p)
}

function listarDB(cb){
const tx=db.transaction('pontos','readonly')
const req=tx.objectStore('pontos').getAll()
req.onsuccess=()=>cb(req.result)
}

function excluirDB(id){
const tx=db.transaction('pontos','readwrite')
tx.objectStore('pontos').delete(id)
}

/* FORM */
dataIdentificacao.value=new Date().toISOString().split('T')[0]

formPonto.addEventListener('submit',e=>{
e.preventDefault()

if(!marcador){alert('Selecione localização');return}

const ponto={
id:Date.now(),
protocolo:'PT-'+Date.now(),
data:dataIdentificacao.value,
codigo:codigoRef.value,
endereco:endereco.value,
bairro:bairro.value,
status:status.value,
descricao:descricao.value,
lat:marcador.getLatLng().lat,
lng:marcador.getLatLng().lng
}

salvarDB(ponto)
carregarPontos()
gerarPDF(ponto)
formPonto.reset()
})

/* CARREGAR TODOS */
function carregarPontos(){
listarDB(pontos=>{
listaPontos.innerHTML=''
drawnItems.clearLayers()
let ea=0,ma=0,ar=0

pontos.forEach(p=>{

L.marker([p.lat,p.lng]).addTo(drawnItems)

const div=document.createElement('div')
div.className='lista-item'
div.innerHTML=`${p.endereco} - ${p.status} <button onclick="remover(${p.id})">Excluir</button>`
listaPontos.appendChild(div)

if(p.status==='Em Análise')ea++
if(p.status==='Monitoramento Ativo')ma++
if(p.status==='Arquivado')ar++
})

totalPontos.textContent=pontos.length
emAnalise.textContent=ea
monitoramento.textContent=ma
arquivados.textContent=ar
})
}

function remover(id){
excluirDB(id)
carregarPontos()
}

/* PDF PROFISSIONAL */
function gerarPDF(ponto){
const { jsPDF } = window.jspdf
const doc=new jsPDF()

doc.setFontSize(16)
doc.text('RELATÓRIO TÉCNICO DE MONITORAMENTO TERRITORIAL',14,20)

doc.setFontSize(10)
doc.text('Protocolo: '+ponto.protocolo,14,30)
doc.text('Data: '+new Date().toLocaleString(),14,36)

const dados=[
['Código',ponto.codigo],
['Endereço',ponto.endereco],
['Bairro',ponto.bairro],
['Status',ponto.status],
['Latitude',ponto.lat],
['Longitude',ponto.lng],
['Descrição',ponto.descricao]
]

doc.autoTable({startY:45,head:[['Campo','Informação']],body:dados})

/* QR CODE */
const qrDiv=document.createElement('div')
new QRCode(qrDiv,{text:`https://maps.google.com/?q=${ponto.lat},${ponto.lng}`,width:80,height:80})
const qrImg=qrDiv.querySelector('img')
if(qrImg) doc.addImage(qrImg.src,'PNG',150,30,40,40)

/* MINI MAPA */
const tempMap=L.map(document.createElement('div')).setView([ponto.lat,ponto.lng],17)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(tempMap)
L.marker([ponto.lat,ponto.lng]).addTo(tempMap)

setTimeout(()=>{
leafletImage(tempMap,(err,canvas)=>{
const img=canvas.toDataURL('image/png')
doc.addImage(img,'PNG',14,doc.lastAutoTable.finalY+10,120,80)
doc.save('Relatorio_'+ponto.protocolo+'.pdf')
})
},800)
}

</script>
</body>
</html>



