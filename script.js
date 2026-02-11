const dbName = "monitoramentoDB";
let db;
let usuarioAtual = null;
let mapa, geometriaAtual;

/* ================================
   BANCO INDEXEDDB
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

/* ================================
   ADMIN PADRÃO
================================ */

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
            console.log("Admin criado: admin / 123456");
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
            alert("Acesso negado ou usuário não aprovado.");
        }
    };
}

function iniciarSistema(){
    document.getElementById("loginTela").classList.add("hidden");
    document.getElementById("sistema").classList.remove("hidden");

    if(usuarioAtual.perfil==="ADM"){
        const btn = document.getElementById("btnUsuarios");
        if(btn) btn.classList.remove("hidden");
    }

    gerarCodigo();
    definirData();
    iniciarMapa();
    atualizarDashboard();
}

function logout(){
    location.reload();
}

/* ================================
   MAPA + DRAW
================================ */

function iniciarMapa(){

    if(mapa){
        mapa.remove();
    }

    mapa = L.map("map").setView([-23.6,-46.7],12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
        .addTo(mapa);

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
}

/* ================================
   AUTOCOMPLETE ENDEREÇO
================================ */

async function buscarEnderecoOSM(query){
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
    const resposta = await fetch(url);
    return await resposta.json();
}

/* ================================
   DOM READY (CORREÇÃO PRINCIPAL)
================================ */

document.addEventListener("DOMContentLoaded",()=>{

    /* ENDEREÇO */
    const campoEndereco = document.getElementById("endereco");
    if(campoEndereco){
        campoEndereco.addEventListener("input", async function(){

            if(this.value.length < 4) return;

            const resultados = await buscarEnderecoOSM(this.value);

            if(resultados.length > 0 && mapa){
                const lat = resultados[0].lat;
                const lon = resultados[0].lon;
                mapa.setView([lat, lon], 16);
            }
        });
    }

    /* FORM PONTO */
    const form = document.getElementById("formPonto");

    if(form){
        form.addEventListener("submit",function(e){

            e.preventDefault();

            if(!geometriaAtual){
                alert("Desenhe o ponto no mapa.");
                return;
            }

            const ponto={
                codigo:document.getElementById("codigoRef").value,
                data:document.getElementById("dataIdentificacao").value,
                endereco:document.getElementById("endereco").value,
                bairro:document.getElementById("bairro").value,
                status:document.getElementById("status").value,
                descricao:document.getElementById("descricao").value,
                geo:geometriaAtual,
                usuario:usuarioAtual.usuario
            };

            const tx=db.transaction("pontos","readwrite");
            tx.objectStore("pontos").add(ponto);

            gerarPDFComDados(ponto);

            alert("Ponto salvo com sucesso.");

            atualizarDashboard();
            form.reset();
            geometriaAtual=null;
            gerarCodigo();
            definirData();
        });
    }

});

/* ================================
   EXCLUIR PONTO
================================ */

function excluirPonto(id){
    if(!confirm("Deseja realmente excluir este ponto?")) return;

    const tx=db.transaction("pontos","readwrite");
    tx.objectStore("pontos").delete(id);

    tx.oncomplete=()=>{
        alert("Ponto excluído.");
        atualizarDashboard();
    };
}

/* ================================
   DASHBOARD
================================ */

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

/* ================================
   PDF
================================ */

function gerarPDFComDados(ponto){

    const {jsPDF}=window.jspdf;
    const doc=new jsPDF();

    doc.setFontSize(12);
    doc.text("Relatório Técnico de Apoio ao Planejamento – Uso Interno",10,10);

    doc.setFontSize(10);
    doc.text("Código: "+ponto.codigo,10,25);
    doc.text("Data: "+ponto.data,10,35);
    doc.text("Endereço: "+ponto.endereco,10,45);
    doc.text("Bairro: "+ponto.bairro,10,55);
    doc.text("Status: "+ponto.status,10,65);

    doc.text("Descrição Técnica:",10,80);
    doc.text(ponto.descricao || "Não informada.",10,90);

    doc.save("Relatorio_"+ponto.codigo+".pdf");
}

/* ================================
   TROCA DE SEÇÃO
================================ */

function mostrarSecao(id){

    document.querySelectorAll(".secao").forEach(sec=>{
        sec.classList.remove("ativa");
    });

    const secao = document.getElementById(id);
    if(secao){
        secao.classList.add("ativa");
    }

    if(id==="ponto" && mapa){
        setTimeout(()=>{
            mapa.invalidateSize();
        },200);
    }
}

