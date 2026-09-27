const URL_API = "https://script.google.com/macros/s/AKfycbzrbfJgz-TSiyWftvEDXH4ZsxZBAYamozeYho2f4KH1T7ZnjBWdwVobHqirP0bDnGMj/exec";

// ==========================================
// CONTROLE DE ABAS E LOGIN
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

  if (!usuario || !senha) { msg.innerText = "Preencha utilizador e senha."; return; }

  msg.innerText = "⏳ A Autenticar Especialista...";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "login", usuario, senha }) });
    const r = await res.json();

    if (r.status === "sucesso") {
      if (r.perfil !== "Especialista") {
        msg.innerText = "Acesso Negado: Área restrita à equipa de Gestão.";
        return;
      }
      document.getElementById('telaLogin').style.display = 'none';
      
      const headerBoasVindas = document.getElementById('infoUsuarioBoasVindas');
      headerBoasVindas.style.display = 'inline-block';
      headerBoasVindas.innerText = `👋 Gestor Logado: ${r.nome}`;

      carregarPlanosSupervisao();
    } else {
      msg.innerText = r.mensagem || "Utilizador ou senha incorretos.";
    }
  } catch (e) {
    msg.innerText = "⚠️ Erro de ligação com o servidor.";
  }
}

function sairDoSistema() {
  document.getElementById('loginSenha').value = ""; 
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('infoUsuarioBoasVindas').style.display = 'none';
  mudarAba('abaSupervisao', document.querySelector('.tabs button')); 
}

// ==========================================
// ABA 1: SUPERVISÃO, ABA 2: UTILIZADORES E ABA 3: RELATÓRIOS
// ==========================================
async function carregarPlanosSupervisao() {
  const container = document.getElementById('tabelaPlanosContainer');
  container.innerHTML = "<p>⏳ A procurar planos de aula recentes...</p>";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarSupervisao" }) });
    const r = await res.json();
    if (r.status === "sucesso" && r.registros && r.registros.length > 0) {
      let html = `<table><tr><th>Data / Professor</th><th>Turma & Componente</th><th>Links (Acesso Restrito)</th><th>Estado Pedagógico</th></tr>`;
      r.registros.reverse().forEach(p => {
        let corStatus = p.status.includes('Aprovado') ? '#10b981' : (p.status.includes('Devolvido') ? '#ef4444' : '#f59e0b');
        html += `<tr>
                  <td><strong>${p.data}</strong><br><span style="color:#475569; font-size:0.9rem;">${p.professor}</span></td>
                  <td><strong>${p.componente}</strong><br><span style="color:#64748b; font-size:0.85rem;">${p.turma} (${p.trimestre || '-'})</span></td>
                  <td><a href="${p.docUrl}" target="_blank" style="text-decoration:none; color:#2563eb; font-weight:bold; display:block; margin-bottom:5px;">📄 Abrir Plano (Doc)</a><a href="${p.pastaUrl}" target="_blank" style="text-decoration:none; color:#d97706; font-weight:bold; font-size:0.85rem;">📁 Pasta Evidências</a></td>
                  <td><select onchange="alterarStatusPlano(${p.linha}, this.value)" style="padding:6px; font-weight:bold; border:2px solid ${corStatus}; color:${corStatus}; border-radius:8px; width:100%;">
                      <option value="🟡 Pendente" ${p.status.includes('Pendente') ? 'selected' : ''}>🟡 Pendente</option>
                      <option value="✅ Aprovado" ${p.status.includes('Aprovado') ? 'selected' : ''}>✅ Aprovado</option>
                      <option value="🔴 Devolvido p/ Ajuste" ${p.status.includes('Devolvido') ? 'selected' : ''}>🔴 Devolvido p/ Ajuste</option>
                    </select></td>
                 </tr>`;
      });
      html += `</table>`; container.innerHTML = html;
    } else { container.innerHTML = "<p>Nenhum plano foi enviado para a supervisão ainda.</p>"; }
  } catch (e) { container.innerHTML = "<p>Erro ao conectar com a base de dados.</p>"; }
}

async function alterarStatusPlano(linha, novoStatus) {
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "atualizarStatus", linha: linha, novoStatus: novoStatus }) });
  const r = await res.json(); if(r.status !== "sucesso") alert("Erro ao atualizar o estado.");
  } catch(e) { alert("Falha na ligação ao atualizar estado."); }
}

