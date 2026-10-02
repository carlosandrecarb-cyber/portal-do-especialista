// [ 🔴 ATENÇÃO: COLOQUE AQUI O SEU LINK DO APPS SCRIPT GERADO NO PASSO 1 ]
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
        
        const headerBoasVindas = document.getElementById('infoUsuarioBoasVindas');
        headerBoasVindas.style.display = 'inline-block';
        headerBoasVindas.innerText = `👋 Gestor Logado: ${r.nome}`;
        
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
// ABA 1: SUPERVISÃO DE PLANOS RECEBIDOS
// ==========================================
async function carregarPlanosSupervisao() {
  const container = document.getElementById('tabelaPlanosContainer');
  container.innerHTML = "⏳ Atualizando base de dados...";
  
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarSupervisao" }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      dadosPlanosGlobais = r.registros.reverse(); 
      preencherDropdownFiltros();
      desenharTabelaSupervisao(dadosPlanosGlobais);
    }
  } catch(e) { container.innerHTML = "Erro de conexão ao carregar planos."; }
}

function preencherDropdownFiltros() {
  const profs = new Set(), comps = new Set(), turmas = new Set(), trims = new Set();
  dadosPlanosGlobais.forEach(p => {
    profs.add(p.professor); comps.add(p.componente); turmas.add(p.turma); trims.add(p.trimestre);
  });
  
  const pop = (id, label, set) => {
    let el = document.getElementById(id);
    el.innerHTML = `<option value="">${label}</option>`;
    [...set].sort().forEach(i => el.innerHTML += `<option value="${i}">${i}</option>`);
  };
  
  pop('filtroProf', '👩‍🏫 Todos os Professores', profs);
  pop('filtroComp', '📚 Todas as Disciplinas', comps);
  pop('filtroTurma', '🏷️ Todas as Turmas', turmas);
  pop('filtroTrimestre', '⏳ Todos os Trimestres', trims);
  
  pop('rxFiltroProf', '👩‍🏫 Todos os Professores', profs);
  pop('rxFiltroComp', '📚 Todas as Disciplinas', comps);
  pop('rxFiltroTurma', '🏷️ Todas as Turmas', turmas);
  pop('rxFiltroTrimestre', '⏳ Todos os Trimestres', trims);
}

function filtrarPlanos() {
  const fProf = document.getElementById('filtroProf').value;
  const fComp = document.getElementById('filtroComp').value;
  const fTurma = document.getElementById('filtroTurma').value;
  const fTrim = document.getElementById('filtroTrimestre').value;
  const fStat = document.getElementById('filtroStatus').value;

  const filtrados = dadosPlanosGlobais.filter(p => {
    return (!fProf || p.professor === fProf) &&
           (!fComp || p.componente === fComp) &&
           (!fTurma || p.turma === fTurma) &&
           (!fTrim || p.trimestre === fTrim) &&
           (!fStat || p.status.includes(fStat));
  });
  desenharTabelaSupervisao(filtrados);
}

