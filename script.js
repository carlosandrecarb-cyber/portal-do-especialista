const URL_API = "https://script.google.com/macros/s/AKfycbzrbfJgz-TSiyWftvEDXH4ZsxZBAYamozeYho2f4KH1T7ZnjBWdwVobHqirP0bDnGMj/exec"; 

var professorLogado = "";
var dadosMatrizGlobal = [];

function mudarAba(abaId, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
  document.getElementById(abaId).classList.add('active');
  if (btn) btn.classList.add('active');
  else document.querySelectorAll('.tabs button').forEach(b => { if (b.innerText.includes(abaId === 'gerarPlano' ? 'Gerar' : 'Meus')) b.classList.add('active'); });
  if (abaId === 'meusPlanos') carregarMeusPlanos();
}

function verificarEscolaManual() {
  const codigo = document.getElementById('inputCodigoEscola').value.trim().toLowerCase();
  if (codigo.length > 1) {
    document.getElementById('telaWorkspace').style.display = 'none';
    document.getElementById('telaLogin').style.display = 'flex';
    document.getElementById('tituloNomeEscola').innerText = "Acesso Autorizado";
  } else { document.getElementById('msgWorkspace').innerText = "Código não reconhecido."; }
}

async function fazerLogin() {
  const usuario = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const msg = document.getElementById('msgLogin');
  msg.innerText = "⏳ A Autenticar...";
  try {
    const res = await fetch(URL_API, { method: 'POST', redirect: 'follow', headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ acao: "login", usuario, senha }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      professorLogado = r.nome;
      document.getElementById('telaLogin').style.display = 'none';
      document.getElementById('nomeProfessor').value = r.nome;
      document.getElementById('infoUsuarioBoasVindas').style.display = 'inline-block';
      document.getElementById('infoUsuarioBoasVindas').innerText = `👋 Docente: ${r.nome}`;
      document.getElementById('btnSairSistema').style.display = 'block';
      carregarComponentesProfessor(r.componentes, r.turmas);
    } else { msg.innerText = r.mensagem || "Erro de login."; }
  } catch (e) { msg.innerText = "⚠️ Erro de conexão com o servidor."; }
}

function sairDoSistema() {
  professorLogado = "";
  document.getElementById('loginSenha').value = ""; 
  document.getElementById('telaLogin').style.display = 'flex';
  document.getElementById('infoUsuarioBoasVindas').style.display = 'none';
  document.getElementById('btnSairSistema').style.display = 'none';
  document.getElementById('nomeProfessor').value = "";
  mudarAba('gerarPlano', document.querySelector('.tabs button')); 
}

function carregarComponentesProfessor(componentesLista, turmasLista) {
  const selComp = document.getElementById('componente');
  const areaTurmas = document.getElementById('areaTurmas');

  let htmlComp = '<option value="">Selecione a disciplina...</option>';
  const compArray = (componentesLista?.length && componentesLista[0] !== "") ? componentesLista : ["Matemática", "Língua Portuguesa", "Geografia", "História", "Ciências", "Arte", "Educação Física", "Ensino Religioso", "Língua Inglesa"];
  compArray.forEach(c => htmlComp += `<option value="${c}">${c}</option>`);
  selComp.innerHTML = htmlComp;

  let htmlTurma = '';
  const turmasArray = (turmasLista?.length && turmasLista[0] !== "") ? turmasLista : ["6º Ano", "7º Ano", "8º Ano", "9º Ano"];
  turmasArray.forEach(t => {
    htmlTurma += `<label style="display:flex; align-items:center; cursor:pointer; padding:6px 10px; background:#f8fafc; border:1px solid #edf2f7; border-radius:8px; margin:0;">
                    <input type="checkbox" name="chkTurmaProf" value="${t}" onchange="buscarMatriz()" style="transform:scale(1.2); margin-right:10px; accent-color:var(--cor-secundaria);">
                    ${t}
                  </label>`;
  });
  areaTurmas.innerHTML = htmlTurma;
}