async function carregarListaUsuarios() {
  const container = document.getElementById('tabelaUsuariosContainer');
  container.innerHTML = "<p>⏳ A carregar base de utilizadores...</p>";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarUsuarios" }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      let html = `<table><tr><th>Nome / E-mail</th><th>Perfil</th><th>Acesso (Senha)</th><th>Ação</th></tr>`;
      r.usuarios.forEach(u => {
        let emailDisplay = (u.email && u.email !== "undefined") ? u.email : "Sem e-mail (Link Público)";
        html += `<tr><td><strong>${u.nome}</strong><br><span style="font-size:0.8rem; color:#64748b;">${emailDisplay}</span></td><td>${u.perfil}</td><td><span style="background:#e2e8f0; padding:4px 8px; border-radius:6px; font-family:monospace;">${u.senha}</span></td><td><button onclick="editarUsuario(${u.linha}, '${u.nome}', '${u.email}', '${u.senha}', '${u.perfil}', '${u.componentes}', '${u.turmas}')" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Editar</button></td></tr>`;
      });
      html += `</table>`; container.innerHTML = html;
    }
  } catch(e) { container.innerHTML = "<p>Erro ao carregar lista de utilizadores.</p>"; }
}

async function salvarUsuario() {
  const dados = { linha: document.getElementById('usuarioLinha').value, nome: document.getElementById('cadNome').value, email: document.getElementById('cadEmail').value, senha: document.getElementById('cadSenha').value, perfil: document.getElementById('cadPerfil').value, componentes: document.getElementById('cadComponentes').value, turmas: document.getElementById('cadTurmas').value };
  if(!dados.nome || !dados.senha) { alert("⚠️ Nome e Senha são obrigatórios."); return; }
  const btn = document.querySelector('button[onclick="salvarUsuario()"]'); btn.innerText = "⏳ A Guardar..."; btn.disabled = true;
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarUsuario", usuarioData: dados }) }); const r = await res.json(); alert("✅ " + r.mensagem); limparFormUsuario(); carregarListaUsuarios(); } catch(e) { alert("⚠️ Erro ao guardar utilizador."); } finally { btn.innerText = "💾 Salvar / Atualizar Usuário"; btn.disabled = false; }
}

function editarUsuario(linha, nome, email, senha, perfil, componentes, turmas) {
  document.getElementById('usuarioLinha').value = linha; document.getElementById('cadNome').value = nome; document.getElementById('cadEmail').value = (email !== "undefined" && email !== "null") ? email : ""; document.getElementById('cadSenha').value = senha; document.getElementById('cadPerfil').value = perfil; document.getElementById('cadComponentes').value = (componentes !== "undefined" && componentes !== "null") ? componentes : ""; document.getElementById('cadTurmas').value = (turmas !== "undefined" && turmas !== "null") ? turmas : ""; window.scrollTo({ top: 0, behavior: 'smooth' });
}
function limparFormUsuario() { document.getElementById('usuarioLinha').value = ""; document.getElementById('cadNome').value = ""; document.getElementById('cadEmail').value = ""; document.getElementById('cadSenha').value = ""; document.getElementById('cadPerfil').value = "Professor"; document.getElementById('cadComponentes').value = ""; document.getElementById('cadTurmas').value = ""; }

async function gerarRelatorio() {
  const btn = document.getElementById('btnGerarRelatorio'); const periodo = document.getElementById('tipoRelatorio').value; btn.innerText = "⏳ A Auditar e Gerar Relatório..."; btn.disabled = true;
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "gerarRelatorioExecutivo", periodo: periodo }) }); const r = await res.json(); if(r.status === "sucesso") { alert("✅ Relatório gerado!"); window.open(r.url, '_blank'); } else { alert("⚠️ Erro: " + r.mensagem); } } catch(e) { alert("Erro de comunicação ao gerar relatório."); } finally { btn.innerText = "📑 Gerar Documento PDF/Word"; btn.disabled = false; }
}

async function forcarBackup() {
  const btn = document.getElementById('btnBackup'); btn.innerText = "⏳ A Extrair dados (Aguarde)..."; btn.disabled = true;
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "forcarBackup" }) }); const r = await res.json(); alert("✅ " + r.mensagem); } catch(e) { alert("Erro ao solicitar o backup."); } finally { btn.innerText = "📦 Enviar Backup para o meu E-mail"; btn.disabled = false; }
}


