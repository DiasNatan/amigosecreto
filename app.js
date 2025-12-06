// ==========================================
// IMPORTAÇÕES
// ==========================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, push, onValue, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { firebaseConfig, SENHA_ADMIN } from './firebase-config.js';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ==========================================
// VARIÁVEL DE ESTADO
// ==========================================
let isAdminLogged = false;
let participantesData = {}; // Armazena dados dos participantes para edição

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = ['#DAA520', '#800020', '#FFD700'][Math.floor(Math.random() * 3)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

function formatPhone(value) {
    value = value.replace(/\D/g, '');
    if (value.length <= 10) {
        value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
}

// Gerar código único de 6 caracteres
function gerarCodigo() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

// ==========================================
// CONTAGEM REGRESSIVA
// ==========================================

function updateCountdown() {
    const eventDate = new Date('2025-12-31T23:59:59');
    const now = new Date();
    const diff = eventDate - now;

    if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('days').textContent = String(days).padStart(2, '0');
        document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    } else {
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
    }
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ==========================================
// FORMATAÇÃO DE TELEFONE
// ==========================================

document.getElementById('whatsapp').addEventListener('input', function(e) {
    e.target.value = formatPhone(e.target.value);
});

// ==========================================
// INSCRIÇÃO DE PARTICIPANTES
// ==========================================

document.getElementById('inscricaoForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const sugestoes = document.getElementById('sugestoes').value.trim();

    if (!nome || !whatsapp || !sugestoes) {
        showAlert('Por favor, preencha todos os campos!', 'error');
        return;
    }

    // Validação de telefone
    if (whatsapp.replace(/\D/g, '').length < 10) {
        showAlert('Por favor, insira um telefone válido!', 'error');
        return;
    }

    showLoading(true);

    try {
        const participantesRef = ref(database, 'participantes');
        const novoParticipante = {
            nome: nome,
            whatsapp: whatsapp,
            sugestoes: sugestoes,
            dataInscricao: new Date().toISOString()
        };

        await push(participantesRef, novoParticipante);
        
        showLoading(false);
        showAlert('🎉 Inscrição realizada com sucesso! Bem-vindo(a) ao Amigo Secreto!', 'success');
        createConfetti();
        
        document.getElementById('inscricaoForm').reset();
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao registrar inscrição: ' + error.message, 'error');
        console.error(error);
    }
});

// ==========================================
// EXCLUIR PARTICIPANTE (ADMIN)
// ==========================================

async function handleExcluirParticipante(participanteId, nomeParticipante, isFromList = true) {
    if (!isAdminLogged) {
        showAlert('Acesso negado! Faça login como organizador.', 'error');
        return;
    }

    const confirmacao = confirm(`⚠️ Tem certeza que deseja EXCLUIR o participante ${nomeParticipante}?\n\nIsso é irreversível e irá bagunçar o sorteio se ele já tiver sido feito!`);
    
    if (!confirmacao) {
        return;
    }

    showLoading(true);

    try {
        const participanteRef = ref(database, `participantes/${participanteId}`);
        await remove(participanteRef);
        
        // Se a exclusão vier do formulário de edição, volte para a lista
        if (!isFromList) {
            document.getElementById('formEdicaoContainer').classList.add('hidden');
        }

        showLoading(false);
        showAlert(`✅ Participante ${nomeParticipante} removido com sucesso.`, 'success');
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao remover participante: ' + error.message, 'error');
        console.error(error);
    }
}


// ==========================================
// FUNÇÃO CENTRAL DE CARREGAMENTO DE PARTICIPANTES
// ==========================================

function loadParticipantes(data) {
    // Armazena a lista bruta para fácil acesso (necessário para a edição)
    participantesData = data || {}; 
    
    const listaDiv = document.getElementById('listaParticipantes');
    const listaAdminDiv = document.getElementById('listaAdminParticipantes');
    const totalSpan = document.getElementById('totalParticipantes');

    if (data) {
        // Conversão dos dados em Array (preserva a ID do Firebase)
        const participantes = Object.entries(data).map(([id, dados]) => ({ id, ...dados }));
        totalSpan.textContent = participantes.length;

        // 1. Lista Pública (apenas nomes)
        listaDiv.innerHTML = participantes.map(p => `
            <div class="participante-item">
                <strong>👤 ${p.nome}</strong>
            </div>
        `).join('');

        // 2. Lista de Admin (detalhes + botão de edição/exclusão)
        if (isAdminLogged) {
            listaAdminDiv.innerHTML = participantes.map(p => `
                <div class="participante-admin-item" data-id="${p.id}">
                    <div class="info">
                        <strong>${p.nome}</strong>
                        <p>📱 ${p.whatsapp}</p>
                        <p>💭 ${p.sugestoes}</p>
                    </div>
                    <div class="btn-group-admin" style="display: flex; gap: 10px;">
                        <button class="btn btn-test btn-editar" data-id="${p.id}">✏️ Editar</button>
                        <button class="btn-excluir" data-id="${p.id}">🗑️ Excluir</button>
                    </div>
                </div>
            `).join('');
            
            // Adicionar event listeners aos novos botões
            document.querySelectorAll('.btn-excluir').forEach(button => {
                button.addEventListener('click', (e) => {
                    // Chama a função de exclusão com o ID e nome
                    const nome = e.target.closest('.participante-admin-item').querySelector('.info strong').textContent.trim();
                    handleExcluirParticipante(e.target.dataset.id, nome, true);
                });
            });

            document.querySelectorAll('.btn-editar').forEach(button => {
                button.addEventListener('click', handleAbrirEdicao);
            });

        } else {
            listaAdminDiv.innerHTML = '<p style="text-align: center; color: #999;">Faça o login de administrador para ver os detalhes e gerenciar participantes.</p>';
        }
    } else {
        totalSpan.textContent = '0';
        listaDiv.innerHTML = '<p style="text-align: center; color: #999;">Nenhum participante inscrito ainda.</p>';
        listaAdminDiv.innerHTML = '';
    }
}


// Listener principal para o banco de dados
onValue(ref(database, 'participantes'), (snapshot) => {
    loadParticipantes(snapshot.val());
});


// ==========================================
// GERENCIAR EDIÇÃO DE PARTICIPANTES (ADMIN)
// ==========================================

function handleAbrirEdicao(e) {
    const id = e.target.dataset.id;
    const dados = participantesData[id];

    if (!dados) {
        showAlert('Erro: Participante não encontrado!', 'error');
        return;
    }

    // Pré-preenche o formulário
    document.getElementById('edicaoId').value = id;
    document.getElementById('edicaoNome').value = dados.nome;
    document.getElementById('edicaoWhatsapp').value = dados.whatsapp;
    document.getElementById('edicaoSugestoes').value = dados.sugestoes;
    document.getElementById('nomeParticipanteEdicao').textContent = dados.nome; // Atualiza o título do card

    // Esconde a lista e mostra o formulário
    document.getElementById('listaAdminParticipantes').classList.add('hidden');
    document.getElementById('formEdicaoContainer').classList.remove('hidden');

    // Listener para o novo botão de Excluir dentro do formulário de edição
    document.getElementById('btnExcluirEdicao').onclick = () => {
        handleExcluirParticipante(id, dados.nome, false); // false = exclusão do formulário
    };
    
    // Listener para o botão Cancelar
    document.getElementById('btnCancelarEdicao').onclick = () => {
        document.getElementById('formEdicaoContainer').classList.add('hidden');
        document.getElementById('listaAdminParticipantes').classList.remove('hidden');
    };
}


document.getElementById('edicaoForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('edicaoId').value;
    const nome = document.getElementById('edicaoNome').value.trim();
    const whatsapp = document.getElementById('edicaoWhatsapp').value.trim();
    const sugestoes = document.getElementById('edicaoSugestoes').value.trim();

    if (!nome || !whatsapp || !sugestoes) {
        showAlert('Por favor, preencha todos os campos!', 'error');
        return;
    }

    showLoading(true);

    try {
        const participanteRef = ref(database, `participantes/${id}`);
        
        // Usa SET para ATUALIZAR os dados no nó com o ID específico
        await set(participanteRef, {
            nome: nome,
            whatsapp: whatsapp,
            sugestoes: sugestoes,
            dataInscricao: participantesData[id].dataInscricao // Mantém a data de inscrição original
        });

        showLoading(false);
        showAlert(`✅ Participante ${nome} atualizado com sucesso!`, 'success');
        
        // Volta para a lista de participantes
        document.getElementById('formEdicaoContainer').classList.add('hidden');
        document.getElementById('listaAdminParticipantes').classList.remove('hidden');

    } catch (error) {
        showLoading(false);
        showAlert('Erro ao salvar edição: ' + error.message, 'error');
        console.error(error);
    }
});


