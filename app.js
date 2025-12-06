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
// CARREGAR PARTICIPANTES (APENAS NOMES)
// ==========================================

onValue(ref(database, 'participantes'), (snapshot) => {
    const data = snapshot.val();
    const listaDiv = document.getElementById('listaParticipantes');
    const totalSpan = document.getElementById('totalParticipantes');
    
    if (data) {
        const participantes = Object.values(data);
        totalSpan.textContent = participantes.length;
        
        listaDiv.innerHTML = participantes.map(p => `
            <div class="participante-item">
                <strong>👤 ${p.nome}</strong>
            </div>
        `).join('');
    } else {
        totalSpan.textContent = '0';
        listaDiv.innerHTML = '<p style="text-align: center; color: #999;">Nenhum participante inscrito ainda.</p>';
    }
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
// BOTÃO DE SORTEAR (COM CÓDIGOS)
// ==========================================

document.getElementById('btnSortear').addEventListener('click', async function() {
    const senha = document.getElementById('senhaAdmin').value;
    
    if (senha !== SENHA_ADMIN) {
        showAlert('Senha incorreta! Apenas o organizador pode realizar o sorteio.', 'error');
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
        showAlert('🎲 Sorteio realizado com sucesso! Os códigos foram gerados. Clique em "Ver Resultado" para visualizar.', 'success');
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
    const senha = document.getElementById('senhaAdmin').value;
    
    if (senha !== SENHA_ADMIN) {
        showAlert('Senha incorreta! Apenas o organizador pode ver o resultado.', 'error');
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
// CONSULTAR AMIGO SECRETO (PARTICIPANTE - SEM TELEFONE)
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
// LIMPAR DADOS
// ==========================================

document.getElementById('btnLimpar').addEventListener('click', async function() {
    const senha = document.getElementById('senhaAdmin').value;
    
    if (senha !== SENHA_ADMIN) {
        showAlert('Senha incorreta! Apenas o organizador pode limpar os dados.', 'error');
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
        
        showLoading(false);
        showAlert('✅ Todos os dados foram removidos com sucesso!', 'success');
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao limpar dados: ' + error.message, 'error');
        console.error(error);
    }
});
