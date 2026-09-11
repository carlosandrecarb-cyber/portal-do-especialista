const URL_API = "https://script.google.com/macros/s/AKfycbzrbfJgz-TSiyWftvEDXH4ZsxZBAYamozeYho2f4KH1T7ZnjBWdwVobHqirP0bDnGMj/exec";
var dadosPlanosGlobais = [];

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
  if (!usuario || !senha) {
    msg.innerText = "Preencha usuário e senha.";
    return;
  }

  msg.innerText = "⏳ Autenticando Especialista...";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "login", usuario, senha }) });
    const r = await res.json();
    if (r.status === "sucesso" && r.perfil.toLowerCase() === "especialista") {
      document.getElementById('telaLogin').style.display = 'none';
      document.getElementById('infoUsuarioBoasVindas').style.display = 'inline-block';
      document.getElementById('infoUsuarioBoasVindas').innerText = `👋 Gestor Logado: ${r.nome}`;
      carregarListaUsuarios();
    } else {
      msg.innerText = "Acesso Negado: Credenciais inválidas ou sem perfil de Especialista.";
    }
  } catch (e) { 
    msg.innerText = "⚠️ Erro de conexão com o servidor."; 
  }
}

function sairDoSistema() {
  document.getElementById('loginSenha').value = ""; 
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('infoUsuarioBoasVindas').style.display = 'none';
  mudarAba('abaUsuarios', document.querySelector('.tabs button')); 
}

async function carregarListaUsuarios() {
  const container = document.getElementById('tabelaUsuariosContainer');
  container.innerHTML = "<p style='text-align:center;'>⏳ Carregando usuários...</p>";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarUsuarios" }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      let html = `<table><tr><th>Nome / E-mail</th><th>Perfil</th><th>Senha</th><th>Ação</th></tr>`;
      r.usuarios.forEach(u => {
        let emailD = (u.email && u.email !== "undefined") ? u.email : "Sem e-mail";
        html += `<tr><td><strong>${u.nome}</strong><br><span style="font-size:0.8rem; color:#64748b;">${emailD}</span></td><td>${u.perfil}</td><td><span style="background:#e2e8f0; padding:4px 8px; border-radius:6px; font-family:monospace;">${u.senha}</span></td><td><button onclick="editarUsuario(${u.linha}, '${u.nome}', '${u.email}', '${u.senha}', '${u.perfil}', '${u.componentes}', '${u.turmas}')" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">Editar</button></td></tr>`;
      });
      container.innerHTML = html + `</table>`;
    }
  } catch(e) { container.innerHTML = "<p>Erro ao listar usuários.</p>"; }
}

async function salvarUsuario() {
  const dados = { linha: document.getElementById('usuarioLinha').value, nome: document.getElementById('cadNome').value.trim(), email: document.getElementById('cadEmail').value.trim(), senha: document.getElementById('cadSenha').value.trim(), perfil: document.getElementById('cadPerfil').value, componentes: document.getElementById('cadComponentes').value.trim(), turmas: document.getElementById('cadTurmas').value.trim() };
  if(!dados.nome || !dados.senha) { alert("Nome e Senha são obrigatórios."); return; }
  try {
    await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarUsuario", usuarioData: dados }) });
    alert("✅ Usuário salvo!"); limparFormUsuario(); carregarListaUsuarios();
  } catch(e) { alert("⚠️ Erro ao salvar."); }
}

function editarUsuario(linha, nome, email, senha, perfil, comp, turma) {
  document.getElementById('usuarioLinha').value = linha; document.getElementById('cadNome').value = nome;
  document.getElementById('cadEmail').value = email !== "undefined" ? email : ""; document.getElementById('cadSenha').value = senha;
  document.getElementById('cadPerfil').value = perfil; document.getElementById('cadComponentes').value = comp !== "undefined" ? comp : "";
  document.getElementById('cadTurmas').value = turma !== "undefined" ? turma : ""; window.scrollTo({ top: 0, behavior: 'smooth' });
}
function limparFormUsuario() { document.querySelectorAll('#abaUsuarios input').forEach(i => i.value = ""); }

async function carregarPlanosSupervisao() {
  const container = document.getElementById('tabelaPlanosContainer');
  container.innerHTML = "<p style='text-align:center;'>⏳ Buscando planos...</p>";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarSupervisao" }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      dadosPlanosGlobais = r.registros.reverse();
      popularDropdownsFiltro(dadosPlanosGlobais);
      renderizarTabelaPlanos(dadosPlanosGlobais);
    }
  } catch (e) { container.innerHTML = "<p>Erro ao conectar.</p>"; }
}