async function buscarMatriz() {
  const componente = document.getElementById('componente').value;
  const turmasMarcadas = Array.from(document.querySelectorAll('input[name="chkTurmaProf"]:checked')).map(cb => cb.value);
  const trimestre = document.getElementById('selTrimestre') ? document.getElementById('selTrimestre').value : "3º Trimestre";
  
  if (!componente || turmasMarcadas.length === 0 || !trimestre) {
    document.getElementById('blocoCurriculo').style.display = 'none';
    return;
  }
  
  const anoBaseParaBusca = turmasMarcadas[0]; 
  document.getElementById('unidade').innerHTML = '<option value="">⏳ Buscando matriz...</option>';
  document.getElementById('blocoCurriculo').style.display = 'block';

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "buscarMatrizTrimestre", componente: componente, trimestre: trimestre, ano: anoBaseParaBusca }) });
    const r = await res.json();
    dadosMatrizGlobal = r.itens || [];
    let htmlUnidades = '<option value="">Selecione a Unidade Temática...</option>';
    [...new Set(dadosMatrizGlobal.map(i => i.unidade))].forEach(u => htmlUnidades += `<option value="${u}">${u}</option>`);
    
    if(dadosMatrizGlobal.length === 0) { htmlUnidades = '<option value="">⚠️ Nenhuma matriz encontrada.</option>'; }
    document.getElementById('unidade').innerHTML = htmlUnidades;
  } catch(e) { document.getElementById('unidade').innerHTML = '<option value="">Erro na busca.</option>'; }
}