// ==========================================
// ABA 4: EXTRAÇÃO CURRICULAR (ESPELHO VISUAL)
// ==========================================
let dadosEspelhoGlobal = {};

async function carregarMatrizesSalvas() {
  const divAbas = document.getElementById('abasPlanilhaVirtual');
  const divConteudo = document.getElementById('conteudoPlanilhaVirtual');
  
  divAbas.innerHTML = "<span style='color:#64748b; font-size:0.9rem;'>⏳ A ler a base de dados...</span>";
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
        divAbas.innerHTML = "<span style='color:#ef4444; font-size:0.9rem;'>A base de dados está limpa. Nenhuma matriz encontrada.</span>";
        return;
      }

      let htmlAbas = "";
      componentes.forEach((comp, index) => {
        htmlAbas += `<button onclick="mostrarConteudoEspelho('${comp}', this)" class="btn-espelho-aba" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: ${index === 0 ? '#1e3a8a' : 'white'}; color: ${index === 0 ? 'white' : '#475569'}; border-radius: 8px; font-weight: bold; cursor: pointer; white-space: nowrap; transition: 0.2s;">${comp}</button>`;
      });
      divAbas.innerHTML = htmlAbas;

      mostrarConteudoEspelho(componentes[0], divAbas.firstChild);
    } else {
      divAbas.innerHTML = "<span style='color:#ef4444;'>Erro ao ler a grelha.</span>";
    }
  } catch(e) {
    divAbas.innerHTML = "<span style='color:#ef4444;'>Falha de ligação com o servidor.</span>";
  }
}

function mostrarConteudoEspelho(componente, btnClicado) {
  document.querySelectorAll('.btn-espelho-aba').forEach(b => {
    b.style.background = 'white'; b.style.color = '#475569';
  });
  if(btnClicado) { btnClicado.style.background = '#1e3a8a'; btnClicado.style.color = 'white'; }

  const divConteudo = document.getElementById('conteudoPlanilhaVirtual');
  const dadosAno = dadosEspelhoGlobal[componente];
  
  if(!dadosAno) {
    divConteudo.innerHTML = "<span style='color:#94a3b8;'>Nenhum registo efetuado para esta disciplina.</span>";
    return;
  }

  let html = "";
  const anosOrdenados = Object.keys(dadosAno).sort();
  
  anosOrdenados.forEach(ano => {
    let trimestresHtml = "";
    dadosAno[ano].sort().forEach(trim => {
      trimestresHtml += `<span style="background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; border: 1px solid #a7f3d0;">✅ ${trim}</span> `;
    });
    
    html += `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; width: 100%; max-width: 300px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
               <h5 style="margin: 0 0 10px 0; color: #1e3a8a; font-size: 1.05rem;">🎓 ${ano}</h5>
               <div style="display: flex; gap: 6px; flex-wrap: wrap;">${trimestresHtml}</div>
             </div>`;
  });
  divConteudo.innerHTML = html;
}

// ==========================================
// ABA 4: FATIADOR DINÂMICO E PRÉVIA EDITÁVEL
// ==========================================