// ==========================================
// ACESSO AO PAINEL ADMIN (LOGIN/LOGOUT)
// ==========================================

document.getElementById('btnAcessoAdmin').addEventListener('click', function() {
    const senha = document.getElementById('senhaAcessoAdmin').value;
    
    if (senha === SENHA_ADMIN) {
        isAdminLogged = true;
        document.getElementById('adminLoginCard').classList.add('hidden');
        document.getElementById('adminPanelCard').classList.remove('hidden');
        document.getElementById('senhaAcessoAdmin').value = ''; // Limpa a senha
        showAlert('✅ Acesso de Organizador liberado! Agora você pode gerenciar.', 'success');
        // Recarrega a lista para mostrar os botões de exclusão/edição
        onValue(ref(database, 'participantes'), (snapshot) => {
            loadParticipantes(snapshot.val());
        }, { onlyOnce: true });
    } else {
        showAlert('Senha de acesso incorreta! Tente novamente.', 'error');
    }
});

document.getElementById('btnSairAdmin').addEventListener('click', function() {
    isAdminLogged = false;
    document.getElementById('adminLoginCard').classList.remove('hidden');
    document.getElementById('adminPanelCard').classList.add('hidden');
    showAlert('🚪 Sessão de Organizador encerrada.', 'info');
    // Recarrega a lista para esconder os botões de exclusão e detalhes
    onValue(ref(database, 'participantes'), (snapshot) => {
        loadParticipantes(snapshot.val());
    }, { onlyOnce: true });
});