function desenharTabelaSupervisao(lista) {
  const container = document.getElementById('tabelaPlanosContainer');
  if (lista.length === 0) { container.innerHTML = "<p>Nenhum plano corresponde aos filtros.</p>"; return; }
  
  let html = `<table><tr><th>Data</th><th>Professor</th><th>Componente/Turma</th><th>Ações & Documentos</th><th>Avaliação</th></tr>`;
  
  lista.forEach(p => {
    const selPen = p.status.includes('Pendente') ? 'selected' : '';
    const selApr = p.status.includes('Aprovado') ? 'selected' : '';
    const selDev = p.status.includes('Devolvido') ? 'selected' : '';
    
    html += `<tr>
              <td><span style="font-size:0.8rem; color:#64748b;">${p.data}</span></td>
              <td><strong>${p.professor}</strong></td>
              <td>${p.componente}<br><span style="font-size:0.85rem; color:#64748b;">${p.turma}</span></td>
              <td>
                <a href="${p.docUrl}" target="_blank" style="display:inline-block; background:#2563eb; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:0.85rem; margin-bottom:5px;">📄 Abrir Plano</a>
                <br><a href="${p.pastaUrl}" target="_blank" style="display:inline-block; background:#10b981; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:0.85rem;">📂 Pasta (Evidências)</a>
              </td>
              <td style="min-width: 250px;">
                <select id="status_${p.linha}" onchange="atualizarStatusBanco(${p.linha})" style="padding:6px; margin-bottom:5px; font-weight:bold;">
                  <option value="🟡 Pendente" ${selPen}>🟡 Pendente</option>
                  <option value="✅ Aprovado" ${selApr}>✅ Aprovado</option>
                  <option value="🔴 Devolvido p/ Ajuste" ${selDev}>🔴 Devolvido</option>
                </select>
                <br>
                <div style="display:flex; gap:5px;">
                  <input type="text" id="feed_${p.linha}" value="${p.feedback}" placeholder="Comentário..." style="padding:6px; font-size:0.85rem;">
                  <button onclick="atualizarStatusBanco(${p.linha})" style="background:#475569; color:white; border:none; border-radius:6px; cursor:pointer;">OK</button>
                </div>
              </td>
             </tr>`;
  });
  container.innerHTML = html + "</table>";
}

async function atualizarStatusBanco(linha) {
  const novoStatus = document.getElementById(`status_${linha}`).value;
  const feedback = document.getElementById(`feed_${linha}`).value;
  try {
    await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "atualizarStatus", linha: linha, novoStatus: novoStatus, feedback: feedback }) });
    const pIndex = dadosPlanosGlobais.findIndex(p => p.linha === linha);
    if(pIndex !== -1) { dadosPlanosGlobais[pIndex].status = novoStatus; dadosPlanosGlobais[pIndex].feedback = feedback; }
  } catch(e) { alert("Erro ao guardar o status."); }
}

