const URL_API = "https://script.google.com/macros/s/AKfycbzrbfJgz-TSiyWftvEDXH4ZsxZBAYamozeYho2f4KH1T7ZnjBWdwVobHqirP0bDnGMj/exec";
var dadosPlanosGlobais = [];
var loteMatrizPronto = [];
let dadosEspelhoGlobal = {};

// ==========================================
// NAVEGAÇÃO E AUTENTICAÇÃO
// ==========================================
function mudarAba(abaId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
  document.getElementById(abaId).classList.add('active');
  btn.classList.add('active');

  if (abaId === 'abaUsuarios') carregarListaUsuarios();
  if (abaId === 'abaSupervisao') carregarPlanosSupervisao();
  if (abaId === 'abaExtracao') carregarMatrizesSalvas();
}

async function fazerLogin() {
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const msg = document.getElementById('msgLogin');
  
  if (!usuario || !senha) { msg.innerText = "⚠️ Preencha o utilizador e a senha."; return; }

  msg.innerText = "⏳ A Autenticar Especialista... (Aguarde)";
  
  try {
    const res = await fetch(URL_API, { 
      method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "login", usuario, senha }) 
    });
    
    if (!res.ok) throw new Error(`Erro do Servidor: ${res.status}`);
    const r = await res.json();
    
    if (r.status === "sucesso") {
      if (r.perfil && r.perfil.toLowerCase() === "especialista") {
        document.getElementById('telaLogin').style.display = 'none';
        document.getElementById('infoUsuarioBoasVindas').style.display = 'inline-block';
        document.getElementById('infoUsuarioBoasVindas').innerText = `👋 Gestor Logado: ${r.nome}`;
        carregarPlanosSupervisao();
      } else {
        msg.innerText = "⛔ Acesso Negado: A sua conta não tem perfil de Especialista.";
      }
    } else {
      msg.innerText = `⚠️ ${r.mensagem || "Utilizador ou senha incorretos."}`;
    }
  } catch (e) { msg.innerText = `❌ Falha de comunicação: ${e.message}`; }
}

function sairDoSistema() {
  document.getElementById('loginSenha').value = ""; 
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('infoUsuarioBoasVindas').style.display = 'none';
  mudarAba('abaSupervisao', document.querySelector('.tabs button')); 
}

// ==========================================
// GESTÃO DE USUÁRIOS
// ==========================================
async function carregarListaUsuarios() {
  const container = document.getElementById('tabelaUsuariosContainer');
  container.innerHTML = "<p style='text-align:center;'>⏳ A carregar utilizadores...</p>";
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
  } catch(e) { container.innerHTML = "<p>Erro ao listar utilizadores.</p>"; }
}

async function salvarUsuario() {
  const dados = { linha: document.getElementById('usuarioLinha').value, nome: document.getElementById('cadNome').value.trim(), email: document.getElementById('cadEmail').value.trim(), senha: document.getElementById('cadSenha').value.trim(), perfil: document.getElementById('cadPerfil').value, componentes: document.getElementById('cadComponentes').value.trim(), turmas: document.getElementById('cadTurmas').value.trim() };
  if(!dados.nome || !dados.senha) { alert("Nome e Senha são obrigatórios."); return; }
  try {
    await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarUsuario", usuarioData: dados }) });
    alert("✅ Utilizador guardado com sucesso!"); limparFormUsuario(); carregarListaUsuarios();
  } catch(e) { alert("⚠️ Erro ao guardar."); }
}

