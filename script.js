// ==========================================
// IDENTIDADE VISUAL DAS ESCOLAS (FILIAIS)
// ==========================================
const escolasConfig = {
    "mestraaurora": {
        nome: "Escola Municipal Mestra Aurora",
        corPrincipal: "#27ae60", // Verde da Mestra Aurora
        corSecundaria: "#2ecc71",
        logo: "https://drive.google.com/uc?export=view&id=1A2c_3Me99qofg25uyoor4roLHybutll5"
    }
};

// ==========================================
// CONEXÃO COM O BANCO DE DADOS (PLANILHA)
// ==========================================
const URL_API = "https://drive.google.com/file/d/1A2c_3Me99qofg25uyoor4roLHybutll5/view?usp=sharing";

// ==========================================
// CARREGAMENTO DINÂMICO (Veste a camisa da escola)
// ==========================================
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const escolaId = urlParams.get('escola');

    if (escolaId && escolasConfig[escolaId]) {
        const config = escolasConfig[escolaId];
        
        // Troca os textos e a logo
        document.getElementById('nomeEscola').innerText = "Gestão - " + config.nome;
        const imgLogo = document.getElementById('logoEscola');
        imgLogo.src = config.logo;
        imgLogo.style.display = "block";

        // Troca as cores de todo o sistema na hora!
        document.documentElement.style.setProperty('--cor-principal', config.corPrincipal);
        document.documentElement.style.setProperty('--cor-secundaria', config.corSecundaria);
    }
};

// ==========================================
// SISTEMA DE LOGIN DA GESTÃO
// ==========================================
function fazerLogin() {
    const usu = document.getElementById('loginUsuario').value;
    const sen = document.getElementById('loginSenha').value;
    const msg = document.getElementById('msgLogin');
    const btn = document.querySelector('#telaLogin button');

    if(!usu || !sen) { msg.innerText = "Preencha usuário e senha!"; return; }

    btn.innerText = "Autenticando...";
    
    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ acao: "login", usuario: usu, senha: sen })
    })
    .then(res => res.json())
    .then(resp => {
        btn.innerText = "Acessar Painel";
        if(resp.status === "sucesso") {
            // Trava de Segurança: Só Especialistas entram aqui
            if(resp.perfil !== "Especialista") {
                msg.innerText = "⚠️ Acesso negado. Este painel é exclusivo para a Gestão.";
                return;
            }
            document.getElementById('telaLogin').style.display = 'none';
            document.getElementById('painelEspecialista').style.display = 'block';
            document.getElementById('infoUsuarioBoasVindas').innerHTML = "🛡️ Logado como: " + resp.nome;
            carregarUsuarios(); 
        } else {
            msg.innerText = "⚠️ " + resp.mensagem;
        }
    })
    .catch(err => {
        btn.innerText = "Acessar Painel";
        msg.innerText = "⚠️ Falha de comunicação com o servidor.";
    });
}

// ==========================================
// NAVEGAÇÃO DE ABAS
// ==========================================
function mudarAba(abaId, elementoBotao) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    elementoBotao.classList.add('active');
}

// ==========================================
// GESTÃO DE USUÁRIOS (PROFESSORES)
// ==========================================
function carregarUsuarios() {
    const lista = document.getElementById('listaUsuarios');
    lista.innerHTML = "Consultando banco de dados...";
    
    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ acao: "listarUsuarios" })
    })
    .then(res => res.json())
    .then(resp => {
        if (resp.status === "sucesso") {
            let html = "";
            resp.usuarios.forEach(u => {
                html += `
                <div class="card-item">
                    <div>
                        <strong>${u.nome}</strong> (${u.perfil})<br>
                        <span style="font-size: 0.85rem; color: #555;">Senha: ${u.senha} | Componentes: ${u.componentes || '-'} | Turmas: ${u.turmas || '-'}</span>
                    </div>
                    <div class="card-acoes">
                        <button style="background: #f39c12;" onclick="editarUsuario(${u.linha}, '${u.nome}', '${u.senha}', '${u.perfil}', '${u.componentes}', '${u.turmas}')">✏️ Editar</button>
                        <button style="background: #e74c3c;" onclick="excluirUsuario(${u.linha})">🗑️ Excluir</button>
                    </div>
                </div>`;
            });
            lista.innerHTML = html || "Nenhum usuário cadastrado.";
        } else {
            lista.innerHTML = "Erro ao carregar lista de usuários.";
        }
    })
    .catch(() => lista.innerHTML = "Erro de conexão ao buscar usuários.");
}