// ==========================================
// ALGORITMO DE SORTEIO (COM CÓDIGOS)
// ==========================================

function realizarSorteio(participantes) {
    // Converter objeto de participantes para array com IDs
    const participantesArray = Object.entries(participantes).map(([id, dados]) => ({
        id: id,
        ...dados
    }));
    
    const n = participantesArray.length;
    
    if (n < 2) {
        throw new Error('É necessário pelo menos 2 participantes para o sorteio!');
    }

    let tentativas = 0;
    const maxTentativas = 100;
    
    while (tentativas < maxTentativas) {
        // Criar cópia embaralhada dos índices
        let indices = [...Array(n).keys()];
        
        // Embaralhamento Fisher-Yates
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // Verificar se ninguém tirou a si mesmo
        let valido = true;
        for (let i = 0; i < n; i++) {
            if (i === indices[i]) {
                valido = false;
                break;
            }
        }
        
        if (valido) {
            const resultado = {};
            const codigos = {};
            
            for (let i = 0; i < n; i++) {
                const participante = participantesArray[i];
                const amigoSecreto = participantesArray[indices[i]];
                const codigo = gerarCodigo();
                
                resultado[participante.nome] = {
                    tirouNome: amigoSecreto.nome,
                    dadosAmigo: {
                        nome: amigoSecreto.nome,
                        whatsapp: amigoSecreto.whatsapp,
                        sugestoes: amigoSecreto.sugestoes
                    },
                    codigo: codigo
                };
                
                // Criar índice por código para consulta rápida
                codigos[codigo] = {
                    participante: participante.nome,
                    tirouNome: amigoSecreto.nome,
                    dadosAmigo: {
                        nome: amigoSecreto.nome,
                        whatsapp: amigoSecreto.whatsapp,
                        sugestoes: amigoSecreto.sugestoes
                    }
                };
            }
            return { resultado, codigos };
        }
        
        tentativas++;
    }
    
    throw new Error('Não foi possível realizar um sorteio válido. Tente novamente!');
}