function editarUsuario(linha, nome, email, senha, perfil, comp, turma) {
  document.getElementById('usuarioLinha').value = linha; document.getElementById('cadNome').value = nome;
  document.getElementById('cadEmail').value = email !== "undefined" ? email : ""; document.getElementById('cadSenha').value = senha;
  document.getElementById('cadPerfil').value = perfil; document.getElementById('cadComponentes').value = comp !== "undefined" ? comp : "";
  document.getElementById('cadTurmas').value = turma !== "undefined" ? turma : ""; window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormUsuario() { document.querySelectorAll('#abaUsuarios input').forEach(i => i.value = ""); }

// ==========================================
// CONTROLE DE PLANOS E RAIO-X
// ==========================================
async function carregarPlanosSupervisao() {
  const container = document.getElementById('tabelaPlanosContainer');
  container.innerHTML = "<p style='text-align:center;'>⏳ A procurar planos...</p>";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarSupervisao" }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      dadosPlanosGlobais = r.registros.reverse();
      popularDropdownsFiltro(dadosPlanosGlobais);
      renderizarTabelaPlanos(dadosPlanosGlobais);
    }
  } catch (e) { container.innerHTML = "<p>Erro ao ligar ao servidor.</p>"; }
}

function popularDropdownsFiltro(planos) {
  const profs = [...new Set(planos.map(p => p.professor))].filter(Boolean).sort();
  const comps = [...new Set(planos.map(p => p.componente))].filter(Boolean).sort();
  const turmas = [...new Set(planos.map(p => p.turma))].filter(Boolean).sort();
  const trimestres = [...new Set(planos.map(p => p.trimestre))].filter(Boolean).sort();

  preencherSelect('filtroProf', profs, '👩‍🏫 Todos'); preencherSelect('filtroComp', comps, '📚 Todos');
  preencherSelect('filtroTurma', turmas, '🏷️ Todas'); preencherSelect('filtroTrimestre', trimestres, '⏳ Todos');
  preencherSelect('rxFiltroProf', profs, '👩‍🏫 Todos os Professores'); preencherSelect('rxFiltroComp', comps, '📚 Todos os Componentes');
  preencherSelect('rxFiltroTurma', turmas, '🏷️ Todas as Turmas'); preencherSelect('rxFiltroTrimestre', trimestres, '⏳ Todos os Trimestres');
}

function preencherSelect(id, lista, padrao) {
  const sel = document.getElementById(id); if(!sel) return;
  const valorAtual = sel.value;
  sel.innerHTML = `<option value="">${padrao}</option>` + lista.map(i => `<option value="${i}">${i}</option>`).join('');
  sel.value = valorAtual; 
}

function filtrarPlanos() {
  const tProf = document.getElementById('filtroProf').value; const tComp = document.getElementById('filtroComp').value;
  const tTurma = document.getElementById('filtroTurma').value; const tTrimestre = document.getElementById('filtroTrimestre').value;
  const tStatus = document.getElementById('filtroStatus').value;
  
  const filtrados = dadosPlanosGlobais.filter(p => {
    return (tProf === "" || p.professor === tProf) && (tComp === "" || p.componente === tComp) && 
           (tTurma === "" || p.turma === tTurma) && (tTrimestre === "" || p.trimestre === tTrimestre) &&
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
  html += `</table>`; container.innerHTML = html;
}

async function alterarStatusPlano(linha, novoStatus) {
  let feedback = "";
  if(novoStatus.includes('Devolvido')) {
    feedback = prompt("Qual o motivo da devolução? (O professor verá esta mensagem)");
    if(feedback === null) { carregarPlanosSupervisao(); return; } 
  }
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "atualizarStatus", linha: linha, novoStatus: novoStatus, feedback: feedback }) });
    const r = await res.json(); if(r.status === "sucesso") carregarPlanosSupervisao(); 
  } catch(e) { alert("Falha na ligação ao atualizar status."); }
}

