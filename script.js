const dbName = "monitoramentoDB";
let db;
let usuarioAtual = null;
let mapa;
let geometriaAtual = null;
let camadaDesenho;

/* ========================
   BANCO
======================== */

const request = indexedDB.open(dbName,1);

request.onupgradeneeded = e=>{
    db = e.target.result;

    db.createObjectStore("users",{keyPath:"usuario"});
    db.createObjectStore("pontos",{keyPath:"id",autoIncrement:true});
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

/* ========================
   LOGIN
======================== */

function login(){
    const user = loginUsuario.value;
    const pass = loginSenha.value;

    const tx = db.transaction("users","readonly");
    const store = tx.objectStore("users");

    store.get(user).onsuccess = e=>{
        const u = e.target.result;
        if(u && u.senha===pass){
            usuarioAtual = u;
            iniciarSistema();
        }else{
            alert("Login inválido");
        }
    };
}

function iniciarSistema(){
    loginTela.classList.add("hidden");
    sistema.classList.remove("hidden");

    gerarCodigo();
    definirData();
    atualizarDashboard();
}

function logout(){ location.reload(); }

/* ========================
   MAPA
======================== */

function iniciarMapa(){

    if(mapa) return;

    mapa = L.map("map").setView([-23.6,-46.7],12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
        .addTo(mapa);

    camadaDesenho = new L.FeatureGroup();
    mapa.addLayer(camadaDesenho);

    const drawControl = new L.Control.Draw({
        edit:{ featureGroup:camadaDesenho },
        draw:{ polygon:true, rectangle:true, marker:true }
    });

    mapa.addControl(drawControl);

    mapa.on(L.Draw.Event.CREATED,e=>{
        camadaDesenho.clearLayers();
        camadaDesenho.addLayer(e.layer);
        geometriaAtual = e.layer.toGeoJSON();
    });
}

/* ========================
   FORM
======================== */

document.addEventListener("DOMContentLoaded",()=>{

    formPonto.addEventListener("submit",e=>{
        e.preventDefault();

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
    });

});

/* ========================
   DASHBOARD
======================== */

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

/* ========================
   USUÁRIOS
======================== */

function carregarUsuarios(){
    const tx=db.transaction("users","readonly");
    tx.objectStore("users").getAll().onsuccess=e=>{
        listaUsuarios.innerHTML="";

        e.target.result.forEach(u=>{
            listaUsuarios.innerHTML += `
            <div style="padding:8px;border-bottom:1px solid #ccc">
                ${u.usuario} - ${u.perfil}
            </div>`;
        });
    };
}

/* ========================
   SEÇÕES
======================== */

function mostrarSecao(id){

    document.querySelectorAll(".secao").forEach(s=>s.classList.remove("ativa"));
    document.getElementById(id).classList.add("ativa");

    if(id==="ponto"){
        setTimeout(()=>{
            iniciarMapa();
            mapa.invalidateSize();
        },400);
    }

    if(id==="usuarios"){
        carregarUsuarios();
    }
}

/* ========================
   UTIL
======================== */

function gerarCodigo(){
    codigoRef.value="PT-"+Date.now();
}

function definirData(){
    dataIdentificacao.value=new Date().toISOString().split("T")[0];
}
