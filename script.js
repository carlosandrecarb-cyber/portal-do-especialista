// Substitua pela SUA URL correta se necessário, mas essa é a que estamos usando
const URL_API = "https://script.google.com/macros/s/AKfycbzrbfJgz-TSiyWftvEDXH4ZsxZBAYamozeYho2f4KH1T7ZnjBWdwVobHqirP0bDnGMj/exec";

function mudarAba(abaId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
  document.getElementById(abaId).classList.add('active');
  btn.classList.add('active');

  if (abaId === 'abaUsuarios') carregarListaUsuarios();
  if (abaId === 'abaSupervisao') carregarPlanosSupervisao();
}

async function fazerLogin() {
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const msg = document.getElementById('msgLogin');

  if (!usuario || !senha) { msg.innerText = "Preencha usuário e senha."; return; }

  msg.innerText = "⏳ Autenticando Especialista...";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "login", usuario, senha }) });
    const r = await res.json();

    if (r.status === "sucesso") {
      if (r.perfil !== "Especialista") {
        msg.innerText = "Acesso Negado: Área restrita à equipe de Gestão.";
        return;
      }
      document.getElementById('telaLogin').style.display = 'none';
      
      const headerBoasVindas = document.getElementById('infoUsuarioBoasVindas');
      headerBoasVindas.style.display = 'inline-block';
      headerBoasVindas.innerText = `👋 Gestor Logado: ${r.nome}`;

      carregarPlanosSupervisao();
      carregarListaUsuarios();
    } else {
      msg.innerText = r.mensagem || "Usuário ou senha incorretos.";
    }
  } catch (e) {
    msg.innerText = "⚠️ Erro de conexão com o servidor.";
  }
}

function sairDoSistema() {
  document.getElementById('loginSenha').value = ""; 
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('infoUsuarioBoasVindas').style.display = 'none';
  mudarAba('abaSupervisao', document.querySelector('.tabs button')); 
}

// ==========================================
// ABA 1: SUPERVISÃO DE PLANOS
// ==========================================
async function carregarPlanosSupervisao() {
  const container = document.getElementById('tabelaPlanosContainer');
  container.innerHTML = "<p>⏳ Buscando planos de aula recentes...</p>";
  
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarSupervisao" }) });
    const r = await res.json();
    
    if (r.status === "sucesso" && r.registros && r.registros.length > 0) {
      let html = `<table>
                    <tr>
                      <th>Data / Professor</th>
                      <th>Turma & Componente</th>
                      <th>Links (Acesso Restrito)</th>
                      <th>Status Pedagógico</th>
                    </tr>`;
      
      r.registros.reverse().forEach(p => {
        let corStatus = p.status.includes('Aprovado') ? '#10b981' : (p.status.includes('Devolvido') ? '#ef4444' : '#f59e0b');
        
        html += `<tr>
                  <td><strong>${p.data}</strong><br><span style="color:#475569; font-size:0.9rem;">${p.professor}</span></td>
                  <td><strong>${p.componente}</strong><br><span style="color:#64748b; font-size:0.85rem;">${p.turma} (${p.trimestre || '-'})</span></td>
                  <td>
                    <a href="${p.docUrl}" target="_blank" style="text-decoration:none; color:#2563eb; font-weight:bold; display:block; margin-bottom:5px;">📄 Abrir Plano (Doc)</a>
                    <a href="${p.pastaUrl}" target="_blank" style="text-decoration:none; color:#d97706; font-weight:bold; font-size:0.85rem;">📁 Pasta Evidências</a>
                  </td>
                  <td>
                    <select onchange="alterarStatusPlano(${p.linha}, this.value)" style="padding:6px; font-weight:bold; border:2px solid ${corStatus}; color:${corStatus}; border-radius:8px; width:100%; cursor:pointer;">
                      <option value="🟡 Pendente" ${p.status.includes('Pendente') ? 'selected' : ''}>🟡 Pendente</option>
                      <option value="✅ Aprovado" ${p.status.includes('Aprovado') ? 'selected' : ''}>✅ Aprovado</option>
                      <option value="🔴 Devolvido p/ Ajuste" ${p.status.includes('Devolvido') ? 'selected' : ''}>🔴 Devolvido</option>
                    </select>
                  </td>
                 </tr>`;
      });
      html += `</table>`;
      container.innerHTML = html;
    } else {
      container.innerHTML = "<p>Nenhum plano foi enviado para a supervisão ainda.</p>";
    }
  } catch (e) {
    container.innerHTML = "<p>Erro ao conectar com a base de dados.</p>";
  }
}

async function alterarStatusPlano(linha, novoStatus) {
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "atualizarStatus", linha: linha, novoStatus: novoStatus }) });
    const r = await res.json();
    if(r.status !== "sucesso") alert("Erro ao atualizar o status.");
  } catch(e) {
    alert("Falha na conexão ao atualizar status.");
  }
}