async function gerarRaioX() {
  const painel = document.getElementById('painelRaioX');
  const compSelecionado = document.getElementById('rxFiltroComp').value;
  const turma = document.getElementById('rxFiltroTurma').value;
  const prof = document.getElementById('rxFiltroProf').value;
  const trim = document.getElementById('rxFiltroTrimestre').value;
  
  painel.innerHTML = "<p style='text-align:center;'>⏳ A analisar componentes curriculares e matrizes...</p>";
  
  try {
    const listaComponentes = compSelecionado ? [compSelecionado] : [
      "Língua Portuguesa", "Matemática", "Geografia", "História", 
      "Ciências", "Educação Física", "Ensino Religioso", "Arte", "Língua Inglesa"
    ];

    let htmlGeral = ""; let totalGeralMatriz = 0; let totalGeralDadas = 0;

    for (let i = 0; i < listaComponentes.length; i++) {
      let c = listaComponentes[i];
      const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "cruzarHabilidades", componente: c, turma: turma, professor: prof, trimestre: trim }) });
      const r = await res.json();
      
      if (r.status === "sucesso" && r.totalMatriz > 0) {
        const total = r.totalMatriz; const dadas = r.trabalhadas.length;
        const perc = total > 0 ? Math.round((dadas / total) * 100) : 0;
        totalGeralMatriz += total; totalGeralDadas += dadas;

        htmlGeral += `<div class="card-componente" style="background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:20px;">
                        <h4><span>📚 ${c}</span> <span style="font-size: 0.9rem; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${perc}% Concluído (${dadas}/${total})</span></h4>
                        <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; margin-bottom:15px; overflow:hidden;"><div style="width:${perc}%; background:#10b981; height:100%;"></div></div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                          <div style="background:#d1fae5; padding:15px; border-radius:10px; border:1px solid #a7f3d0; max-height:220px; overflow-y:auto;">
                            <h5 style="color:#065f46; margin:0 0 10px 0; font-size:0.95rem;">✅ Habilidades Dadas</h5>
                            <ul style="padding-left:18px; margin:0; font-size:0.85rem; color:#064e3b;">`;
        r.trabalhadas.forEach(h => htmlGeral += `<li style="margin-bottom:8px; line-height:1.4;">${h.habilidade.replace(`[${c}]`, '')} <br><small style="color:#047857; font-weight:600;">(Prof. ${h.professor})</small></li>`);
        if(r.trabalhadas.length === 0) htmlGeral += "<li style='color:#065f46;'>Nenhuma habilidade registada.</li>";
        htmlGeral += `</ul></div>
                          <div style="background:#fef3c7; padding:15px; border-radius:10px; border:1px solid #fde68a; max-height:220px; overflow-y:auto;">
                            <h5 style="color:#92400e; margin:0 0 10px 0; font-size:0.95rem;">⚠️ Faltam Ensinar</h5>
                            <ul style="padding-left:18px; margin:0; font-size:0.85rem; color:#78350f;">`;
        r.pendentes.forEach(h => htmlGeral += `<li style="margin-bottom:8px; line-height:1.4;">${h.habilidade.replace(`[${c}]`, '')}</li>`);
        if(r.pendentes.length === 0) htmlGeral += "<li style='color:#92400e; font-weight:600;'>Parabéns! Matriz completa neste componente! 🎉</li>";
        htmlGeral += `</ul></div></div></div>`;
      }
    }

    if(htmlGeral === "") { painel.innerHTML = "<p style='text-align:center; padding:20px; color:#64748b;'>Nenhum dado encontrado para os filtros selecionados.</p>"; return; }

    const percGeral = totalGeralMatriz > 0 ? Math.round((totalGeralDadas / totalGeralMatriz) * 100) : 0;
    const rotuloFiltro = (turma ? turma : "Geral da Escola") + (compSelecionado ? " | " + compSelecionado : " | Todas as Disciplinas");
    let painelResumoTopo = `<div style="background:#ffffff; padding:20px; border-radius:14px; border:1px solid #e2e8f0; text-align:center; margin-bottom:25px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                              <h2 style="margin:0; color:#1e3a8a; font-size:1.8rem;">${percGeral}% Concluído Geral</h2>
                              <p style="color:#64748b; margin:5px 0 12px 0; font-size:0.95rem; font-weight:600;">${totalGeralDadas} de ${totalGeralMatriz} habilidades trabalhadas (${rotuloFiltro})</p>
                              <div style="width:100%; background:#e2e8f0; height:10px; border-radius:5px; overflow:hidden;"><div style="width:${percGeral}%; background:#10b981; height:100%;"></div></div>
                            </div>`;
    painel.innerHTML = painelResumoTopo + htmlGeral;
  } catch(e) { painel.innerHTML = "<p style='text-align:center; color:#ef4444;'>Erro ao gerar o Raio-X.</p>"; }
}