function salvarUsuario() {
    const linha = document.getElementById('linhaUsuario').value;
    const nome = document.getElementById('cadNome').value;
    const senha = document.getElementById('cadSenha').value;
    const perfil = document.getElementById('cadPerfil').value;
    const componentes = document.getElementById('cadComponentes').value;
    const turmas = document.getElementById('cadTurmas').value;
    const msg = document.getElementById('msgFormulario');

    if(!nome || !senha) { msg.innerText = "Nome e Senha são obrigatórios!"; msg.style.color = "red"; return; }

    msg.innerText = "Salvando no Google Sheets...";
    msg.style.color = "blue";

    const usuarioData = { linha: linha, nome: nome, senha: senha, perfil: perfil, componentes: componentes, turmas: turmas };

    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ acao: "salvarUsuario", usuarioData: usuarioData })
    })
    .then(res => res.json())
    .then(resp => {
        if(resp.status === "sucesso") {
            msg.innerText = "✅ " + resp.mensagem;
            msg.style.color = "green";
            limparFormulario();
            carregarUsuarios(); // Atualiza a lista automaticamente
        } else { msg.innerText = "⚠️ Erro ao salvar."; msg.style.color = "red"; }
    });
}

function editarUsuario(linha, nome, senha, perfil, componentes, turmas) {
    document.getElementById('linhaUsuario').value = linha;
    document.getElementById('cadNome').value = nome;
    document.getElementById('cadSenha').value = senha;
    document.getElementById('cadPerfil').value = perfil;
    document.getElementById('cadComponentes').value = componentes !== 'undefined' ? componentes : '';
    document.getElementById('cadTurmas').value = turmas !== 'undefined' ? turmas : '';
    document.getElementById('msgFormulario').innerText = "Modo de Edição ativado. Altere os dados e clique em Salvar.";
    document.getElementById('msgFormulario').style.color = "#f39c12";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirUsuario(linha) {
    if(!confirm("Atenção! Tem certeza que deseja EXCLUIR este usuário permanentemente?")) return;
    
    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ acao: "excluirUsuario", linha: linha })
    })
    .then(res => res.json())
    .then(resp => {
        if(resp.status === "sucesso") { 
            alert(resp.mensagem); 
            carregarUsuarios(); 
        }
    });
}

function limparFormulario() {
    document.getElementById('linhaUsuario').value = "";
    document.getElementById('cadNome').value = "";
    document.getElementById('cadSenha').value = "";
    document.getElementById('cadPerfil').value = "Professor";
    document.getElementById('cadComponentes').value = "";
    document.getElementById('cadTurmas').value = "";
    document.getElementById('msgFormulario').innerText = "";
}

// ==========================================
// AUDITORIA GLOBAL DE PLANOS
// ==========================================
function carregarHistoricoGeral() {
    const lista = document.getElementById('listaPlanosRede');
    lista.innerHTML = "Buscando todos os planos gerados pela rede...";
    
    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ acao: "buscarHistorico" })
    })
    .then(res => res.json())
    .then(resp => {
        if (resp.status === "sucesso") {
            let html = "";
            resp.historico.forEach(p => {
                html += `
                <div class="card-item">
                    <div>
                        <strong>${p.professor}</strong> - ${p.componente} (${p.turma})<br>
                        <span style="font-size: 0.85rem; color: #7f8c8d;">Data do Registro: ${p.data} | Unidade: ${p.unidade}</span>
                    </div>
                    <div class="card-acoes">
                        <button style="background: var(--cor-principal);" onclick="window.open('${p.urlDoc}','_blank')">📄 Ver Documento</button>
                        <button style="background: var(--cor-secundaria);" onclick="window.open('${p.urlPasta}','_blank')">📁 Ver Evidências</button>
                    </div>
                </div>`;
            });
            lista.innerHTML = html || "Nenhum plano registrado no banco de dados.";
        } else { lista.innerHTML = "Erro ao buscar histórico de planos."; }
    });
}

// ==========================================
// SOLICITAÇÃO DE BACKUP
// ==========================================
function forcarBackup() {
    const msg = document.getElementById('msgBackup');
    msg.innerText = "⏳ Empacotando dados e enviando e-mail... Aguarde.";
    msg.style.color = "#e67e22";
    
    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify({ acao: "forcarBackup" })
    })
    .then(res => res.json())
    .then(resp => {
        if(resp.status === "sucesso") {
            msg.innerText = "✅ " + resp.mensagem;
            msg.style.color = "green";
        } else {
            msg.innerText = "⚠️ Erro: " + resp.mensagem;
            msg.style.color = "red";
        }
    }).catch(() => { msg.innerText = "⚠️ Erro de conexão ao solicitar backup."; });
}