function montarCheckboxes() {
  const unidadeSelecionada = document.getElementById('unidade').value;
  const componente = document.getElementById('componente').value;
  if (!unidadeSelecionada) return;
  document.getElementById('painelOpcoes').style.display = 'block';

  const itens = dadosMatrizGlobal.filter(i => i.unidade === unidadeSelecionada);
  
  let tituloHabPrincipal = "Habilidade do CRMG:";
  let tituloConteudo = "Conteúdos Relacionados:";
  let mostrarRecSup = false;
  let mostrarSocioemocional = false;

  const extrairItensMultiplos = (textoBruto) => {
    if (!textoBruto || textoBruto === "-") return [];
    let partes = textoBruto.split(/\n|\s+\|\s+|(?:,(?![^\(]*\)))/);
    return partes.map(p => p.replace(/^[\-\•\◦]\s*/, "").trim()).filter(p => p.length > 2);
  };

  // ✅ NOVO: A Tesoura Inteligente de Habilidades
  const separarHabilidades = (textoBruto) => {
    if (!textoBruto || textoBruto === "-") return [];
    // Encontra a transição entre texto e um novo código (ex: " EF15..." ou " (EF15...")
    // e injeta uma quebra de linha real (\n) para forçar a separação na array.
    let formatado = textoBruto.replace(/\s(\(?EF\d{1,2}[A-Z]{2})/gi, "\n$1");
    return formatado.split("\n").map(t => t.trim()).filter(t => t.length > 5);
  };

  if (componente === "Língua Portuguesa" || componente === "Matemática") {
    tituloHabPrincipal = "Habilidade Priorizada do ano escolar:";
    tituloConteudo = "Objeto do conhecimento da habilidade priorizada:";
    mostrarRecSup = true;
  } else if (componente === "Ensino Religioso") {
    mostrarSocioemocional = true;
  }

  let htmlPri = "", htmlRec = "", htmlSup = "";
  let conteudoSet = new Set();

  itens.forEach(item => {
    // Habilidade Priorizada (Mantemos Inteira)
    if (item.habPriorizada && item.habPriorizada !== "-") {
      htmlPri += `<div class="checkbox-item"><input type="radio" name="radioHabPriorizada" value="${item.habPriorizada}"><label>${item.habPriorizada}</label></div>`;
    }
    
    // Habilidades de Recomposição e Suporte (Passam pela Tesoura)
    if (mostrarRecSup) {
      if (item.habRecomposicao && item.habRecomposicao !== "-") {
        separarHabilidades(item.habRecomposicao).forEach(h => {
          htmlRec += `<div class="checkbox-item"><input type="checkbox" name="chkHabRecomposicao" value="${h}"><label>${h}</label></div>`;
        });
      }
      if (item.habSuporte && item.habSuporte !== "-") {
        separarHabilidades(item.habSuporte).forEach(h => {
          htmlSup += `<div class="checkbox-item"><input type="checkbox" name="chkHabSuporte" value="${h}"><label>${h}</label></div>`;
        });
      }
    } else if (mostrarSocioemocional) {
      if (item.habRecomposicao && item.habRecomposicao !== "-") {
        separarHabilidades(item.habRecomposicao).forEach(h => {
          htmlRec += `<div class="checkbox-item"><input type="checkbox" name="chkHabRecomposicao" value="${h}"><label>${h}</label></div>`;
        });
      }
    }

    // Objetos e Conteúdos
    if (componente === "Língua Portuguesa" || componente === "Matemática") {
      extrairItensMultiplos(item.objetoConhecimento).forEach(obj => conteudoSet.add(obj));
    } else {
      extrairItensMultiplos(item.conteudosRelacionados).forEach(cont => conteudoSet.add(cont));
    }
  });

  let painelHabilidades = `<label style="font-weight:700; color:#d97706;">${tituloHabPrincipal}</label>${htmlPri || '<p>Nenhuma.</p>'}`;
  if (mostrarRecSup) {
    painelHabilidades += `${htmlRec ? `<label style="font-weight:700; color:#d97706; margin-top:10px;">Habilidades de Recomposição:</label>${htmlRec}` : ''}`;
    painelHabilidades += `${htmlSup ? `<label style="font-weight:700; color:#d97706; margin-top:10px;">Habilidades de Suporte:</label>${htmlSup}` : ''}`;
  } else if (mostrarSocioemocional) {
    painelHabilidades += `${htmlRec ? `<label style="font-weight:700; color:#d97706; margin-top:10px;">Habilidades Socioemocionais:</label>${htmlRec}` : ''}`;
  }
  document.getElementById('listaHabilidades').innerHTML = painelHabilidades;

  let htmlObj = `<label style="font-weight:700; color:#0284c7; display:block; margin-bottom:8px;">${tituloConteudo}</label>`;
  conteudoSet.forEach(cont => htmlObj += `<div class="checkbox-item"><input type="checkbox" name="chkObjeto" value="${cont}"><label>${cont}</label></div>`);
  document.getElementById('listaObjetos').innerHTML = conteudoSet.size > 0 ? htmlObj : '<p>Nenhum conteúdo localizado.</p>';
}

const formatarData = (dataBase) => {
  if (!dataBase) return "-";
  const [ano, mes, dia] = dataBase.split('-');
  return `${dia}/${mes}/${ano}`;
};

function abrirIA(tipo) {
  const componente = document.getElementById('componente').value || "minha disciplina";
  const turmasMarcadas = Array.from(document.querySelectorAll('input[name="chkTurmaProf"]:checked')).map(cb => cb.value);
  const anoEscolaridade = turmasMarcadas.length > 0 ? turmasMarcadas[0].split('º')[0] + "º Ano" : "minha turma";
  
  const habRadios = document.querySelector('input[name="radioHabPriorizada"]:checked');
  const habSelecionada = habRadios ? habRadios.value : "uma habilidade da BNCC/Currículo";
  
  const recursosSelecionados = Array.from(document.querySelectorAll('input[name="chk_recursos"]:checked')).map(c => c.value).join(", ");
  
  let promptMestre = `Atue como um professor especialista de ${componente}. Crie o passo a passo (desenvolvimento) de uma aula para alunos do ${anoEscolaridade}. O planejamento deve ser focado na seguinte habilidade: "${habSelecionada}". `;
  if (recursosSelecionados) { promptMestre += `Para esta aula, planeio utilizar especificamente as seguintes ferramentas e metodologias: ${recursosSelecionados}. Integra estes elementos de forma criativa na aula. `; }
  promptMestre += `O texto gerado deve ser direto, prático e detalhar o tempo (em minutos) e as ações exatas do professor e dos alunos.`;
  
  navigator.clipboard.writeText(promptMestre).then(() => {
    alert("✅ Comando Inteligente copiado com sucesso!\n\nCole o texto na página da Inteligência Artificial que vai abrir agora.");
    if (tipo === 'gemini') window.open('https://gemini.google.com/app', '_blank');
    else if (tipo === 'chatgpt') window.open('https://chatgpt.com', '_blank');
  }).catch(err => {
    alert("⚠️ O seu navegador bloqueou a cópia automática. A janela será aberta mesmo assim.");
    if (tipo === 'gemini') window.open('https://gemini.google.com/app', '_blank');
    else if (tipo === 'chatgpt') window.open('https://chatgpt.com', '_blank');
  });
}

// -------------------------------------------------------------
// GERAÇÃO DO PLANO DE AULA
// -------------------------------------------------------------
async function enviarPlanoAulaAPI() {
  const turmasMarcadas = Array.from(document.querySelectorAll('input[name="chkTurmaProf"]:checked')).map(cb => cb.value);
  if(turmasMarcadas.length === 0) { alert("⚠️ Selecione pelo menos uma Turma marcando a caixinha."); return; }

  const btn = document.getElementById('btnGerar');
  btn.innerText = "⏳ A Gerar Documentos Oficiais...";
  btn.disabled = true;

  const habPri = document.querySelector('input[name="radioHabPriorizada"]:checked');
  const habPrioTexto = habPri ? habPri.value : "Não selecionada";
  
  const itemMatriz = dadosMatrizGlobal.find(i => i.habPriorizada === habPrioTexto);
  const evidenciasMatriz = (itemMatriz && itemMatriz.evidencias && itemMatriz.evidencias !== "-") ? itemMatriz.evidencias : "Avaliação formativa e contínua.";

  const rec = Array.from(document.querySelectorAll('input[name="chkHabRecomposicao"]:checked')).map(c => c.value).join("\n");
  const sup = Array.from(document.querySelectorAll('input[name="chkHabSuporte"]:checked')).map(c => c.value).join("\n");
  const objs = Array.from(document.querySelectorAll('input[name="chkObjeto"]:checked')).map(c => c.value).join(" | ");
  const recursos = Array.from(document.querySelectorAll('input[name="chk_recursos"]:checked')).map(c => c.value).join(", ");
  
  const gerarAnexos = document.getElementById('chkGerarAnexos') ? document.getElementById('chkGerarAnexos').checked : false;

  const turmaInteira = turmasMarcadas.join(" e ");
  const anoEscolaridade = turmasMarcadas[0].split('º')[0] + "º Ano"; 

  // CAPTURA O HTML (As quebras de linha)
  const textoDesenvolvimento = document.getElementById('desenvolvimento').innerHTML;

  const dadosPlano = {
    professor: document.getElementById('nomeProfessor').value,
    tipoPlano: document.getElementById('tipoPlano').value,
    componente: document.getElementById('componente').value,
    qtdAulas: document.getElementById('qtdAulas').value,
    dataInicio: formatarData(document.getElementById('dataInicioPer').value),
    dataFim: formatarData(document.getElementById('dataFimPer').value),
    turma: turmaInteira,
    ano: anoEscolaridade,
    trimestre: document.getElementById('selTrimestre').value,
    unidade: document.getElementById('unidade').value,
    habPriorizada: habPrioTexto,
    habRecomposicao: rec,
    habSuporte: sup,
    objetoConhecimento: objs || "-",
    desenvolvimento: textoDesenvolvimento, 
    recursos: recursos || "-",
    evidencias: evidenciasMatriz,
    gerarAnexos: gerarAnexos
  };

  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "gerarPlano", planoData: dadosPlano }) });
    const r = await res.json();
    if (r.status === "sucesso") {
      alert("✅ Plano Oficial e Anexos gerados com sucesso!");
      window.open(r.url, '_blank');
      mudarAba('meusPlanos', null);
    } else { alert("Erro: " + r.mensagem); }
  } catch(e) { alert("Erro de conexão com o servidor."); } 
  finally { btn.innerText = "🚀 Gerar Plano Oficial & Enviar para Supervisão"; btn.disabled = false; }
}

