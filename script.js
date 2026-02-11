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
    const user = loginUsuario.value;
    const pass = loginSenha.value;

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
    loginTela.classList.add("hidden");
    sistema.classList.remove("hidden");

    if(usuarioAtual.perfil==="ADM"){
        btnUsuarios.classList.remove("hidden");
    }

    gerarCodigo();
    definirData();
    iniciarMapa();
    atualizarDashboard();
}

/* ================================
   LOGOUT
================================ */

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

    document.getElementById(id).classList.add("ativa");

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
    loginTela.classList.add("hidden");
    cadastroUsuarioTela.classList.remove("hidden");
}

function voltarLogin(){
    cadastroUsuarioTela.classList.add("hidden");
    loginTela.classList.remove("hidden");
}

function cadastrarUsuario(){
    const novo = {
        usuario:novoUsuario.value,
        senha:novaSenha.value,
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
    codigoRef.value="PT-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*10000);
}

function definirData(){
    dataIdentificacao.value=new Date().toISOString().split("T")[0];
}

document.getElementById("formPonto").addEventListener("submit",function(e){
    e.preventDefault();

    if(!geometriaAtual){
        alert("Desenhe o ponto no mapa.");
        return;
    }

    const arquivos = anexos.files;
    const anexosArray=[];

    for(let f of arquivos){
        if(f.size > 30*1024*1024){
            alert("Arquivo excede 30MB.");
            return;
        }
        anexosArray.push(f);
    }

    const ponto={
        codigo:codigoRef.value,
        data:dataIdentificacao.value,
        endereco:endereco.value,
        bairro:bairro.value,
        status:status.value,
        descricao:descricao.value,
        geo:geometriaAtual,
        anexos:anexosArray,
        usuario:usuarioAtual.usuario
    };

    const tx=db.transaction("pontos","readwrite");
    tx.objectStore("pontos").add(ponto);

    alert("Ponto salvo com sucesso.");
    atualizarDashboard();
    this.reset();
});

/* ================================
   DASHBOARD
================================ */

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

/* ================================
   PDF
================================ */

function gerarPDFPonto(){
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF();

    doc.text("Relatório Técnico de Apoio ao Planejamento – Uso Interno",10,10);
    doc.text("Código: "+codigoRef.value,10,20);
    doc.text("Data: "+dataIdentificacao.value,10,30);
    doc.text("Endereço: "+endereco.value,10,40);
    doc.text("Descrição: "+descricao.value,10,50);

    doc.save("Relatorio_"+codigoRef.value+".pdf");
}


