const dbName = "monitoramentoDB";
let db;
let usuarioAtual = null;
let mapa, geometriaAtual;

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

function gerarCodigo(){
    document.getElementById("codigoRef").value =
        "PT-"+new Date().getFullYear()+"-"+Math.floor(Math.random()*10000);
}

function definirData(){
    document.getElementById("dataIdentificacao").value =
        new Date().toISOString().split("T")[0];
}

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
                usuario:usuarioAtual.usuario
            };

            const tx=db.transaction("pontos","readwrite");
            tx.objectStore("pontos").add(ponto);

            alert("Ponto salvo com sucesso.");

            atualizarDashboard();
            form.reset();
            gerarCodigo();
            definirData();
        });
    }

});

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

function mostrarSecao(id){
    document.querySelectorAll(".secao").forEach(sec=>{
        sec.classList.remove("ativa");
    });

    const secao = document.getElementById(id);
    if(secao){
        secao.classList.add("ativa");
    }
}