function popularDropdownsFiltro(planos) {
  const profs = [...new Set(planos.map(p => p.professor))].filter(Boolean).sort();
  const comps = [...new Set(planos.map(p => p.componente))].filter(Boolean).sort();
  const turmas = [...new Set(planos.map(p => p.turma))].filter(Boolean).sort();
  const trimestres = [...new Set(planos.map(p => p.trimestre))].filter(Boolean).sort();

  preencherSelect('filtroProf', profs, '👩‍🏫 Todos');
  preencherSelect('filtroComp', comps, '📚 Todos');
  preencherSelect('filtroTurma', turmas, '🏷️ Todas');
  preencherSelect('filtroTrimestre', trimestres, '⏳ Todos');

  preencherSelect('rxFiltroProf', profs, '👩‍🏫 Todos os Professores');
  preencherSelect('rxFiltroComp', comps, '📚 Todos os Componentes');
  preencherSelect('rxFiltroTurma', turmas, '🏷️ Todas as Turmas');
  preencherSelect('rxFiltroTrimestre', trimestres, '⏳ Todos os Trimestres');
}

function preencherSelect(id, lista, padrao) {
  const sel = document.getElementById(id);
  if(!sel) return;
  const valorAtual = sel.value;
  sel.innerHTML = `<option value="">${padrao}</option>` + lista.map(i => `<option value="${i}">${i}</option>`).join('');
  sel.value = valorAtual; 
}

function filtrarPlanos() {
  const tProf = document.getElementById('filtroProf').value;
  const tComp = document.getElementById('filtroComp').value;
  const tTurma = document.getElementById('filtroTurma').value;
  const tTrimestre = document.getElementById('filtroTrimestre').value;
  const tStatus = document.getElementById('filtroStatus').value;
  
  const filtrados = dadosPlanosGlobais.filter(p => {
    return (tProf === "" || p.professor === tProf) && 
           (tComp === "" || p.componente === tComp) && 
           (tTurma === "" || p.turma === tTurma) &&
           (tTrimestre === "" || p.trimestre === tTrimestre) &&
           (tStatus === "" || p.status.includes(tStatus));
  });
  renderizarTabelaPlanos(filtrados);
}

function renderizarTabelaPlanos(planos) {
  const container = document.getElementById('tabelaPlanosContainer');
  if(planos.length === 0) { container.innerHTML = "<p style='text-align:center;'>Nenhum plano encontrado com estes filtros.</p>"; return; }
  
  let html = `<table><tr><th>Data / Professor</th><th>Turma & Componente</th><th>Links (Docs e Evidências)</th><th>Status & Feedback</th></tr>`;
  planos.forEach(p => {
    let corStatus = p.status.includes('Aprovado') ? '#10b981' : (p.status.includes('Devolvido') ? '#ef4444' : '#f59e0b');
    let feedbackView = p.feedback ? `<div style="margin-top:8px; padding:6px; background:#fee2e2; border-radius:6px; font-size:0.8rem; color:#991b1b;">💬 <strong>Motivo:</strong> ${p.feedback}</div>` : '';
    
    html += `<tr>
              <td><strong>${p.data}</strong><br><span style="color:#475569; font-size:0.9rem;">${p.professor}</span></td>
              <td><strong>${p.componente}</strong><br><span style="color:#64748b; font-size:0.85rem;">${p.turma} (${p.trimestre})</span></td>
              <td>
                <a href="${p.docUrl}" target="_blank" style="text-decoration:none; color:#2563eb; font-weight:bold; display:block; margin-bottom:5px;">📄 Abrir Plano (Doc)</a>
                <a href="${p.pastaUrl}" target="_blank" style="text-decoration:none; color:#d97706; font-weight:bold; font-size:0.85rem;">📁 Pasta Evidências</a>
              </td>
              <td>
                <select onchange="alterarStatusPlano(${p.linha}, this.value)" style="padding:6px; font-weight:bold; border:2px solid ${corStatus}; color:${corStatus}; border-radius:8px; width:100%; cursor:pointer;">
                  <option value="🟡 Pendente" ${p.status.includes('Pendente') ? 'selected' : ''}>🟡 Pendente</option>
                  <option value="✅ Aprovado" ${p.status.includes('Aprovado') ? 'selected' : ''}>✅ Aprovado</option>
                  <option value="🔴 Devolvido p/ Ajuste" ${p.status.includes('Devolvido') ? 'selected' : ''}>🔴 Devolvido p/ Ajuste</option>
                </select>
                ${feedbackView}
              </td>
             </tr>`;
  });
  html += `</table>`;
  container.innerHTML = html;
}

async function alterarStatusPlano(linha, novoStatus) {
  let feedback = "";
  if(novoStatus.includes('Devolvido')) {
    feedback = prompt("Qual o motivo da devolução? (O professor verá esta mensagem)");
    if(feedback === null) { carregarPlanosSupervisao(); return; } 
  }
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "atualizarStatus", linha: linha, novoStatus: novoStatus, feedback: feedback }) });
    const r = await res.json();
    if(r.status === "sucesso") carregarPlanosSupervisao(); 
  } catch(e) { alert("Falha na conexão ao atualizar status."); }
}

