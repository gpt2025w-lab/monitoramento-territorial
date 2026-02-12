const dbName = "monitoramentoDB";
let db;
let usuarioAtual = null;
let mapa, geometriaAtual, drawnItems;

// =============================
// BANCO
// =============================
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

// =============================
// LOGIN
// =============================
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
    atualizarDashboard();
}

function logout(){
    location.reload();
}

// =============================
// UTIL
// =============================
function gerarCodigo(){
    document.getElementById("codigoRef").value =
        "PT-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*10000);
}

function definirData(){
    document.getElementById("dataIdentificacao").value =
        new Date().toISOString().split("T")[0];
}

// =============================
// MAPA LEAFLET
// =============================
function iniciarMapa(){

    mapa = L.map('map').setView([-23.55,-46.63], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:19
    }).addTo(mapa);

    drawnItems = new L.FeatureGroup();
    mapa.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
        edit:{ featureGroup: drawnItems }
    });

    mapa.addControl(drawControl);

    mapa.on(L.Draw.Event.CREATED,function(e){
        geometriaAtual = e.layer.toGeoJSON();
        drawnItems.addLayer(e.layer);
    });
}

// =============================
// SALVAR PONTO
// =============================
document.addEventListener("DOMContentLoaded",()=>{

    const form = document.getElementById("formPonto");

    if(form){
        form.addEventListener("submit",function(e){

            e.preventDefault();

            const ponto={
                codigo:document.getElementById("codigoRef").value,
                data:document.getElementById("dataIdentificacao").value,
                endereco:document.getElementById("endereco").value,
                bairro:document.getElementById("bairro").value,
                status:document.getElementById("status").value,
                descricao:document.getElementById("descricao").value,
                geometria:geometriaAtual,
                usuario:usuarioAtual.usuario
            };

            const tx=db.transaction("pontos","readwrite");
            tx.objectStore("pontos").add(ponto);

            alert("Ponto salvo com sucesso.");

            atualizarDashboard();
            form.reset();
            gerarCodigo();
            definirData();
            drawnItems.clearLayers();
        });
    }

});

// =============================
// DASHBOARD
// =============================
function atualizarDashboard(){
    const tx=db.transaction("pontos","readonly");
    const store=tx.objectStore("pontos");

    store.getAll().onsuccess=e=>{
        const dados=e.target.result;

        document.getElementById("totalPontos").innerText=dados.length;
        document.getElementById("emAnalise").innerText=
            dados.filter(p=>p.status==="Em Análise").length;
        document.getElementById("monitoramento").innerText=
            dados.filter(p=>p.status==="Monitoramento Ativo").length;
        document.getElementById("arquivados").innerText=
            dados.filter(p=>p.status==="Arquivado").length;
    };
}

// =============================
// USUÁRIOS
// =============================
function carregarUsuarios(){
    const lista=document.getElementById("listaUsuarios");
    lista.innerHTML="";

    const tx=db.transaction("users","readonly");
    const store=tx.objectStore("users");

    store.getAll().onsuccess=e=>{
        e.target.result.forEach(u=>{
            const li=document.createElement("li");
            li.textContent=u.usuario+" - "+u.perfil;
            lista.appendChild(li);
        });
    };
}

// =============================
// NAVEGAÇÃO
// =============================
function mostrarSecao(id){

    document.querySelectorAll(".secao").forEach(sec=>{
        sec.classList.remove("ativa");
    });

    document.getElementById(id).classList.add("ativa");

    if(id==="ponto"){
        setTimeout(()=>{
            if(!mapa) iniciarMapa();
            mapa.invalidateSize();
        },300);
    }

    if(id==="usuarios"){
        carregarUsuarios();
    }
}