async function gerarRelatorio() {
  const btn = document.getElementById('btnGerarRelatorio');
  const areaLink = document.getElementById('areaLinkRelatorio');
  const periodo = document.getElementById('tipoRelatorio').value;
  btn.innerText = "⏳ Auditando Matrizes e a Gerar Documento...";
  btn.disabled = true; areaLink.style.display = "none";

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "gerarRelatorioExecutivo", periodo: periodo }) });
    const r = await res.json();
    if(r.status === "sucesso") {
      alert("✅ Relatório Avançado concluído!"); btn.innerText = "📑 Gerar Novo Documento"; btn.disabled = false;
      areaLink.style.display = "block";
      areaLink.innerHTML = `<a href="${r.url}" target="_blank" style="display:block; padding:15px; background:#10b981; color:white; text-decoration:none; border-radius:10px; font-weight:bold; font-size:1.1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">📄 CLIQUE AQUI PARA ABRIR O RELATÓRIO</a>`;
    } else { alert("⚠️ Erro: " + r.mensagem); btn.innerText = "📑 Gerar Documento Oficial"; btn.disabled = false; }
  } catch(e) { alert("Erro de comunicação."); btn.innerText = "📑 Gerar Documento Oficial"; btn.disabled = false; }
}

async function forcarBackup() {
  const btn = document.getElementById('btnBackup'); btn.innerText = "⏳ A extrair dados..."; btn.disabled = true;
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "forcarBackup" }) }); const r = await res.json(); alert("✅ " + r.mensagem); } 
  catch(e) { alert("Erro."); } finally { btn.innerText = "📦 Enviar Backup para meu E-mail"; btn.disabled = false; }
}

// ==========================================
// O ESPELHO DA PLANILHA (RASTREIO)
// ==========================================
async function carregarMatrizesSalvas() {
  const divAbas = document.getElementById('abasPlanilhaVirtual');
  const divConteudo = document.getElementById('conteudoPlanilhaVirtual');
  if(!divAbas) return;
  
  divAbas.innerHTML = "<span style='color:#64748b; font-size:0.9rem;'>⏳ Lendo banco de dados...</span>";
  divConteudo.innerHTML = "";
  
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarMatrizesExtraidas" }) });
    const r = await res.json();
    
    if (r.status === "sucesso") {
      dadosEspelhoGlobal = {};
      r.registros.forEach(item => {
        if(!dadosEspelhoGlobal[item.componente]) dadosEspelhoGlobal[item.componente] = {};
        if(!dadosEspelhoGlobal[item.componente][item.ano]) dadosEspelhoGlobal[item.componente][item.ano] = [];
        if(!dadosEspelhoGlobal[item.componente][item.ano].includes(item.trimestre)) {
          dadosEspelhoGlobal[item.componente][item.ano].push(item.trimestre);
        }
      });

      const componentes = Object.keys(dadosEspelhoGlobal).sort();
      if(componentes.length === 0) {
        divAbas.innerHTML = "<span style='color:#ef4444; font-size:0.9rem;'>O banco de dados está vazio. Nenhuma matriz encontrada.</span>";
        return;
      }

      let htmlAbas = "";
      componentes.forEach((comp, index) => {
        htmlAbas += `<button onclick="mostrarConteudoEspelho('${comp}', this)" class="btn-espelho-aba" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: ${index === 0 ? '#1e3a8a' : 'white'}; color: ${index === 0 ? 'white' : '#475569'}; border-radius: 8px; font-weight: bold; cursor: pointer; white-space: nowrap; transition: 0.2s; margin-right: 5px;">${comp}</button>`;
      });
      divAbas.innerHTML = htmlAbas;
      mostrarConteudoEspelho(componentes[0], divAbas.firstChild);
    } else { divAbas.innerHTML = "<span style='color:#ef4444;'>Erro ao ler a planilha.</span>"; }
  } catch(e) { divAbas.innerHTML = "<span style='color:#ef4444;'>Falha de conexão com o servidor.</span>"; }
}