// ==========================================
// BOTÃO DE SORTEAR TESTE (NÃO SALVA NO FIREBASE)
// ==========================================

document.getElementById('btnSortearTeste').addEventListener('click', async function() {
    if (!isAdminLogged) {
        showAlert('Acesso negado! Faça login como organizador.', 'error');
        return;
    }

    showLoading(true);

    try {
        const snapshot = await new Promise((resolve) => {
            onValue(ref(database, 'participantes'), resolve, { onlyOnce: true });
        });
        
        const participantes = snapshot.val();
        
        if (!participantes || Object.keys(participantes).length < 2) {
            showLoading(false);
            showAlert('É necessário pelo menos 2 participantes para realizar o sorteio!', 'error');
            return;
        }

        const { resultado } = realizarSorteio(participantes);
        
        // Buscar dados dos participantes para pegar os telefones
        const telefonesPorNome = {};
        Object.values(participantes).forEach(p => {
            telefonesPorNome[p.nome] = p.whatsapp;
        });

        const resultadoDiv = document.getElementById('resultadoSorteio');
        const urlSite = window.location.href.split('?')[0];
        
        let html = '<div style="background: linear-gradient(135deg, #fff3cd, #ffeaa7); padding: 20px; border-radius: 12px; border: 3px dashed #ff9800; margin-bottom: 20px;">';
        html += '<h4 style="color: #ff6f00; margin-bottom: 10px;">🧪 SORTEIO DE TESTE (NÃO SALVO)</h4>';
        html += '<p style="color: #e65100; font-weight: 600;">⚠️ Este é apenas um teste! Os códigos abaixo NÃO foram salvos e NÃO funcionarão na consulta.</p>';
        html += '<p style="color: #e65100;">Use o botão "Sorteio Oficial" quando estiver pronto para realizar o sorteio definitivo.</p>';
        html += '</div>';
        
        html += '<h4 style="color: var(--cor-detalhe); margin-top: 20px;">📋 Prévia dos Códigos:</h4>';
        
        for (const [pessoa, dados] of Object.entries(resultado)) {
            const telefone = telefonesPorNome[pessoa];
            const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
            
            const mensagem = `🎁 *Olá, ${pessoa}!*%0A%0ASeu código do Amigo Secreto é:%0A%0A*${dados.codigo}*%0A%0AUse este código no site para descobrir quem você tirou!%0A%0A🔗 Acesse: ${urlSite}%0A%0A🎉 Boa sorte e capriche no presente!`;
            const linkWhatsApp = telefone ? `https://wa.me/55${telefoneNumeros}?text=${mensagem}` : '#';
            
            html += `
                <div class="sorteio-resultado" style="display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap; opacity: 0.7;">
                    <div style="flex: 1; min-width: 200px;">
                        <strong>👤 ${pessoa}</strong><br>
                        <strong style="color: #ff9800; font-size: 1.2em;">🔑 ${dados.codigo}</strong>
                    </div>
                    ${telefone ? `
                        <button disabled style="background: #ccc; color: #666; padding: 12px 25px; border-radius: 50px; border: none; cursor: not-allowed;">
                            📱 Teste (Desabilitado)
                        </button>
                    ` : '<span style="color: #999;">Sem WhatsApp</span>'}
                </div>
            `;
        }
        
        resultadoDiv.innerHTML = html;
        showLoading(false);
        showAlert('🧪 Sorteio de TESTE gerado! Este sorteio NÃO foi salvo. Use "Sorteio Oficial" quando estiver pronto.', 'info');
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao realizar sorteio de teste: ' + error.message, 'error');
        console.error(error);
    }
});

// ==========================================
// BOTÃO DE SORTEAR OFICIAL (SALVA NO FIREBASE)
// ==========================================