// ==========================================
// ABA 2: GESTÃO DE USUÁRIOS
// ==========================================
async function carregarListaUsuarios() {
  const container = document.getElementById('tabelaUsuariosContainer');
  container.innerHTML = "<p>⏳ Carregando banco de usuários...</p>";
  
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarUsuarios" }) });
    const r = await res.json();
    
    if (r.status === "sucesso") {
      let html = `<table>
                    <tr>
                      <th>Nome / E-mail</th>
                      <th>Perfil</th>
                      <th>Acesso (Senha)</th>
                      <th>Ação</th>
                    </tr>`;
      
      r.usuarios.forEach(u => {
        let emailDisplay = (u.email && u.email !== "undefined" && u.email !== "null") ? u.email : "Sem e-mail (Link Público)";
        html += `<tr>
                  <td><strong>${u.nome}</strong><br><span style="font-size:0.8rem; color:#64748b;">${emailDisplay}</span></td>
                  <td>${u.perfil}</td>
                  <td><span style="background:#e2e8f0; padding:4px 8px; border-radius:6px; letter-spacing:1px; font-family:monospace;">${u.senha}</span></td>
                  <td>
                    <button onclick="editarUsuario(${u.linha}, '${u.nome}', '${u.email}', '${u.senha}', '${u.perfil}', '${u.componentes}', '${u.turmas}')" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Editar / Ver Dados</button>
                  </td>
                 </tr>`;
      });
      html += `</table>`;
      container.innerHTML = html;
    }
  } catch(e) {
    container.innerHTML = "<p>Erro ao carregar lista de usuários.</p>";
  }
}

async function salvarUsuario() {
  const dados = {
    linha: document.getElementById('usuarioLinha').value,
    nome: document.getElementById('cadNome').value.trim(),
    email: document.getElementById('cadEmail').value.trim(),
    senha: document.getElementById('cadSenha').value.trim(),
    perfil: document.getElementById('cadPerfil').value,
    componentes: document.getElementById('cadComponentes').value.trim(),
    turmas: document.getElementById('cadTurmas').value.trim()
  };

  if(!dados.nome || !dados.senha) {
    alert("⚠️ Nome e Senha são obrigatórios para criar acesso."); 
    return;
  }

  const btn = document.querySelector('button[onclick="salvarUsuario()"]');
  btn.innerText = "⏳ Salvando...";
  btn.disabled = true;

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarUsuario", usuarioData: dados }) });
    const r = await res.json();
    alert("✅ " + r.mensagem);
    limparFormUsuario();
    carregarListaUsuarios();
  } catch(e) {
    alert("⚠️ Erro ao salvar usuário.");
  } finally {
    btn.innerText = "💾 Salvar / Atualizar Usuário";
    btn.disabled = false;
  }
}

function editarUsuario(linha, nome, email, senha, perfil, componentes, turmas) {
  document.getElementById('usuarioLinha').value = linha;
  document.getElementById('cadNome').value = nome;
  document.getElementById('cadEmail').value = (email !== "undefined" && email !== "null") ? email : "";
  document.getElementById('cadSenha').value = senha;
  document.getElementById('cadPerfil').value = perfil;
  document.getElementById('cadComponentes').value = (componentes !== "undefined" && componentes !== "null") ? componentes : "";
  document.getElementById('cadTurmas').value = (turmas !== "undefined" && turmas !== "null") ? turmas : "";
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormUsuario() {
  document.getElementById('usuarioLinha').value = "";
  document.getElementById('cadNome').value = "";
  document.getElementById('cadEmail').value = "";
  document.getElementById('cadSenha').value = "";
  document.getElementById('cadPerfil').value = "Professor";
  document.getElementById('cadComponentes').value = "";
  document.getElementById('cadTurmas').value = "";
}

// ==========================================
// ABA 3: RELATÓRIOS E BACKUP
// ==========================================
async function gerarRelatorio() {
  const btn = document.getElementById('btnGerarRelatorio');
  const periodo = document.getElementById('tipoRelatorio').value;
  btn.innerText = "⏳ Auditando e Gerando Relatório...";
  btn.disabled = true;

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "gerarRelatorioExecutivo", periodo: periodo }) });
    const r = await res.json();
    if(r.status === "sucesso") {
      alert("✅ Relatório gerado! O Google Docs será aberto em uma nova aba.");
      window.open(r.url, '_blank');
    } else {
      alert("⚠️ Erro: " + r.mensagem);
    }
  } catch(e) {
    alert("Erro de comunicação ao gerar relatório.");
  } finally {
    btn.innerText = "📑 Gerar Documento PDF/Word";
    btn.disabled = false;
  }
}

async function forcarBackup() {
  const btn = document.getElementById('btnBackup');
  btn.innerText = "⏳ Extraindo dados (Aguarde)...";
  btn.disabled = true;

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "forcarBackup" }) });
    const r = await res.json();
    alert("✅ " + r.mensagem);
  } catch(e) {
    alert("Erro ao solicitar o backup.");
  } finally {
    btn.innerText = "📦 Enviar Backup para meu E-mail";
    btn.disabled = false;
  }
}
