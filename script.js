/* ================================
   CONFIG
================================ */
const dbName = "monitoramentoDB";
let db;
let usuarioAtual = null;
let mapa;
let geometriaAtual = null;
let camadaPontosSalvos;

/* ================================
   BANCO
================================ */

const request = indexedDB.open(dbName,1);

request.onupgradeneeded = e=>{
    db = e.target.result;

    if(!db.objectStoreNames.contains("users")){
        db.createObjectStore("users",{keyPath:"usuario"});
    }

    if(!db.objectStoreNames.contains("pontos")){
        db.createObjectStore("pontos",{keyPath:"id",autoIncrement:true});
    }
};

request.onsuccess = e=>{
    db = e.target.result;
    criarAdminPadrao();
};

function criarAdminPadrao(){
    const tx = db.transaction("users","readwrite");
    const store = tx.objectStore("users");

    store.get("admin").onsuccess = e=>{
        if(!e.target.result){
            store.add({
                usuario:"admin",
                senha:"123456",
                perfil:"ADM",
                status:"APROVADO"
            });
        }
    };
}

/* ================================
   LOGIN
================================ */

function login(){
    const user = document.getElementById("loginUsuario").value;
    const pass = document.getElementById("loginSenha").value;

    const tx = db.transaction("users","readonly");
    const store = tx.objectStore("users");

    store.get(user).onsuccess = e=>{
        const u = e.target.result;

        if(u && u.senha===pass && u.status==="APROVADO"){
            usuarioAtual = u;
            iniciarSistema();
        }else{
            alert("Acesso negado.");
        }
    };
}

function iniciarSistema(){
    document.getElementById("loginTela").classList.add("hidden");
    document.getElementById("sistema").classList.remove("hidden");

    gerarCodigo();
    definirData();
    iniciarMapa();
    atualizarDashboard();
}

/* ================================
   MAPA
================================ */

function iniciarMapa(){

    if(mapa) return;

    mapa = L.map("map").setView([-23.6,-46.7],12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
        .addTo(mapa);

    camadaPontosSalvos = L.geoJSON().addTo(mapa);

    const drawn = new L.FeatureGroup();
    mapa.addLayer(drawn);

    const drawControl = new L.Control.Draw({
        edit:{featureGroup:drawn},
        draw:{polygon:true,rectangle:true,marker:true}
    });

    mapa.addControl(drawControl);

    mapa.on(L.Draw.Event.CREATED,e=>{
        drawn.clearLayers();
        drawn.addLayer(e.layer);
        geometriaAtual = e.layer.toGeoJSON();
    });

    carregarPontosNoMapa();
}

/* ================================
   AUTOCOMPLETE ENDEREÇO
================================ */

async function buscarEnderecoOSM(q){
    const url=`https://nominatim.openstreetmap.org/search?format=json&q=${q}`;
    const r=await fetch(url);
    return await r.json();
}

document.addEventListener("DOMContentLoaded",()=>{

    const campo = document.getElementById("endereco");

    if(campo){
        campo.addEventListener("input", async function(){

            if(this.value.length < 4) return;

            const res = await buscarEnderecoOSM(this.value);

            if(res.length > 0 && mapa){
                mapa.setView([res[0].lat,res[0].lon],17);
            }
        });
    }

    const form = document.getElementById("formPonto");

    form.addEventListener("submit",e=>{
        e.preventDefault();

        if(!geometriaAtual){
            alert("Desenhe no mapa.");
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

        tx.oncomplete=()=>{
            alert("Salvo.");
            carregarPontosNoMapa();
            listarPontos();
            form.reset();
            gerarCodigo();
            definirData();
            geometriaAtual=null;
        };
    });
});

/* ================================
   CARREGAR PONTOS NO MAPA
================================ */

function carregarPontosNoMapa(){

    const tx=db.transaction("pontos","readonly");
    const store=tx.objectStore("pontos");

    store.getAll().onsuccess=e=>{
        camadaPontosSalvos.clearLayers();
        e.target.result.forEach(p=>{
            camadaPontosSalvos.addData(p.geo);
        });
        listarPontos();
    };
}

/* ================================
   LISTAR PONTOS
================================ */

function listarPontos(){

    const lista=document.getElementById("listaPontos");
    if(!lista) return;

    lista.innerHTML="";

    const tx=db.transaction("pontos","readonly");
    const store=tx.objectStore("pontos");

    store.openCursor().onsuccess=e=>{
        const cursor=e.target.result;
        if(!cursor) return;

        const p=cursor.value;

        lista.innerHTML+=`
        <div style="background:white;padding:8px;margin:5px;border-left:4px solid #1e3a8a">
            <b>${p.codigo}</b><br>
            ${p.endereco}<br>
            <button onclick="excluirPonto(${p.id})">Excluir</button>
        </div>
        `;

        cursor.continue();
    };
}

/* ================================
   EXCLUIR
================================ */

function excluirPonto(id){

    if(!confirm("Excluir ponto?")) return;

    const tx=db.transaction("pontos","readwrite");
    tx.objectStore("pontos").delete(id);

    tx.oncomplete=()=>{
        carregarPontosNoMapa();
    };
}

/* ================================
   UTIL
================================ */

function gerarCodigo(){
    codigoRef.value="PT-"+Date.now();
}

function definirData(){
    dataIdentificacao.value=new Date().toISOString().split("T")[0];
}

function atualizarDashboard(){

    const tx=db.transaction("pontos","readonly");
    const store=tx.objectStore("pontos");

    store.getAll().onsuccess=e=>{
        const dados=e.target.result;

        totalPontos.innerText=dados.length;
        emAnalise.innerText=dados.filter(p=>p.status==="Em Análise").length;
        monitoramento.innerText=dados.filter(p=>p.status==="Monitoramento Ativo").length;
        arquivados.innerText=dados.filter(p=>p.status==="Arquivado").length;
    };
}

function mostrarSecao(id){

    document.querySelectorAll(".secao").forEach(s=>s.classList.remove("ativa"));
    document.getElementById(id).classList.add("ativa");

    if(id==="ponto"){
        setTimeout(()=>mapa.invalidateSize(),300);
        listarPontos();
    }
}