document.getElementById('btnSortear').addEventListener('click', async function() {
    if (!isAdminLogged) {
        showAlert('Acesso negado! Faça login como organizador.', 'error');
        return;
    }

    const confirmacao = confirm('⚠️ ATENÇÃO! Você está prestes a realizar o SORTEIO OFICIAL.\n\nEste sorteio será salvo e os códigos gerados serão os definitivos.\n\nTem certeza que todos os participantes já se inscreveram?');
    
    if (!confirmacao) {
        return;
    }

    showLoading(true);

    try {
        const snapshot = await new Promise((resolve) => {
            onValue(ref(database, 'participantes'), resolve, { onlyOnce: true });
        });
        
        const participantes = snapshot.val();
        
        if (!participantes || Object.keys(participantes).length < 2) {
            showLoading(false);
            showAlert('É necessário pelo menos 2 participantes para realizar o sorteio!', 'error');
            return;
        }

        const { resultado, codigos } = realizarSorteio(participantes);
        
        // Salvar resultado e códigos no Firebase
        await set(ref(database, 'sorteio'), {
            resultado: resultado,
            codigos: codigos,
            dataSorteio: new Date().toISOString()
        });
        
        showLoading(false);
        showAlert('🎲 Sorteio OFICIAL realizado com sucesso! Os códigos foram salvos. Clique em "Ver Resultados" para visualizar e enviar.', 'success');
        createConfetti();
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao realizar sorteio: ' + error.message, 'error');
        console.error(error);
    }
});

// ==========================================
// VER RESULTADO DO SORTEIO (ADMIN - COM CÓDIGOS E WHATSAPP)
// ==========================================

document.getElementById('btnVerSorteio').addEventListener('click', async function() {
    if (!isAdminLogged) {
        showAlert('Acesso negado! Faça login como organizador.', 'error');
        return;
    }

    showLoading(true);

    try {
        const snapshot = await new Promise((resolve) => {
            onValue(ref(database, 'sorteio'), resolve, { onlyOnce: true });
        });
        
        const sorteioData = snapshot.val();
        
        if (!sorteioData || !sorteioData.resultado) {
            showLoading(false);
            showAlert('Nenhum sorteio foi realizado ainda!', 'info');
            return;
        }

        // Buscar dados dos participantes para pegar os telefones
        const participantesSnapshot = await new Promise((resolve) => {
            onValue(ref(database, 'participantes'), resolve, { onlyOnce: true });
        });
        
        const participantesData = participantesSnapshot.val();
        
        // Criar mapa de nome -> telefone
        const telefonesPorNome = {};
        if (participantesData) {
            Object.values(participantesData).forEach(p => {
                telefonesPorNome[p.nome] = p.whatsapp;
            });
        }

        const resultado = sorteioData.resultado;
        const resultadoDiv = document.getElementById('resultadoSorteio');
        
        // Pegar URL atual do site
        const urlSite = window.location.href.split('?')[0]; // Remove query params se houver
        
        let html = '<h4 style="color: var(--cor-detalhe); margin-top: 20px;">📋 Códigos para Enviar:</h4>';
        html += '<p style="color: #666; margin-bottom: 15px;"><strong>⚠️ Importante:</strong> Clique no botão do WhatsApp para enviar o código para cada participante. <strong>Não compartilhe quem tirou quem!</strong></p>';
        
        for (const [pessoa, dados] of Object.entries(resultado)) {
            const telefone = telefonesPorNome[pessoa];
            const telefoneNumeros = telefone ? telefone.replace(/\D/g, '') : '';
            
            // Mensagem personalizada com nome da pessoa
            const mensagem = `🎁 *Olá, ${pessoa}!*%0A%0ASeu código do Amigo Secreto é:%0A%0A*${dados.codigo}*%0A%0AUse este código no site para descobrir quem você tirou!%0A%0A🔗 Acesse: ${urlSite}%0A%0A🎉 Boa sorte e capriche no presente!`;
            
            const linkWhatsApp = telefone ? `https://wa.me/55${telefoneNumeros}?text=${mensagem}` : '#';
            
            html += `
                <div class="sorteio-resultado" style="display: flex; justify-content: space-between; align-items: center; gap: 15px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <strong>👤 ${pessoa}</strong><br>
                        <strong style="color: #4CAF50; font-size: 1.2em;">🔑 ${dados.codigo}</strong>
                    </div>
                    ${telefone ? `
                        <a href="${linkWhatsApp}" target="_blank" rel="noopener noreferrer" 
                           style="background: linear-gradient(135deg, #25D366, #128C7E); 
                                  color: white; 
                                  padding: 12px 25px; 
                                  border-radius: 50px; 
                                  text-decoration: none; 
                                  font-weight: 700;
                                  display: inline-flex;
                                  align-items: center;
                                  gap: 8px;
                                  transition: all 0.3s ease;
                                  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                            <span style="font-size: 1.2em;">📱</span> Enviar no WhatsApp
                        </a>
                    ` : '<span style="color: #999;">Sem WhatsApp</span>'}
                </div>
            `;
        }
        
        resultadoDiv.innerHTML = html;
        showLoading(false);
        showAlert('Códigos carregados! Use os botões para enviar via WhatsApp.', 'success');
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao carregar resultado: ' + error.message, 'error');
        console.error(error);
    }
});