// -------------------------------------------------------------
// MEUS PLANOS E EVIDÊNCIAS
// -------------------------------------------------------------
async function carregarMeusPlanos() {
  const container = document.getElementById('listaDePlanos');
  container.innerHTML = "⏳ A carregar os seus planos recentes...";
  try {
    const res = await fetch(URL_API, { method: 'POST', body: JSON.stringify({ acao: "listarSupervisao" }) });
    const r = await res.json();
    if (r.status === "sucesso" && r.registros) {
      const meus = r.registros.filter(i => i.professor.toLowerCase() === professorLogado.toLowerCase());
      if (!meus.length) return container.innerHTML = "<p>Ainda não gerou nenhum plano.</p>";
      let html = "";
      meus.reverse().forEach(p => {
        
        let botoesCaderno = p.cadernoUrl ? `
          <a href="${p.cadernoUrl}" target="_blank" style="flex:1; text-align:center; background:#f1f5f9; color:#475569; padding:10px 12px; text-decoration:none; border-radius:8px; font-weight:bold; border:1px solid #cbd5e1; font-size:0.85rem; min-width:110px;">📑 Abrir Caderno de Anexos</a>
          <button onclick="abrirModalQR('${p.cadernoUrl}', '📱 QR Code: Caderno de Anexos')" style="flex:1; background:#8b5cf6; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem; min-width:110px;">📱 QR Anexos</button>
        ` : '';

        let feedbackHTML = "";
        if (p.status.includes('Devolvido') && p.feedback && p.feedback.trim() !== "") {
           feedbackHTML = `<div style="background:#fee2e2; color:#991b1b; padding:8px; border-radius:6px; font-size:0.85rem; margin-bottom:15px; border-left: 4px solid #ef4444;">💬 <strong>Motivo da Devolução:</strong> ${p.feedback}</div>`;
        }

        let corStatus = p.status.includes('Aprovado') ? '#10b981' : (p.status.includes('Devolvido') ? '#ef4444' : '#f59e0b');

        html += `<div class="plano-item">
                  <div style="font-size: 0.9rem; color: #64748b; margin-bottom: 5px;"><strong>📅 ${p.data}</strong> | Estado: <span style="color:${corStatus}; font-weight:bold;">${p.status}</span></div>
                  <div style="font-size: 1.05rem; color: #0f172a; font-weight: bold; margin-bottom: 5px;">📚 ${p.componente}</div>
                  <div style="font-size: 0.9rem; color: #334155; margin-bottom: 15px;"><strong>🏷️ Turmas:</strong> ${p.turma}</div>
                  
                  ${feedbackHTML}

                  <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: stretch;">
                    <a href="${p.docUrl}" target="_blank" style="flex:1; text-align:center; background:#2563eb; color:white; padding:10px 12px; text-decoration:none; border-radius:8px; font-weight:bold; font-size:0.85rem; min-width:110px;">📄 Abrir Plano</a>
                    <button onclick="abrirModalQR('${p.pastaUrl}', '📷 QR Code: Pasta de Evidências')" style="flex:1; background:#10b981; color:white; border:none; padding:10px 12px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem; min-width:110px;">📷 QR Evidências</button>
                    ${botoesCaderno}
                  </div>
                 </div>`;
      });
      container.innerHTML = html;
    }
  } catch (e) { container.innerHTML = "<p>Erro ao carregar a lista.</p>"; }
}

function abrirModalQR(url, tituloModal) { 
  let modal = document.getElementById('modalQR');
  let tituloExistente = document.getElementById('textoModalQR');
  if(!tituloExistente) {
    let txt = document.createElement('h3'); txt.id = 'textoModalQR'; txt.style.color = '#f8fafc'; txt.style.marginBottom = '20px'; txt.style.textAlign = 'center'; txt.style.padding = '0 20px';
    document.getElementById('imgQRCode').before(txt);
  }
  document.getElementById('textoModalQR').innerText = tituloModal || "Aponte a câmera do celular";
  document.getElementById('imgQRCode').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`; 
  modal.style.display = 'flex'; 
}

function fecharModalQR() { document.getElementById('modalQR').style.display = 'none'; }

document.addEventListener("DOMContentLoaded", () => { const btn = document.getElementById('btnGerar'); if(btn) btn.onclick = enviarPlanoAulaAPI; });
