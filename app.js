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
// CARREGAR PARTICIPANTES
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
                <strong>👤 ${p.nome}</strong><br>
                📱 ${p.whatsapp}
            </div>
        `).join('');
    } else {
        totalSpan.textContent = '0';
        listaDiv.innerHTML = '<p style="text-align: center; color: #999;">Nenhum participante inscrito ainda.</p>';
    }
});

// ==========================================
// ALGORITMO DE SORTEIO
// ==========================================

function realizarSorteio(participantes) {
    const nomes = Object.keys(participantes);
    const n = nomes.length;
    
    if (n < 2) {
        throw new Error('É necessário pelo menos 2 participantes para o sorteio!');
    }

    let sorteados = [...nomes];
    let tentativas = 0;
    const maxTentativas = 100;
    
    while (tentativas < maxTentativas) {
        sorteados = [...nomes];
        
        // Embaralhamento Fisher-Yates
        for (let i = sorteados.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sorteados[i], sorteados[j]] = [sorteados[j], sorteados[i]];
        }
        
        // Verificar se ninguém tirou a si mesmo
        let valido = true;
        for (let i = 0; i < n; i++) {
            if (nomes[i] === sorteados[i]) {
                valido = false;
                break;
            }
        }
        
        if (valido) {
            const resultado = {};
            for (let i = 0; i < n; i++) {
                resultado[nomes[i]] = {
                    tirouNome: sorteados[i],
                    dadosAmigo: participantes[sorteados[i]]
                };
            }
            return resultado;
        }
        
        tentativas++;
    }
    
    throw new Error('Não foi possível realizar um sorteio válido. Tente novamente!');
}

// ==========================================
// BOTÃO DE SORTEAR
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

        const resultado = realizarSorteio(participantes);
        
        await set(ref(database, 'sorteio'), {
            resultado: resultado,
            dataSorteio: new Date().toISOString()
        });
        
        showLoading(false);
        showAlert('🎲 Sorteio realizado com sucesso! Clique em "Ver Resultado" para visualizar.', 'success');
        createConfetti();
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao realizar sorteio: ' + error.message, 'error');
        console.error(error);
    }
});

// ==========================================
// VER RESULTADO DO SORTEIO
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

        const resultado = sorteioData.resultado;
        const resultadoDiv = document.getElementById('resultadoSorteio');
        
        let html = '<h4 style="color: var(--cor-detalhe); margin-top: 20px;">📋 Resultado do Sorteio:</h4>';
        
        for (const [pessoa, dados] of Object.entries(resultado)) {
            html += `
                <div class="sorteio-resultado">
                    <strong>🎁 ${pessoa}</strong> tirou <strong style="color: var(--cor-acento);">${dados.tirouNome}</strong><br>
                    📱 WhatsApp: ${dados.dadosAmigo.whatsapp}<br>
                    💭 Sugestões: ${dados.dadosAmigo.sugestoes}
                </div>
            `;
        }
        
        resultadoDiv.innerHTML = html;
        showLoading(false);
        showAlert('Resultado carregado! Role para baixo para ver.', 'success');
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao carregar resultado: ' + error.message, 'error');
        console.error(error);
    }
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