// ==========================================
// ABA 2: RAIO-X CURRICULAR
// ==========================================
async function gerarRaioX() {
  const fProf = document.getElementById('rxFiltroProf').value;
  const fComp = document.getElementById('rxFiltroComp').value;
  const fTurma = document.getElementById('rxFiltroTurma').value;
  const fTrim = document.getElementById('rxFiltroTrimestre').value;
  const painel = document.getElementById('painelRaioX');

  painel.innerHTML = "⏳ A cruzar dados da Matriz Oficial com os Planos executados...";

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "cruzarHabilidades", componente: fComp, turma: fTurma, professor: fProf, trimestre: fTrim }) });
    const r = await res.json();
    
    if (r.status === "sucesso") {
      let html = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:20px;">
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:10px;">
                      <h4 style="color:#166534; margin-top:0;">✅ Consolidado (${r.trabalhadas.length})</h4>
                      <ul style="font-size:0.9rem; padding-left:20px;">`;
      r.trabalhadas.forEach(h => html += `<li>${h.habilidade} <br><span style="color:#64748b; font-size:0.8rem;">Por: ${h.professor}</span></li>`);
      html += `</ul></div>
               <div style="background:#fffbeb; border:1px solid #fde68a; padding:15px; border-radius:10px;">
                 <h4 style="color:#b45309; margin-top:0;">⚠️ Faltam (${r.pendentes.length})</h4>
                 <ul style="font-size:0.9rem; padding-left:20px;">`;
      r.pendentes.forEach(h => html += `<li>${h.habilidade}</li>`);
      html += `</ul></div></div>`;
      painel.innerHTML = html;
    }
  } catch(e) { painel.innerHTML = "Erro ao cruzar os dados."; }
}

// ==========================================
// ABA 5: O ESPELHO DA PLANILHA (RASTREIO DE MATRIZ)
// ==========================================
async function carregarMatrizesSalvas() {
  const divAbas = document.getElementById('abasPlanilhaVirtual');
  const divConteudo = document.getElementById('conteudoPlanilhaVirtual');
  
  if (!divAbas || !divConteudo) return; 

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
        if(!dadosEspelhoGlobal[item.componente][item.ano].includes(item.trimestre)) { dadosEspelhoGlobal[item.componente][item.ano].push(item.trimestre); }
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
  } catch(e) { divAbas.innerHTML = "<span style='color:#ef4444;'>Falha de ligação com o servidor.</span>"; }
}

function mostrarConteudoEspelho(componente, btnClicado) {
  document.querySelectorAll('.btn-espelho-aba').forEach(b => { b.style.background = 'white'; b.style.color = '#475569'; });
  if(btnClicado) { btnClicado.style.background = '#1e3a8a'; btnClicado.style.color = 'white'; }

  const divConteudo = document.getElementById('conteudoPlanilhaVirtual');
  const dadosAno = dadosEspelhoGlobal[componente];
  
  if(!dadosAno) { divConteudo.innerHTML = "<span style='color:#94a3b8;'>Nenhum registo efetuado para esta disciplina.</span>"; return; }

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
// ABA 5: O EXTRATOR LÓGICO COM A "TESOURA INTELIGENTE"
// ==========================================
function atualizarLote(index, campo, valorHtml) {
  if (loteMatrizPronto[index]) {
    let textoComBr = valorHtml.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/p>|<\/div>/gi, "\n");
    let textoLimpo = textoComBr.replace(/<[^>]*>?/gm, '').trim();
    loteMatrizPronto[index][campo] = textoLimpo || "-";
  }
}

function gerarPreviaMatrizRegex() {
  let texto = document.getElementById('textoMatrizBruto').value;
  const disciplina = document.getElementById('impDisciplina').value.trim();
  const ano = document.getElementById('impAno').value.trim();
  const trimestre = document.getElementById('impTrimestre').value.trim();
  const msg = document.getElementById('msgImportacao') || document.createElement('div'); 
  const containerPrevia = document.getElementById('containerPrevia');
  const conteudoPrevia = document.getElementById('tabelaPreviaConteudo');

  if (!texto.trim()) { alert("⚠️ Por favor, cole o texto do PDF na caixa antes de continuar."); return; }

  msg.innerText = "⚡ A fatiar e processar variações curriculares...";
  loteMatrizPronto = [];
  containerPrevia.style.display = "none";

  // 1. CORREÇÃO DE QUEBRAS DE LINHA FALSAS DO PDF
  texto = texto.replace(/\n(?!\s*(\(|EF|Unidade|Práticas|Habilidade|Objetos|Conteúdos|Evidências))/gi, " ");

  // 2. NORMALIZAÇÃO DOS MARCADORES
  texto = texto.replace(/(?:UNIDADES?\s+TEMÁTICAS?|PRÁTICAS?\s+DE\s+LINGUAGEM)/gi, "___UNIDADE___");
  texto = texto.replace(/(?:GÊNEROS?\s+TEXTUAIS?|GÊNERO\s+TEXTUAL)/gi, "___GENERO___");
  texto = texto.replace(/(?:HABILIDADES?\s+DO\s+CRMG|HABILIDADES?\s+PRIORIZADAS?(?:\s+DO\s+ANO\s+ESCOLAR)?)/gi, "___HAB_PRIORIZADAS___");
  texto = texto.replace(/(?:HABILIDADES?\s+DE\s+RECOMPOSIÇÃO(?:\s+DAS\s+APRENDIZAGENS)?|HABILIDADE\s+SOCIOEMOCIONAL\s*:\s*PROJETO\s+DE\s+VIDA|HABILIDADES?\s+SOCIOEMOCIONA(?:IS|L))/gi, "___HAB_RECOMPOSICAO___");
  texto = texto.replace(/(?:HABILIDADES?\s+DE\s+SUPORTE)/gi, "___HAB_SUPORTE___");
  texto = texto.replace(/(?:OBJETOS?\s+DO\s+CONHECIMENTO(?:\s+DA\s+HABILIDADE\s+PRIORIZADA)?)/gi, "___OBJETOS___");
  texto = texto.replace(/(?:CONTEÚDOS?\s+RELACIONADOS?)/gi, "___CONTEUDOS___");
  texto = texto.replace(/(?:EXEMPLOS?\s+DE\s+PRÁTICAS?\s*PEDAGÓGICAS?|PRÁTICAS?\s*PEDAGÓGICAS?)/gi, "___PRATICAS___");
  texto = texto.replace(/(?:EVIDÊNCIAS?\s+DE\s+CONSOLIDAÇÃO(?:\s*(?:DA|DE)\s*APRENDIZAGEM)?)/gi, "___EVIDENCIAS___");

  // A TESOURA INTELIGENTE (Separa múltiplas habilidades encavaladas)
  const separarHabilidades = (textoBruto) => {
    if (!textoBruto || textoBruto === "-") return "-";
    let textoFormatado = textoBruto.replace(/([^\n])\s*(\(?EF\d{1,2}[A-Z]{2})/gi, "$1\n$2");
    return textoFormatado.trim();
  };

  const blocos = texto.split("___UNIDADE___");
  
  for (let i = 1; i < blocos.length; i++) {
    let bloco = "___UNIDADE___" + blocos[i];
    
    const capturar = (marcador) => {
      const regex = new RegExp(marcador + "([\\s\\S]*?)(?=___|$)", "i");
      const match = bloco.match(regex);
      if (!match) return "-";
      
      let extraido = match[1].trim();

      // FILTRO ANTI-LIXO 
      extraido = extraido.replace(/\d*\.?\s*PLANOS?\s+DE\s+CURSO\s+202[0-9][\s\S]*?(?:Etapa\s+de\s+Ensino:\s*Ensino\s+Fundamental|Ensino\s+Fundamental|Ensino\s+Médio)/gi, "");
      extraido = extraido.replace(/Área\s+de\s+Conhecimento:[\s\S]*?Componente\s+Curricular:[\s\S]*?(?:Ano\s+de\s+Escolaridade:|Etapa\s+de\s+Ensino:)/gi, "");
      extraido = extraido.replace(new RegExp(disciplina + "\\s*-\\s*\\dº\\s*Trimestre", "gi"), "");
      extraido = extraido.replace(/\s+\d+\s*$/, ""); 

      return extraido.trim() || "-";
    };

    const unidade = capturar("___UNIDADE___");
    const genero = capturar("___GENERO___");
    let habPri = capturar("___HAB_PRIORIZADAS___");
    let habRec = capturar("___HAB_RECOMPOSICAO___");
    let habSup = capturar("___HAB_SUPORTE___");
    const objetos = capturar("___OBJETOS___");
    const conteudos = capturar("___CONTEUDOS___");
    const praticas = capturar("___PRATICAS___");
    const evidencias = capturar("___EVIDENCIAS___");

    // Aplica a "Tesoura" nas Habilidades de Português e Matemática
    if (disciplina === "Matemática" || disciplina === "Língua Portuguesa") {
      habRec = separarHabilidades(habRec);
      habSup = separarHabilidades(habSup);
      habPri = separarHabilidades(habPri); 
    }

    if (unidade !== "-" || habPri !== "-") {
      loteMatrizPronto.push({
        disciplina: disciplina, 
        ano: ano, 
        trimestre: trimestre,
        unidade: unidade, 
        genero: genero, 
        habPriorizada: habPri,
        habRecomposicao: habRec, 
        habSuporte: habSup,
        objetoConhecimento: objetos, 
        conteudosRelacionados: conteudos,
        praticas: praticas, 
        evidencias: evidencias
      });
    }
  }

  if (loteMatrizPronto.length === 0) {
    alert("⚠️ O sistema não reconheceu os títulos. Confirme se colou o texto corretamente.");
    return;
  }

  // 4. TABELA DE PRÉVIA COMPLETA
  let htmlTabela = `
    <style>
      .cel-edit { border: 1px dashed transparent; padding: 4px; border-radius: 4px; cursor: text; transition: 0.2s; min-height: 20px; font-size:0.8rem; white-space: pre-wrap; }
      .cel-edit:hover { border-color: #94a3b8; background-color: #f8fafc; }
      .cel-edit:focus { border-color: #3b82f6; background-color: #eff6ff; outline: none; }
      .col-header { padding:8px; text-align:left; font-size:0.8rem; }
    </style>
    
    <div style="overflow-x: auto; padding-bottom: 10px; max-height: 500px;">
    <table style="width:100%; min-width:2000px; border-collapse: collapse; border: 1px solid #cbd5e1;">
      <tr style="background-color:#1e3a8a; color:white; position: sticky; top: 0;">
        <th class="col-header" style="width:2%;">#</th>
        <th class="col-header" style="width:6%;">Ano/Trim.</th>
        <th class="col-header" style="width:10%;">Unidade Temática</th>
        <th class="col-header" style="width:15%;">Habilidade Priorizada</th>
        <th class="col-header" style="width:10%;">Hab. Recomposição</th>
        <th class="col-header" style="width:10%;">Hab. Suporte</th>
        <th class="col-header" style="width:12%;">Objetos do Conhec.</th>
        <th class="col-header" style="width:12%;">Conteúdos Relacionados</th>
        <th class="col-header" style="width:12%;">Práticas Pedagógicas</th>
        <th class="col-header" style="width:11%;">Evidências</th>
      </tr>`;
  
  loteMatrizPronto.forEach((item, index) => {
    let bgLine = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    htmlTabela += `<tr style="border-bottom: 1px solid #e2e8f0; background: ${bgLine};">
                    <td style="vertical-align:top; padding:8px; font-size:0.8rem;">${index + 1}</td>
                    
                    <td style="vertical-align:top; padding:8px; font-size:0.8rem; color:#475569;">
                      <strong>${item.ano}</strong><br>${item.trimestre}
                    </td>
                    
                    <td style="vertical-align:top; padding:8px;">
                      <div contenteditable="true" onblur="atualizarLote(${index}, 'unidade', this.innerHTML)" class="cel-edit" style="font-weight:bold; color:#1e293b;">${item.unidade}</div>
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
  if(msg) msg.innerText = `✅ Extração Refinada: ${loteMatrizPronto.length} blocos organizados! As habilidades conjuntas foram separadas.`;
}

async function enviarLoteConfirmado() {
  if (loteMatrizPronto.length === 0) { alert("⚠️ Nenhuma habilidade na prévia para enviar."); return; }
  
  const btnEnvio = document.getElementById('btnEnviarOficial');
  btnEnvio.innerText = "⏳ A gravar nas 11 colunas da Planilha Oficial...";
  btnEnvio.disabled = true;

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "salvarLoteMatriz", itens: loteMatrizPronto }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      alert("✅ " + r.mensagem);
      document.getElementById('textoMatrizBruto').value = "";
      document.getElementById('containerPrevia').style.display = "none";
      loteMatrizPronto = [];

      carregarMatrizesSalvas(); 

    } else { alert("⚠️ Erro ao guardar: " + r.mensagem); }
  } catch (e) { alert("⚠ Erro de comunicação com o servidor Google Apps Script."); } 
  finally { btnEnvio.innerText = "🚀 Tudo certo! Enviar para a Planilha Oficial"; btnEnvio.disabled = false; }
}

// ==========================================
// ABA 3: USUÁRIOS
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
// ABA 4: RELATÓRIOS E BACKUP
// ==========================================
async function gerarRelatorio() {
  const btn = document.getElementById('btnGerarRelatorio');
  const periodo = document.getElementById('tipoRelatorio').value;
  btn.innerText = "⏳ A Auditar Matrizes e Gerar Documento...";
  btn.disabled = true;

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "gerarRelatorioExecutivo", periodo: periodo }) });
    const r = await res.json();
    if(r.status === "sucesso") {
      alert("✅ Relatório Avançado concluído!"); 
      window.open(r.url, '_blank');
    } else { alert("⚠️ Erro: " + r.mensagem); }
  } catch(e) { alert("Erro de comunicação."); } finally { btn.innerText = "📑 Gerar Documento Oficial (Google Docs)"; btn.disabled = false; }
}

async function forcarBackup() {
  const btn = document.getElementById('btnBackup'); btn.innerText = "⏳ A extrair dados..."; btn.disabled = true;
  try { const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "forcarBackup" }) }); const r = await res.json(); alert("✅ " + r.mensagem); } 
  catch(e) { alert("Erro."); } finally { btn.innerText = "📦 Enviar para E-mail"; btn.disabled = false; }
}