async function gerarRaioX() {
  const painel = document.getElementById('painelRaioX');
  const compSelecionado = document.getElementById('rxFiltroComp').value;
  const turma = document.getElementById('rxFiltroTurma').value;
  const prof = document.getElementById('rxFiltroProf').value;
  const trim = document.getElementById('rxFiltroTrimestre').value;
  
  painel.innerHTML = "<p style='text-align:center;'>⏳ Analisando componentes curriculares e matrizes...</p>";
  
  try {
    const listaComponentes = compSelecionado ? [compSelecionado] : [
      "Língua Portuguesa", "Matemática", "Geografia", "História", 
      "Ciências", "Educação Física", "Ensino Religioso", "Arte", "Língua Inglesa"
    ];

    let htmlGeral = "";
    let totalGeralMatriz = 0;
    let totalGeralDadas = 0;

    for (let i = 0; i < listaComponentes.length; i++) {
      let c = listaComponentes[i];
      const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "cruzarHabilidades", componente: c, turma: turma, professor: prof, trimestre: trim }) });
      const r = await res.json();
      
      if (r.status === "sucesso" && r.totalMatriz > 0) {
        const total = r.totalMatriz;
        const dadas = r.trabalhadas.length;
        const perc = total > 0 ? Math.round((dadas / total) * 100) : 0;
        totalGeralMatriz += total;
        totalGeralDadas += dadas;

        htmlGeral += `<div class="card-componente">
                        <h4>
                          <span>📚 ${c}</span>
                          <span style="font-size: 0.9rem; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${perc}% Concluído (${dadas}/${total})</span>
                        </h4>
                        
                        <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; margin-bottom:15px; overflow:hidden;">
                          <div style="width:${perc}%; background:#10b981; height:100%;"></div>
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                          <div style="background:#d1fae5; padding:15px; border-radius:10px; border:1px solid #a7f3d0; max-height:220px; overflow-y:auto;">
                            <h5 style="color:#065f46; margin:0 0 10px 0; font-size:0.95rem;">✅ Habilidades Dadas</h5>
                            <ul style="padding-left:18px; margin:0; font-size:0.85rem; color:#064e3b;">`;
        r.trabalhadas.forEach(h => htmlGeral += `<li style="margin-bottom:8px; line-height:1.4;">${h.habilidade.replace(`[${c}]`, '')} <br><small style="color:#047857; font-weight:600;">(Prof. ${h.professor})</small></li>`);
        if(r.trabalhadas.length === 0) htmlGeral += "<li style='color:#065f46;'>Nenhuma habilidade registrada.</li>";
        htmlGeral += `</ul></div>
                          
                          <div style="background:#fef3c7; padding:15px; border-radius:10px; border:1px solid #fde68a; max-height:220px; overflow-y:auto;">
                            <h5 style="color:#92400e; margin:0 0 10px 0; font-size:0.95rem;">⚠️ Faltam Ensinar</h5>
                            <ul style="padding-left:18px; margin:0; font-size:0.85rem; color:#78350f;">`;
        r.pendentes.forEach(h => htmlGeral += `<li style="margin-bottom:8px; line-height:1.4;">${h.habilidade.replace(`[${c}]`, '')}</li>`);
        if(r.pendentes.length === 0) htmlGeral += "<li style='color:#92400e; font-weight:600;'>Parabéns! Matriz completa neste componente! 🎉</li>";
        htmlGeral += `</ul></div>
                        </div>
                      </div>`;
      }
    }

    if(htmlGeral === "") {
      painel.innerHTML = "<p style='text-align:center; padding:20px; color:#64748b;'>Nenhum dado encontrado para os filtros selecionados.</p>";
      return;
    }

    const percGeral = totalGeralMatriz > 0 ? Math.round((totalGeralDadas / totalGeralMatriz) * 100) : 0;
    const rotuloFiltro = (turma ? turma : "Geral da Escola") + (compSelecionado ? " | " + compSelecionado : " | Todas as Disciplinas");

    let painelResumoTopo = `<div style="background:#ffffff; padding:20px; border-radius:14px; border:1px solid #e2e8f0; text-align:center; margin-bottom:25px; box-shadow: var(--sombra-card);">
                              <h2 style="margin:0; color:var(--cor-principal); font-size:1.8rem;">${percGeral}% Concluído Geral</h2>
                              <p style="color:#64748b; margin:5px 0 12px 0; font-size:0.95rem; font-weight:600;">${totalGeralDadas} de ${totalGeralMatriz} habilidades trabalhadas (${rotuloFiltro})</p>
                              <div style="width:100%; background:#e2e8f0; height:10px; border-radius:5px; overflow:hidden;">
                                <div style="width:${percGeral}%; background:#10b981; height:100%;"></div>
                              </div>
                            </div>`;

    painel.innerHTML = painelResumoTopo + htmlGeral;

  } catch(e) { painel.innerHTML = "<p style='text-align:center; color:#ef4444;'>Erro ao gerar o Raio-X.</p>"; }
}

