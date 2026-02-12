const dbName="monitoramentoDB";
let db,usuarioAtual=null,mapa,geometriaAtual;

const request=indexedDB.open(dbName,1);

request.onupgradeneeded=e=>{
db=e.target.result;
if(!db.objectStoreNames.contains("users"))
db.createObjectStore("users",{keyPath:"usuario"});
if(!db.objectStoreNames.contains("pontos"))
db.createObjectStore("pontos",{keyPath:"id",autoIncrement:true});
};

request.onsuccess=e=>{
db=e.target.result;
criarAdminPadrao();
};

function criarAdminPadrao(){
const tx=db.transaction("users","readwrite");
const store=tx.objectStore("users");
store.get("admin").onsuccess=e=>{
if(!e.target.result)
store.add({usuario:"admin",senha:"123456",perfil:"ADM",status:"APROVADO"});
};
}

function login(){
const user=document.getElementById("loginUsuario").value;
const pass=document.getElementById("loginSenha").value;

```
const tx=db.transaction("users","readonly");
tx.objectStore("users").get(user).onsuccess=e=>{
    const u=e.target.result;
    if(u&&u.senha===pass){
        usuarioAtual=u;
        iniciarSistema();
    }else alert("Acesso negado");
};
```

}

function iniciarSistema(){
document.getElementById("loginTela").classList.add("hidden");
document.getElementById("sistema").classList.remove("hidden");
gerarCodigo();
definirData();
atualizarDashboard();
}

function logout(){location.reload();}

function gerarCodigo(){
document.getElementById("codigoRef").value=
"PT-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*10000);
}

function definirData(){
document.getElementById("dataIdentificacao").value=
new Date().toISOString().split("T")[0];
}

function iniciarMapa(){
if(mapa) mapa.remove();

```
mapa=L.map("map").setView([-23.6,-46.7],12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
    .addTo(mapa);

const drawn=new L.FeatureGroup();
mapa.addLayer(drawn);

const drawControl=new L.Control.Draw({
    edit:{featureGroup:drawn},
    draw:{polygon:true,rectangle:true,marker:true}
});

mapa.addControl(drawControl);

mapa.on(L.Draw.Event.CREATED,e=>{
    drawn.clearLayers();
    drawn.addLayer(e.layer);
    geometriaAtual=e.layer.toGeoJSON();
});
```

}

document.getElementById("formPonto").addEventListener("submit",e=>{
e.preventDefault();

```
if(!geometriaAtual){
    alert("Desenhe no mapa");
    return;
}

const ponto={
    codigo:codigoRef.value,
    data:dataIdentificacao.value,
    endereco:endereco.value,
    bairro:bairro.value,
    status:status.value,
    descricao:descricao.value,
    geo:geometriaAtual
};

const tx=db.transaction("pontos","readwrite");
tx.objectStore("pontos").add(ponto);

alert("Salvo");
atualizarDashboard();
```

});

function atualizarDashboard(){
const tx=db.transaction("pontos","readonly");
tx.objectStore("pontos").getAll().onsuccess=e=>{
const d=e.target.result;
totalPontos.innerText=d.length;
emAnalise.innerText=d.filter(p=>p.status==="Em Análise").length;
monitoramento.innerText=d.filter(p=>p.status==="Monitoramento Ativo").length;
arquivados.innerText=d.filter(p=>p.status==="Arquivado").length;
};
}

function mostrarSecao(id){
document.querySelectorAll(".secao").forEach(s=>s.classList.remove("ativa"));
document.getElementById(id).classList.add("ativa");

```
if(id==="ponto"){
    setTimeout(()=>{
        iniciarMapa();
        mapa.invalidateSize();
    },200);
}
```

}

function carregarUsuarios(){
const tx=db.transaction("users","readonly");
tx.objectStore("users").getAll().onsuccess=e=>{
listaUsuarios.innerHTML="";
e.target.result.forEach(u=>{
listaUsuarios.innerHTML+=`<p>${u.usuario}</p>`;
});
};
}