function mostrarConteudoEspelho(componente, btnClicado) {
  document.querySelectorAll('.btn-espelho-aba').forEach(b => { b.style.background = 'white'; b.style.color = '#475569'; });
  if(btnClicado) { btnClicado.style.background = '#1e3a8a'; btnClicado.style.color = 'white'; }

  const divConteudo = document.getElementById('conteudoPlanilhaVirtual');
  const dadosAno = dadosEspelhoGlobal[componente];
  
  if(!dadosAno) { divConteudo.innerHTML = "<span style='color:#94a3b8;'>Nenhum dado registrado para esta disciplina.</span>"; return; }

  let html = "";
  const anosOrdenados = Object.keys(dadosAno).sort();
  
  anosOrdenados.forEach(ano => {
    let trimestresHtml = "";
    dadosAno[ano].sort().forEach(trim => { trimestresHtml += `<span style="background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; border: 1px solid #a7f3d0;">✅ ${trim}</span> `; });
    html += `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; width: 100%; max-width: 300px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
               <h5 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 1.05rem;">🎓 ${ano}</h5>
               <div style="display: flex; gap: 6px; flex-wrap: wrap;">${trimestresHtml}</div>
             </div>`;
  });
  divConteudo.innerHTML = html;
}

// ==========================================
// EXTRATOR LÓGICO DE MATRIZ E AS 11 COLUNAS (ALTA PRECISÃO E LIMPEZA)
// ==========================================
function atualizarLote(index, campo, valorHtml) {
  if (loteMatrizPronto[index]) {
    let textoLimpo = valorHtml.replace(/<[^>]*>?/gm, '').trim();
    loteMatrizPronto[index][campo] = textoLimpo || "-";
  }
}