async function processarEEnviarMatriz() {
  const texto = document.getElementById('textoMatrizBruto').value.trim();
  const disciplina = document.getElementById('impDisciplina').value;
  const ano = document.getElementById('impAno').value;
  const trimestre = document.getElementById('impTrimestre').value;
  const msg = document.getElementById('msgImportacao');
  const btn = document.getElementById('btnProcessarMatriz');

  if (!texto) { alert("⚠️ Cole o texto do plano de curso/matriz antes de processar."); return; }

  msg.innerText = "⏳ Processando linhas e enviando para a planilha...";
  btn.disabled = true;

  var linhas = texto.split('\n');
  var itensLote = [];
  var unidadeAtual = "Unidade Geral";

  for (var i = 0; i < linhas.length; i++) {
    var l = linhas[i].trim();
    if (!l) continue;

    if (l.toLowerCase().includes("unidade") || l.toLowerCase().includes("eixo") || l.toLowerCase().includes("práticas de linguagem")) {
      unidadeAtual = l;
      continue;
    }

    if (l.match(/\(EF[0-9]{2}[A-Z]{2}[0-9]{2}[A-Z]?\)/) || l.length > 20) {
      itensLote.push({
        disciplina: disciplina,
        ano: ano,
        trimestre: trimestre,
        unidade: unidadeAtual,
        genero: "-",
        habPriorizada: l,
        habRecomposicao: "-",
        habSuporte: "-",
        objetoConhecimento: "Conteúdo padrão extraído do plano",
        conteudosRelacionados: "-",
        praticas: "-",
        evidencias: "Avaliação formativa contínua"
      });
    }
  }

  if (itensLote.length === 0) {
    linhas.forEach(function(l) {
      if(l.trim().length > 5) {
        itensLote.push({
          disciplina: disciplina, ano: ano, trimestre: trimestre, unidade: unidadeAtual,
          genero: "-", habPriorizada: l.trim(), habRecomposicao: "-", habSuporte: "-",
          objetoConhecimento: "-", conteudosRelacionados: "-", praticas: "-", evidencias: "-"
        });
      }
    });
  }

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarLoteMatriz", itens: itensLote }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      msg.innerText = "✅ " + r.mensagem;
      document.getElementById('textoMatrizBruto').value = "";
    } else {
      msg.innerText = "⚠️ Erro ao salvar: " + r.mensagem;
    }
  } catch (e) {
    msg.innerText = "⚠️ Erro de comunicação com o servidor.";
  } finally {
    btn.disabled = false;
  }
}

async function gerarRelatorio() {
  const btn = document.getElementById('btnGerarRelatorio');
  const areaLink = document.getElementById('areaLinkRelatorio');
  const periodo = document.getElementById('tipoRelatorio').value;
  btn.innerText = "⏳ Auditando Matrizes e Gerando Documento...";
  btn.disabled = true;
  areaLink.style.display = "none";

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "gerarRelatorioExecutivo", periodo: periodo }) });
    const r = await res.json();
    if(r.status === "sucesso") {
      alert("✅ Relatório Avançado concluído!");
      btn.innerText = "📑 Gerar Novo Documento";
      btn.disabled = false;
      areaLink.style.display = "block";
      areaLink.innerHTML = `<a href="${r.url}" target="_blank" style="display:block; padding:15px; background:#10b981; color:white; text-decoration:none; border-radius:10px; font-weight:bold; font-size:1.1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">📄 CLIQUE AQUI PARA ABRIR O RELATÓRIO</a>`;
    } else {
      alert("⚠️ Erro: " + r.mensagem); btn.innerText = "📑 Gerar Documento Oficial (Google Docs)"; btn.disabled = false;
    }
  } catch(e) { alert("Erro de comunicação."); btn.innerText = "📑 Gerar Documento Oficial (Google Docs)"; btn.disabled = false; }
}

async function forcarBackup() {
  const btn = document.getElementById('btnBackup'); btn.innerText = "⏳ Extraindo dados..."; btn.disabled = true;
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "forcarBackup" }) }); const r = await res.json(); alert("✅ " + r.mensagem); } 
  catch(e) { alert("Erro."); } finally { btn.innerText = "📦 Enviar para E-mail"; btn.disabled = false; }
}