function extrairPadroesCRMG(textoBruto, disciplina) {
    const linhas = textoBruto.split('\n').map(l => l.trim()).filter(l => l);
    let resultados = [];

    const criarItemVazio = () => ({
        unidade: "-", genero: "-", habPriorizada: "-", habRecomposicao: "-", habSuporte: "-",
        objetoConhecimento: "-", conteudosRelacionados: "-", praticas: "-", evidencias: "-"
    });

    let itemAtual = criarItemVazio();
    let campoAtual = "";

    // Expressões regulares dinâmicas para abranger as diferentes disciplinas (Plural e Singular)
    let regexUnidade = /^(UNIDADES? TEM[AÁ]TICAS?|EIXOS? TEM[AÁ]TICOS?)/i;
    let regexObjeto = /^(OBJETOS? D[EO] CONHECIMENTO)/i;
    let regexHab = /^(HABILIDADES? PRIORIZADAS?|HABILIDADES? DO CRMG|HABILIDADES?)/i;
    let regexRecomposicao = /^(HABILIDADES? DE RECOMPOSIÇÃO|RECOMPOSIÇÃO)/i;
    let regexSuporte = /^(HABILIDADES? DE SUPORTE|SUPORTE)/i;
    let regexConteudo = /^(CONTE[UÚ]DOS? RELACIONADOS?|CONTE[UÚ]DOS?)/i;

    // Ajuste fino consoante o componente selecionado
    if (disciplina === "Língua Portuguesa" || disciplina === "Língua Inglesa") {
        regexUnidade = /^(PR[AÁ]TICAS? DE LINGUAGEM|EIXOS?)/i;
    } else if (disciplina === "Ensino Religioso") {
        regexRecomposicao = /^(COMPETÊNCIAS? SOCIOEMOCIONAIS|SOCIOEMOCIONAIS)/i;
    }

    for (let i = 0; i < linhas.length; i++) {
        let linha = linhas[i];
        let processoFeito = false;

        // Função que retira a palavra-chave e captura o texto que ficou na mesma linha
        const extrairTextoNaMesmaLinha = (regex) => linha.replace(regex, "").replace(/^[:\-]\s*/, "").trim();

        if (regexUnidade.test(linha)) {
            if (itemAtual.habPriorizada !== "-" || (itemAtual.unidade !== "-" && itemAtual.unidade !== extrairTextoNaMesmaLinha(regexUnidade))) {
                resultados.push({...itemAtual});
                itemAtual = criarItemVazio();
            }
            campoAtual = "unidade";
            let restoLinha = extrairTextoNaMesmaLinha(regexUnidade);
            if (restoLinha) itemAtual.unidade = restoLinha;
            processoFeito = true;
        }
        else if (regexRecomposicao.test(linha)) {
            campoAtual = "habRecomposicao";
            let restoLinha = extrairTextoNaMesmaLinha(regexRecomposicao);
            if (restoLinha) itemAtual.habRecomposicao = restoLinha;
            processoFeito = true;
        }
        else if (regexSuporte.test(linha)) {
            campoAtual = "habSuporte";
            let restoLinha = extrairTextoNaMesmaLinha(regexSuporte);
            if (restoLinha) itemAtual.habSuporte = restoLinha;
            processoFeito = true;
        }
        else if (regexConteudo.test(linha)) {
            campoAtual = "conteudosRelacionados";
            let restoLinha = extrairTextoNaMesmaLinha(regexConteudo);
            if (restoLinha) itemAtual.conteudosRelacionados = restoLinha;
            processoFeito = true;
        }
        else if (regexObjeto.test(linha)) {
            campoAtual = "objetoConhecimento";
            let restoLinha = extrairTextoNaMesmaLinha(regexObjeto);
            if (restoLinha) itemAtual.objetoConhecimento = restoLinha;
            processoFeito = true;
        }
        else if (regexHab.test(linha)) {
            // Se já temos uma habilidade preenchida neste bloco, empurra para a lista, 
            // mas HERDA a unidade temática e o objeto de conhecimento (muito comum ter várias habilidades por unidade)
            if (itemAtual.habPriorizada !== "-") {
                resultados.push({...itemAtual});
                let unidadeHerdada = itemAtual.unidade;
                let objetoHerdado = itemAtual.objetoConhecimento;
                itemAtual = criarItemVazio();
                itemAtual.unidade = unidadeHerdada;
                itemAtual.objetoConhecimento = objetoHerdado;
            }
            campoAtual = "habPriorizada";
            let restoLinha = extrairTextoNaMesmaLinha(regexHab);
            if (restoLinha) itemAtual.habPriorizada = restoLinha;
            processoFeito = true;
        }

        // Se a linha não tem nenhuma palavra-chave no início, é a continuação do texto anterior
        if (!processoFeito && campoAtual !== "") {
            let textoLimpo = linha.replace(/^[\-\•\◦]\s*/, "");
            if (itemAtual[campoAtual] === "-") {
                itemAtual[campoAtual] = textoLimpo;
            } else {
                itemAtual[campoAtual] += " " + textoLimpo;
            }
        }
    }

    if (itemAtual.unidade !== "-" || itemAtual.habPriorizada !== "-") {
        resultados.push(itemAtual);
    }
    return resultados;
}