function gerarPreviaMatriz() {
  let texto = document.getElementById('textoMatrizBruto').value;
  const disciplina = document.getElementById('impDisciplina').value.trim();
  const ano = document.getElementById('impAno').value.trim();
  const trimestre = document.getElementById('impTrimestre').value.trim();
  const msg = document.getElementById('msgImportacao');
  const containerPrevia = document.getElementById('containerPrevia');
  const conteudoPrevia = document.getElementById('tabelaPreviaConteudo');

  if (!texto.trim()) { alert("⚠️ Por favor, cole o texto do PDF na caixa antes de continuar."); return; }

  msg.innerText = "⚡ A fatiar e limpar cabeçalhos/rodapés com alta precisão...";
  loteMatrizPronto = [];
  containerPrevia.style.display = "none";

  // 1. LIMPEZA INICIAL DO TEXTO
  texto = texto.replace(/\r?\n|\r/g, " "); // Tudo numa linha
  
  // Recria quebras de linha antes dos marcadores
  texto = texto.replace(/(UNIDADES?\s+TEMÁTICAS?|PRÁTICAS?\s+DE\s+LINGUAGEM)/gi, "\n$1");
  texto = texto.replace(/(HABILIDADES?\s+DO\s+CRMG|HABILIDADES?\s+PRIORIZADAS?(?:\s+DO\s+ANO\s+ESCOLAR)?)/gi, "\n$1");
  texto = texto.replace(/(OBJETOS?\s+DO\s+CONHECIMENTO(?:\s+DA\s+HABILIDADE\s+PRIORIZADA)?)/gi, "\n$1");
  texto = texto.replace(/(CONTEÚDOS?\s+RELACIONADOS?)/gi, "\n$1");
  texto = texto.replace(/(EXEMPLOS?\s+DE\s+PRÁTICAS?\s*PEDAGÓGICAS?|PRÁTICAS?\s*PEDAGÓGICAS?)/gi, "\n$1");
  texto = texto.replace(/(EVIDÊNCIAS?\s+DE\s+CONSOLIDAÇÃO(?:\s*(?:DA|DE)\s*APRENDIZAGEM)?)/gi, "\n$1");

  // 2. MARCADORES DEFINITIVOS
  texto = texto.replace(/(?:UNIDADES?\s+TEMÁTICAS?|PRÁTICAS?\s+DE\s+LINGUAGEM)/gi, "___UNIDADE___");
  texto = texto.replace(/(?:GÊNEROS?\s+TEXTUAIS?|GÊNERO\s+TEXTUAL)/gi, "___GENERO___");
  texto = texto.replace(/(?:HABILIDADES?\s+DO\s+CRMG|HABILIDADES?\s+PRIORIZADAS?(?:\s+DO\s+ANO\s+ESCOLAR)?)/gi, "___HAB_PRIORIZADAS___");
  texto = texto.replace(/(?:HABILIDADES?\s+DE\s+RECOMPOSIÇÃO(?:\s+DAS\s+APRENDIZAGENS)?|HABILIDADE\s+SOCIOEMOCIONAL\s*:\s*PROJETO\s+DE\s+VIDA|HABILIDADES?\s+SOCIOEMOCIONA(?:IS|L))/gi, "___HAB_RECOMPOSICAO___");
  texto = texto.replace(/(?:HABILIDADES?\s+DE\s+SUPORTE)/gi, "___HAB_SUPORTE___");
  texto = texto.replace(/(?:OBJETOS?\s+DO\s+CONHECIMENTO(?:\s+DA\s+HABILIDADE\s+PRIORIZADA)?)/gi, "___OBJETOS___");
  texto = texto.replace(/(?:CONTEÚDOS?\s+RELACIONADOS?)/gi, "___CONTEUDOS___");
  texto = texto.replace(/(?:EXEMPLOS?\s+DE\s+PRÁTICAS?\s*PEDAGÓGICAS?|PRÁTICAS?\s*PEDAGÓGICAS?)/gi, "___PRATICAS___");
  texto = texto.replace(/(?:EVIDÊNCIAS?\s+DE\s+CONSOLIDAÇÃO(?:\s*(?:DA|DE)\s*APRENDIZAGEM)?)/gi, "___EVIDENCIAS___");

  // O NOVO FILTRO ANTI-LIXO EXTREMO (A Tesoura Afiada)
  const limparLixoDoPDF = (txt) => {
    if (!txt || txt === "-") return "-";
    
    let limpo = txt;

    // A. DESTRÓI RODAPÉS COMPLETOS (Apanha desde números de página, "ANOS FINAIS", até "Trimestre")
    limpo = limpo.replace(/-\s*ANOS\s+FINAIS[\s\S]*?\dº\s*Trimestre/gi, "");
    limpo = limpo.replace(/\d*\s*PLANO\s+DE\s+CURSO[\s\S]*?(?:Ensino\s+Fundamental|Ensino\s+Médio)/gi, "");
    limpo = limpo.replace(/Etapa\s+de\s+Ensino:\s*Ensino\s+Fundamental/gi, "");
    limpo = limpo.replace(/Área\s+de\s+Conhecimento:[\s\S]*?Ano\s+de\s+Escolaridade:/gi, "");
    
    // B. DESTRÓI CABEÇALHOS PERDIDOS
    const regexCabeçalho = new RegExp("\\d*\\s*" + disciplina + "\\s*-\\s*\\dº\\s*Trimestre", "gi");
    limpo = limpo.replace(regexCabeçalho, "");

    // C. LIMPEZA DE PONTAS
    limpo = limpo.replace(/^[:\-\•\◦]\s*/, ""); 
    limpo = limpo.replace(/\s+\d+\s*$/, ""); 

    return limpo.trim() || "-";
  };

  const blocosUnidade = texto.split("___UNIDADE___").filter(b => b.trim() !== "");

  for (let i = 0; i < blocosUnidade.length; i++) {
    let blocoStr = "___UNIDADE___" + blocosUnidade[i]; 

    const extrairComum = (marcador, blocoTexto) => {
        const regex = new RegExp(marcador + "([\\s\\S]*?)(?=___|$)", "i");
        const match = blocoTexto.match(regex);
        return match ? limparLixoDoPDF(match[1]) : "-";
    };

    const unidade = extrairComum("___UNIDADE___", blocoStr);
    const genero = extrairComum("___GENERO___", blocoStr);
    const habRec = extrairComum("___HAB_RECOMPOSICAO___", blocoStr);
    const habSup = extrairComum("___HAB_SUPORTE___", blocoStr);
    const objetos = extrairComum("___OBJETOS___", blocoStr);
    const conteudos = extrairComum("___CONTEUDOS___", blocoStr);
    const praticas = extrairComum("___PRATICAS___", blocoStr);
    const evidencias = extrairComum("___EVIDENCIAS___", blocoStr);

    const regexBlocoHabs = /___HAB_PRIORIZADAS___([\s\S]*?)(?=___|$)/i;
    const matchBlocoHabs = blocoStr.match(regexBlocoHabs);
    
    let habilidadesLista = [];
    if (matchBlocoHabs && matchBlocoHabs[1].trim() !== "") {
        let textoHabs = limparLixoDoPDF(matchBlocoHabs[1]);
        const regexSeparador = /(?=\([A-Z0-9]+\))/gi; 
        
        let habsIndividuais = textoHabs.split(regexSeparador);
        
        if (habsIndividuais.length <= 1) {
             habsIndividuais = textoHabs.split(/(?=\([A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{2,}\))/i);
             if (habsIndividuais.length <= 1) habsIndividuais = [textoHabs]; 
        }

        habsIndividuais.forEach(hab => {
            let habLimpa = limparLixoDoPDF(hab);
            if (habLimpa !== "-" && habLimpa.length > 5) habilidadesLista.push(habLimpa);
        });
    } else {
        habilidadesLista.push("-");
    }

    habilidadesLista.forEach(habPrioritada => {
        if (unidade !== "-" || habPrioritada !== "-") {
            loteMatrizPronto.push({
                disciplina: disciplina, 
                ano: ano, 
                trimestre: trimestre,
                unidade: unidade, 
                genero: genero, 
                habPriorizada: habPrioritada,
                habRecomposicao: habRec, 
                habSuporte: habSup,
                objetoConhecimento: objetos, 
                conteudosRelacionados: conteudos,
                praticas: praticas, 
                evidencias: evidencias
            });
        }
    });
  }

  if (loteMatrizPronto.length === 0) {
    msg.innerText = "⚠️ O sistema não reconheceu os títulos. Confirme se colou o texto corretamente.";
    return;
  }

  // TABELA DE PRÉVIA
  let htmlTabela = `
    <style>
      .cel-edit { border: 1px dashed transparent; padding: 4px; border-radius: 4px; cursor: text; transition: 0.2s; min-height: 20px; font-size:0.8rem; }
      .cel-edit:hover { border-color: #94a3b8; background-color: #f8fafc; }
      .cel-edit:focus { border-color: #3b82f6; background-color: #eff6ff; outline: none; }
      .instrucao-edit { background: #fef3c7; color: #92400e; padding: 10px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 10px; font-weight: bold; border: 1px solid #fde68a;}
      .col-header { padding:8px; text-align:left; font-size:0.8rem; border-right: 1px solid rgba(255,255,255,0.2); }
    </style>
    
    <div class="instrucao-edit">💡 Verifique as 11 colunas abaixo. Cada habilidade foi separada numa linha e o "lixo" do PDF foi cortado!</div>
    
    <div style="overflow-x: auto; padding-bottom: 10px; max-height: 500px;">
    <table style="width:100%; min-width:2400px; border-collapse: collapse; border: 1px solid #cbd5e1;">
      <tr style="background-color:#1e3a8a; color:white; position: sticky; top: 0; z-index: 10;">
        <th class="col-header" style="width:2%;">#</th>
        <th class="col-header" style="width:5%;">1. Ano</th>
        <th class="col-header" style="width:6%;">2. Trimestre</th>
        <th class="col-header" style="width:10%;">3. Unidade Temática</th>
        <th class="col-header" style="width:8%;">4. Gênero Textual</th>
        <th class="col-header" style="width:15%;">5. Habilidade Priorizada</th>
        <th class="col-header" style="width:10%;">6. Hab. Recomposição</th>
        <th class="col-header" style="width:10%;">7. Hab. Suporte</th>
        <th class="col-header" style="width:12%;">8. Objetos do Conhec.</th>
        <th class="col-header" style="width:12%;">9. Conteúdos Relacionados</th>
        <th class="col-header" style="width:8%;">10. Práticas Pedag.</th>
        <th class="col-header" style="width:8%;">11. Evidências</th>
      </tr>`;
  
  loteMatrizPronto.forEach((item, index) => {
    let bgLine = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    htmlTabela += `<tr style="border-bottom: 1px solid #e2e8f0; background: ${bgLine};">
                    <td style="vertical-align:top; padding:8px; font-size:0.8rem; color:#64748b; font-weight:bold;">${index + 1}</td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'ano', this.innerHTML)" class="cel-edit" style="font-weight:bold; color:#475569;">${item.ano}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'trimestre', this.innerHTML)" class="cel-edit" style="font-weight:bold; color:#475569;">${item.trimestre}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'unidade', this.innerHTML)" class="cel-edit" style="font-weight:bold; color:#1e293b;">${item.unidade}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'genero', this.innerHTML)" class="cel-edit">${item.genero}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'habPriorizada', this.innerHTML)" class="cel-edit" style="color:#2563eb; font-weight:bold;">${item.habPriorizada}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'habRecomposicao', this.innerHTML)" class="cel-edit">${item.habRecomposicao}</div>
                    </td>

                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'habSuporte', this.innerHTML)" class="cel-edit">${item.habSuporte}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'objetoConhecimento', this.innerHTML)" class="cel-edit" style="color:#0f766e;">${item.objetoConhecimento}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'conteudosRelacionados', this.innerHTML)" class="cel-edit" style="color:#0369a1;">${item.conteudosRelacionados}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'praticas', this.innerHTML)" class="cel-edit" style="color:#15803d;">${item.praticas}</div>
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'evidencias', this.innerHTML)" class="cel-edit" style="color:#b45309; font-style:italic;">${item.evidencias}</div>
                    </td>
                   </tr>`;
  });
  htmlTabela += `</table></div>`;

  conteudoPrevia.innerHTML = htmlTabela;
  containerPrevia.style.display = "block";
  msg.innerText = `✅ Extração Refinada: ${loteMatrizPronto.length} habilidades processadas!`;
}

async function enviarLoteConfirmado() {
  if (loteMatrizPronto.length === 0) { alert("⚠️ Nenhuma habilidade na prévia para enviar."); return; }
  
  const btnEnvio = document.getElementById('btnEnviarOficial');
  const msg = document.getElementById('msgImportacao');
  btnEnvio.innerText = "⏳ A gravar nas 11 colunas da Planilha Oficial...";
  btnEnvio.disabled = true;

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarLoteMatriz", itens: loteMatrizPronto }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      msg.innerText = "✅ " + r.mensagem;
      document.getElementById('textoMatrizBruto').value = "";
      document.getElementById('containerPrevia').style.display = "none";
      loteMatrizPronto = [];
      
      // Atualiza o espelho para você ver que já entrou no banco de dados
      carregarMatrizesSalvas();
    } else {
      msg.innerText = "⚠️ Erro ao guardar: " + r.mensagem;
    }
  } catch (e) {
    msg.innerText = "⚠️ Erro de comunicação com o servidor Google Apps Script.";
  } finally {
    btnEnvio.innerText = "🚀 Tudo certo! Enviar para a Planilha Oficial";
    btnEnvio.disabled = false;
  }
}
