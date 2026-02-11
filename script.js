const dbName = "monitoramentoDB";
let db;
let usuarioAtual = null;
let mapa, geometriaAtual;

/* ================================
   ABRIR BANCO
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
        document.getElementById("btnUsuarios").classList.remove("hidden");
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
   TROCA DE ABAS
================================ */

function mostrarSecao(id){
    document.querySelectorAll(".secao").forEach(sec=>{
        sec.classList.remove("ativa");
    });

    const secao = document.getElementById(id);
    if(secao){
        secao.classList.add("ativa");
    }

    if(id === "ponto" && mapa){
        setTimeout(()=> mapa.invalidateSize(),200);
    }

    if(id === "dashboard"){
        atualizarDashboard();
    }

    if(id === "usuarios"){
        listarUsuarios();
    }
}

/* ================================
   USUÁRIOS
================================ */

function mostrarCadastroUsuario(){
    document.getElementById("loginTela").classList.add("hidden");
    document.getElementById("cadastroUsuarioTela").classList.remove("hidden");
}

function voltarLogin(){
    document.getElementById("cadastroUsuarioTela").classList.add("hidden");
    document.getElementById("loginTela").classList.remove("hidden");
}

function cadastrarUsuario(){
    const novo = {
        usuario:document.getElementById("novoUsuario").value,
        senha:document.getElementById("novaSenha").value,
        perfil:"TECNICO",
        status:"PENDENTE"
    };

    const tx=db.transaction("users","readwrite");
    tx.objectStore("users").add(novo);

    alert("Usuário aguardando aprovação do ADM.");
    voltarLogin();
}

function listarUsuarios(){
    const lista = document.getElementById("listaUsuarios");
    lista.innerHTML = "";

    const tx = db.transaction("users","readonly");
    const store = tx.objectStore("users");

    store.getAll().onsuccess = e=>{
        e.target.result.forEach(u=>{
            const div = document.createElement("div");
            div.style.marginBottom = "10px";

            div.innerHTML = `
                <b>${u.usuario}</b> - ${u.perfil} - ${u.status}
                ${u.status==="PENDENTE" && usuarioAtual.perfil==="ADM"
                    ? `<button onclick="aprovarUsuario('${u.usuario}')">Aprovar</button>`
                    : ""}
            `;

            lista.appendChild(div);
        });
    };
}

function aprovarUsuario(usuario){
    const tx = db.transaction("users","readwrite");
    const store = tx.objectStore("users");

    store.get(usuario).onsuccess = e=>{
        const u = e.target.result;
        u.status = "APROVADO";
        store.put(u);
        listarUsuarios();
    };
}

/* ================================
   MAPA
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
   PONTO
================================ */

function gerarCodigo(){
    document.getElementById("codigoRef").value =
        "PT-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*10000);
}

function definirData(){
    document.getElementById("dataIdentificacao").value =
        new Date().toISOString().split("T")[0];
}

document.getElementById("formPonto").addEventListener("submit",function(e){
    e.preventDefault();

    if(!geometriaAtual){
        alert("Desenhe o ponto no mapa.");
        return;
    }

    const codigo = document.getElementById("codigoRef").value;
    const data = document.getElementById("dataIdentificacao").value;
    const endereco = document.getElementById("endereco").value;
    const bairro = document.getElementById("bairro").value;
    const status = document.getElementById("status").value;
    const descricao = document.getElementById("descricao").value;

    const arquivos = document.getElementById("anexos").files;
    const anexosArray=[];

    for(let f of arquivos){
        if(f.size > 30*1024*1024){
            alert("Arquivo excede 30MB.");
            return;
        }
        anexosArray.push(f);
    }

    const ponto={
        codigo,
        data,
        endereco,
        bairro,
        status,
        descricao,
        geo:geometriaAtual,
        anexos:anexosArray,
        usuario:usuarioAtual.usuario
    };

    const tx=db.transaction("pontos","readwrite");
    tx.objectStore("pontos").add(ponto);

    gerarPDFComDados(ponto); // gera PDF automático

    alert("Ponto salvo com sucesso.");

    atualizarDashboard();
    this.reset();
    geometriaAtual = null;
    gerarCodigo();
    definirData();
});

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
   PDF PROFISSIONAL
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