// ==========================================
// CONSULTAR AMIGO SECRETO (PARTICIPANTE)
// ==========================================

document.getElementById('btnConsultar').addEventListener('click', async function() {
    const codigo = document.getElementById('codigoConsulta').value.trim().toUpperCase();
    
    if (!codigo) {
        showAlert('Por favor, digite seu código de acesso!', 'error');
        return;
    }

    showLoading(true);

    try {
        const snapshot = await new Promise((resolve) => {
            onValue(ref(database, 'sorteio'), resolve, { onlyOnce: true });
        });
        
        const sorteioData = snapshot.val();
        
        if (!sorteioData || !sorteioData.codigos) {
            showLoading(false);
            showAlert('O sorteio ainda não foi realizado. Aguarde o organizador!', 'info');
            return;
        }

        const codigos = sorteioData.codigos;
        
        if (!codigos[codigo]) {
            showLoading(false);
            showAlert('Código inválido! Verifique se digitou corretamente.', 'error');
            return;
        }

        const dados = codigos[codigo];
        const resultadoDiv = document.getElementById('resultadoConsulta');
        
        // Garantir que estamos pegando o nome correto
        const nomeAmigoSecreto = dados.tirouNome || dados.dadosAmigo.nome;
        const sugestoesAmigo = dados.dadosAmigo.sugestoes;
        
        resultadoDiv.innerHTML = `
            <div class="resultado-amigo">
                <h4>🎉 Seu Amigo Secreto é:</h4>
                <div class="amigo-nome">🎁 ${nomeAmigoSecreto}</div>
                <div class="amigo-info">
                    <p><strong>💭 Sugestões de Presente:</strong></p>
                    <p style="font-size: 1.05em; line-height: 1.8;">${sugestoesAmigo}</p>
                </div>
                <p style="color: #666; margin-top: 15px; font-size: 0.9em; text-align: center;">
                    💝 Lembre-se: o presente deve custar entre R$ 20,00 e R$ 30,00. 
                    Capriche na criatividade!
                </p>
            </div>
        `;
        
        showLoading(false);
        createConfetti();
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao consultar: ' + error.message, 'error');
        console.error('Erro completo:', error);
    }
});

// Formatar código em tempo real
document.getElementById('codigoConsulta').addEventListener('input', function(e) {
    e.target.value = e.target.value.toUpperCase();
});


// ==========================================
// LIMPAR DADOS (ADMIN)
// ==========================================

document.getElementById('btnLimpar').addEventListener('click', async function() {
    if (!isAdminLogged) {
        showAlert('Acesso negado! Faça login como organizador.', 'error');
        return;
    }

    const confirmacao = confirm('⚠️ ATENÇÃO! Isso vai apagar TODOS os dados (participantes e sorteio). Tem certeza absoluta?');
    
    if (!confirmacao) {
        return;
    }

    showLoading(true);

    try {
        await remove(ref(database, 'participantes'));
        await remove(ref(database, 'sorteio'));
        
        document.getElementById('resultadoSorteio').innerHTML = '';
        document.getElementById('listaAdminParticipantes').innerHTML = '';
        
        showLoading(false);
        showAlert('✅ Todos os dados foram removidos com sucesso!', 'success');
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao limpar dados: ' + error.message, 'error');
        console.error(error);
    }
});
