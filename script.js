const { jsPDF } = window.jspdf;

let terrenos = JSON.parse(localStorage.getItem("terrenos")) || [];
let geometriaAtual = null;

/* MENU */
function mostrarSecao(id){
document.querySelectorAll(".secao").forEach(s=>s.classList.remove("ativa"));
document.getElementById(id).classList.add("ativa");
if(id==="mapa"){ setTimeout(()=>map.invalidateSize(),200);}
atualizarDashboard();
}

/* PROTOCOLO */
function gerarProtocolo(){
let numero = terrenos.length+1;
let protocolo = "PMIS-"+new Date().getFullYear()+"-"+String(numero).padStart(4,"0");
document.getElementById("protocolo").value=protocolo;
}

function definirData(){
document.getElementById("dataCadastro").value=new Date().toISOString().split("T")[0];
}

/* SALVAR */
document.getElementById("formTerreno").addEventListener("submit",function(e){
e.preventDefault();

const terreno={
protocolo:protocolo.value,
data:dataCadastro.value,
responsavel:responsavel.value,
cpfCnpj:cpfCnpj.value,
endereco:endereco.value,
tipo:tipo.value,
zoneamento:zoneamento.value,
situacao:situacao.value,
fiscal:fiscal.value,
observacao:observacao.value,
geo:geometriaAtual
};

terrenos.push(terreno);
localStorage.setItem("terrenos",JSON.stringify(terrenos));

if(geometriaAtual){
L.geoJSON(geometriaAtual,{
style:{color: situacao.value==="Irregular"?"red":"green"}
}).addTo(map).bindPopup("Protocolo: "+protocolo.value);
}

alert("Salvo com sucesso");
this.reset();
gerarProtocolo();
definirData();
atualizarDashboard();
});

/* DASHBOARD */
let grafico;
function atualizarDashboard(){
document.getElementById("dashTotal").innerText=terrenos.length;
document.getElementById("dashRegular").innerText=terrenos.filter(t=>t.situacao==="Regular").length;
document.getElementById("dashIrregular").innerText=terrenos.filter(t=>t.situacao==="Irregular").length;

const meses=Array(12).fill(0);
terrenos.forEach(t=>{meses[new Date(t.data).getMonth()]++;});

if(grafico){grafico.destroy();}
grafico=new Chart(document.getElementById("graficoMensal"),{
type:"bar",
data:{
labels:["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
datasets:[{label:"Registros por mês",data:meses}]
}
});
}

/* MAPA */
const map=L.map("map").setView([-23.660,-46.768],12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

const drawnItems=new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl=new L.Control.Draw({
edit:{featureGroup:drawnItems},
draw:{polygon:true,rectangle:true,marker:true,polyline:false,circle:false}
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED,function(e){
drawnItems.addLayer(e.layer);
geometriaAtual=e.layer.toGeoJSON();
});

/* PDF */
function gerarPDF(){
const doc=new jsPDF();
doc.text("PREFEITURA MUNICIPAL",20,20);
doc.text("Sistema Oficial de Cadastro",20,30);
doc.text("Protocolo: "+protocolo.value,20,50);
doc.text("Responsável: "+responsavel.value,20,60);
doc.text("CPF/CNPJ: "+cpfCnpj.value,20,70);
doc.text("Endereço: "+endereco.value,20,80);
doc.save("Relatorio_"+protocolo.value+".pdf");
}

/* KML */
function exportarKML(){
let kml='<?xml version="1.0"?><kml><Document>';
terrenos.forEach(t=>{
if(t.geo){
let coords=t.geo.geometry.coordinates[0].map(c=>c.join(",")).join(" ");
kml+=`<Placemark><name>${t.protocolo}</name><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
}
});
kml+='</Document></kml>';
let blob=new Blob([kml],{type:"application/vnd.google-earth.kml+xml"});
let a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download="exportacao.kml";
a.click();
}

/* DXF básico */
function exportarDXF(){
let dxf="0\nSECTION\n2\nENTITIES\n";
terrenos.forEach(t=>{
if(t.geo){
t.geo.geometry.coordinates[0].forEach(c=>{
dxf+=`0\nPOINT\n8\n0\n10\n${c[0]}\n20\n${c[1]}\n30\n0\n`;
});
}
});
dxf+="0\nENDSEC\n0\nEOF";
let blob=new Blob([dxf],{type:"application/dxf"});
let a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download="exportacao.dxf";
a.click();
}

gerarProtocolo();
definirData();
atualizarDashboard();