function gerarPreviaMatrizRegex() {
  const textoBruto = document.getElementById('textoMatrizBruto').value;
  const disciplina = document.getElementById('impDisciplina').value;
  
  if (!textoBruto.trim()) { alert("⚠️ Cole o texto copiado do PDF na caixa antes de continuar."); return; }

  // Envia a disciplina para o fatiador saber que palavras-chave procurar
  const lotes = extrairPadroesCRMG(textoBruto, disciplina);

  if (lotes.length === 0) {
      alert("⚠️ O sistema não encontrou a palavra 'HABILIDADES' no texto. Verifique se copiou a grelha corretamente.");
      return;
  }

  let htmlTabela = `<div style="overflow-x: auto; padding-bottom: 10px;">
    <table style="font-size:0.85rem; width:100%; min-width:1300px; border-collapse: collapse; border: 1px solid #cbd5e1;">
      <tr style="background-color:#1e3a8a; color:white;">
        <th style="padding:10px; width:3%;">#</th>
        <th style="padding:10px; width:15%;">Unidade Temática (Clicar p/ editar)</th>
        <th style="padding:10px; width:20%;">Habilidade Priorizada</th>
        <th style="padding:10px; width:20%;">Objeto do Conhecimento</th>
        <th style="padding:10px; width:17%;">Recomposição/Conteúdos</th>
        <th style="padding:10px; width:25%;">Práticas & Evidências</th>
      </tr>`;
  
  lotes.forEach((item, index) => {
    let bgLine = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    let campoMisto = (disciplina === "Matemática" || disciplina === "Língua Portuguesa" || disciplina === "Ensino Religioso") 
                     ? item.habRecomposicao 
                     : item.conteudosRelacionados;

    htmlTabela += `<tr class="linha-previa" style="border-bottom: 1px solid #e2e8f0; background: ${bgLine};">
                    <td style="padding:10px; font-weight:bold; color:#64748b;">${index + 1}</td>
                    <td contenteditable="true" class="edit-unidade" style="padding:10px; font-weight:bold; color:#0f172a;">${item.unidade}</td>
                    <td contenteditable="true" class="edit-hab" style="padding:10px; font-weight:bold; color:#1d4ed8;">${item.habPriorizada}</td>
                    <td contenteditable="true" class="edit-obj" style="padding:10px;">${item.objetoConhecimento}</td>
                    <td contenteditable="true" class="edit-misto" style="padding:10px; color:#b45309;">${campoMisto}</td>
                    <td contenteditable="true" class="edit-praticas" style="padding:10px; color:#15803d; font-style:italic;">-</td>
                   </tr>`;
  });
  htmlTabela += `</table></div>`;

  document.getElementById('tabelaPreviaConteudo').innerHTML = htmlTabela;
  document.getElementById('containerPrevia').style.display = "block";
}

async function enviarLoteConfirmado() {
  const disciplina = document.getElementById('impDisciplina').value;
  const ano = document.getElementById('impAno').value;
  const trimestre = document.getElementById('impTrimestre').value;
  
  const linhas = document.querySelectorAll('.linha-previa');
  if (linhas.length === 0) { alert("Nenhuma linha para enviar."); return; }
  
  const btn = document.getElementById('btnEnviarOficial');
  btn.innerText = "⏳ A empacotar edições e guardar na Base de Dados...";
  btn.disabled = true;

  let itensProntos = [];
  linhas.forEach(tr => {
      let isMatPortRel = (disciplina === "Matemática" || disciplina === "Língua Portuguesa" || disciplina === "Ensino Religioso");
      let valMisto = tr.querySelector('.edit-misto').innerText.trim() || "-";
      
      let itemFinal = {
          disciplina: disciplina,
          ano: ano,
          trimestre: trimestre,
          unidade: tr.querySelector('.edit-unidade').innerText.trim() || "-",
          genero: "-",
          habPriorizada: tr.querySelector('.edit-hab').innerText.trim() || "-",
          objetoConhecimento: tr.querySelector('.edit-obj').innerText.trim() || "-",
          habRecomposicao: isMatPortRel ? valMisto : "-",
          habSuporte: "-",
          conteudosRelacionados: isMatPortRel ? "-" : valMisto,
          praticas: tr.querySelector('.edit-praticas').innerText.trim() || "-",
          evidencias: "-"
      };
      itensProntos.push(itemFinal);
  });

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarLoteMatriz", itens: itensProntos }) });
    const r = await res.json();
    
    alert("✅ " + r.mensagem);
    
    // Limpa o ecrã
    document.getElementById('textoMatrizBruto').value = "";
    document.getElementById('containerPrevia').style.display = "none";
    
    // Atualiza o espelho visual imediatamente!
    carregarMatrizesSalvas(); 
    
  } catch(e) {
    alert("⚠️ Falha de ligação ao enviar para a base de dados.");
  } finally {
    btn.innerText = "🚀 Tudo certo! Salvar Matriz no Banco";
    btn.disabled = false;
  }
}
