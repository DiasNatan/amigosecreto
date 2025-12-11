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
    if (!alertContainer) return;
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
    if (!loading) return;
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
    value = (value || '').replace(/\D/g, '');
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

        if (document.getElementById('days')) document.getElementById('days').textContent = String(days).padStart(2, '0');
        if (document.getElementById('hours')) document.getElementById('hours').textContent = String(hours).padStart(2, '0');
        if (document.getElementById('minutes')) document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
        if (document.getElementById('seconds')) document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    } else {
        if (document.getElementById('days')) document.getElementById('days').textContent = '00';
        if (document.getElementById('hours')) document.getElementById('hours').textContent = '00';
        if (document.getElementById('minutes')) document.getElementById('minutes').textContent = '00';
        if (document.getElementById('seconds')) document.getElementById('seconds').textContent = '00';
    }
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ==========================================
// FORMATAÇÃO DE TELEFONE
// ==========================================
const whatsappInput = document.getElementById('whatsapp');
if (whatsappInput) {
    whatsappInput.addEventListener('input', function(e) {
        e.target.value = formatPhone(e.target.value);
    });
}

// ==========================================
// INSCRIÇÃO DE PARTICIPANTES
// ==========================================
const inscricaoForm = document.getElementById('inscricaoForm');
if (inscricaoForm) {
    inscricaoForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const nomeEl = document.getElementById('nome');
        const whatsappEl = document.getElementById('whatsapp');
        const sugestoesEl = document.getElementById('sugestoes');
        const nome = nomeEl ? nomeEl.value.trim() : '';
        const whatsapp = whatsappEl ? whatsappEl.value.trim() : '';
        const sugestoes = sugestoesEl ? sugestoesEl.value.trim() : '';

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
            
            if (inscricaoForm) inscricaoForm.reset();
            
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao registrar inscrição: ' + (error.message || error), 'error');
            console.error(error);
        }
    });
}

// ==========================================
// CARREGAR PARTICIPANTES (APENAS NOMES)
// ==========================================
onValue(ref(database, 'participantes'), (snapshot) => {
    const data = snapshot.val();
    const listaDiv = document.getElementById('listaParticipantes');
    const totalSpan = document.getElementById('totalParticipantes');
    
    if (data) {
        const participantes = Object.values(data);
        if (totalSpan) totalSpan.textContent = participantes.length;
        
        if (listaDiv) {
            listaDiv.innerHTML = participantes.map(p => `
                <div class="participante-item">
                    <strong>👤 ${p.nome}</strong>
                </div>
            `).join('');
        }
    } else {
        if (totalSpan) totalSpan.textContent = '0';
        if (listaDiv) listaDiv.innerHTML = '<p style="text-align: center; color: #999;">Nenhum participante inscrito ainda.</p>';
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
// FUNÇÕES AUXILIARES DO ADMIN (LOGIN/LOGOUT)
// ==========================================
function adminLogin() {
    const senhaEl = document.getElementById('senhaAdmin');
    const senha = senhaEl ? senhaEl.value : '';
    if (senha !== SENHA_ADMIN) {
        showAlert('Senha incorreta! Apenas o organizador pode acessar o painel.', 'error');
        return;
    }

    // Mostrar painel e esconder login
    const adminPanel = document.getElementById('adminPanelCard');
    const adminLogin = document.getElementById('adminLoginCard');
    if (adminPanel) adminPanel.classList.remove('hidden');
    if (adminLogin) adminLogin.classList.add('hidden');

    // Limpar campo de senha por segurança
    if (senhaEl) senhaEl.value = '';

    showAlert('Acesso liberado! Bem-vindo ao painel do organizador. 🎉', 'success');
}

function adminLogout() {
    const adminPanel = document.getElementById('adminPanelCard');
    const adminLogin = document.getElementById('adminLoginCard');
    if (adminPanel) adminPanel.classList.add('hidden');
    if (adminLogin) adminLogin.classList.remove('hidden');

    showAlert('Você saiu do painel do organizador.', 'info');
}

// Vincular botões de login/logout (se existirem)
const btnAcessoAdmin = document.getElementById('btnAcessoAdmin');
if (btnAcessoAdmin) {
    btnAcessoAdmin.addEventListener('click', adminLogin);
}

const btnSairAdmin = document.getElementById('btnSairAdmin');
if (btnSairAdmin) {
    btnSairAdmin.addEventListener('click', adminLogout);
}

// ==========================================
// BOTÃO DE SORTEAR TESTE (NÃO SALVA NO FIREBASE)
// ==========================================
const btnSortearTeste = document.getElementById('btnSortearTeste');
if (btnSortearTeste) {
    btnSortearTeste.addEventListener('click', async function() {
        const senhaEl = document.getElementById('senhaAdmin');
        const senha = senhaEl ? senhaEl.value : '';

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
            
            if (resultadoDiv) resultadoDiv.innerHTML = html;
            showLoading(false);
            showAlert('🧪 Sorteio de TESTE gerado! Este sorteio NÃO foi salvo. Use "Sorteio OFICIAL" quando estiver pronto.', 'info');
            
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao realizar sorteio de teste: ' + (error.message || error), 'error');
            console.error(error);
        }
    });
}

// ==========================================
// BOTÃO DE SORTEAR OFICIAL (SALVA NO FIREBASE)
// ==========================================
const btnSortear = document.getElementById('btnSortear');
if (btnSortear) {
    btnSortear.addEventListener('click', async function() {
        const senhaEl = document.getElementById('senhaAdmin');
        const senha = senhaEl ? senhaEl.value : '';

        if (senha !== SENHA_ADMIN) {
            showAlert('Senha incorreta! Apenas o organizador pode realizar o sorteio.', 'error');
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
            showAlert('🎲 Sorteio OFICIAL realizado com sucesso! Os códigos foram salvos. Clique em "Ver Resultado" para visualizar e enviar.', 'success');
            createConfetti();
            
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao realizar sorteio: ' + (error.message || error), 'error');
            console.error(error);
        }
    });
}

// ==========================================
// VERIFICAR INTEGRIDADE DO SORTEIO
// ==========================================
async function verificarSorteioFlow() {
    const senhaEl = document.getElementById('senhaAdmin');
    const senha = senhaEl ? senhaEl.value : '';

    if (senha !== SENHA_ADMIN) {
        showAlert('Senha incorreta! Apenas o organizador pode verificar o sorteio.', 'error');
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
        const participantes = Object.keys(resultado);
        
        // VERIFICAÇÃO 1: Ninguém tirou a si mesmo
        let erroAutoSorteio = false;
        let pessoasComProblema = [];
        
        for (const pessoa of participantes) {
            if (pessoa === resultado[pessoa].tirouNome) {
                erroAutoSorteio = true;
                pessoasComProblema.push(pessoa);
            }
        }
        
        // VERIFICAÇÃO 2: Formar círculo único
        const visitados = new Set();
        let atual = participantes[0];
        let passos = 0;
        let formaCirculoUnico = true;
        
        while (passos < participantes.length) {
            visitados.add(atual);
            atual = resultado[atual].tirouNome;
            passos++;
            
            if (atual === participantes[0]) {
                // Voltou ao início
                if (visitados.size !== participantes.length) {
                    formaCirculoUnico = false;
                }
                break;
            }
        }
        
        // VERIFICAÇÃO 3: Todos os participantes têm um amigo secreto
        let todosTiramAlguem = participantes.every(p => resultado[p].tirouNome);
        
        // VERIFICAÇÃO 4: Todos são tirados por alguém
        const tirados = new Set(participantes.map(p => resultado[p].tirouNome));
        let todosSaoTirados = participantes.every(p => tirados.has(p));
        
        // Gerar relatório visual
        const resultadoDiv = document.getElementById('resultadoSorteio');
        
        let html = '<div style="background: white; padding: 25px; border-radius: 15px; margin-top: 20px;">';
        html += '<h4 style="color: var(--cor-primaria); margin-bottom: 20px; text-align: center;">📊 Relatório de Verificação do Sorteio</h4>';
        
        // Data do sorteio
        if (sorteioData.dataSorteio) {
            const data = new Date(sorteioData.dataSorteio);
            html += `<p style="text-align: center; color: #666; margin-bottom: 20px;">Sorteio realizado em: ${data.toLocaleString('pt-BR')}</p>`;
        }
        
        html += '<div style="display: grid; gap: 15px;">';
        
        // Check 1
        html += `
            <div style="padding: 15px; border-radius: 10px; ${erroAutoSorteio ? 'background: #f8d7da; border-left: 4px solid #dc3545;' : 'background: #d4edda; border-left: 4px solid #28a745;'}">
                <strong>${erroAutoSorteio ? '❌' : '✅'} Verificação 1: Ninguém tirou a si mesmo</strong>
                ${erroAutoSorteio ? `<p style="color: #721c24; margin-top: 10px;">⚠️ ERRO! As seguintes pessoas tiraram a si mesmas: ${pessoasComProblema.join(', ')}</p>` : '<p style="color: #155724; margin-top: 10px;">Todos os participantes tiraram pessoas diferentes!</p>'}
            </div>
        `;
        
        // Check 2
        html += `
            <div style="padding: 15px; border-radius: 10px; ${formaCirculoUnico ? 'background: #d4edda; border-left: 4px solid #28a745;' : 'background: #f8d7da; border-left: 4px solid #dc3545;'}">
                <strong>${formaCirculoUnico ? '✅' : '❌'} Verificação 2: Forma um círculo único</strong>
                ${formaCirculoUnico ? '<p style="color: #155724; margin-top: 10px;">Perfeito! O sorteio forma um círculo completo.</p>' : '<p style="color: #721c24; margin-top: 10px;">⚠️ ERRO! O sorteio forma múltiplos círculos separados.</p>'}
                <p style="margin-top: 10px; color: #666;">Passos visitados: ${visitados.size} de ${participantes.length}</p>
            </div>
        `;
        
        // Check 3
        html += `
            <div style="padding: 15px; border-radius: 10px; ${todosTiramAlguem ? 'background: #d4edda; border-left: 4px solid #28a745;' : 'background: #f8d7da; border-left: 4px solid #dc3545;'}">
                <strong>${todosTiramAlguem ? '✅' : '❌'} Verificação 3: Todos tiraram alguém</strong>
                ${todosTiramAlguem ? '<p style="color: #155724; margin-top: 10px;">Todos os participantes têm um amigo secreto!</p>' : '<p style="color: #721c24; margin-top: 10px;">⚠️ ERRO! Alguns participantes não tiraram ninguém.</p>'}
            </div>
        `;
        
        // Check 4
        html += `
            <div style="padding: 15px; border-radius: 10px; ${todosSaoTirados ? 'background: #d4edda; border-left: 4px solid #28a745;' : 'background: #f8d7da; border-left: 4px solid #dc3545;'}">
                <strong>${todosSaoTirados ? '✅' : '❌'} Verificação 4: Todos foram tirados por alguém</strong>
                ${todosSaoTirados ? '<p style="color: #155724; margin-top: 10px;">Todos receberão um presente!</p>' : '<p style="color: #721c24; margin-top: 10px;">⚠️ ERRO! Alguns participantes não foram tirados por ninguém.</p>'}
            </div>
        `;
        
        html += '</div>';
        
        // Resumo final
        const tudoCerto = !erroAutoSorteio && formaCirculoUnico && todosTiramAlguem && todosSaoTirados;
        
        html += `
            <div style="margin-top: 25px; padding: 20px; border-radius: 10px; text-align: center; ${tudoCerto ? 'background: linear-gradient(135deg, #d4edda, #c3e6cb);' : 'background: linear-gradient(135deg, #f8d7da, #f5c6cb);'}">
                <h3 style="margin-bottom: 10px;">${tudoCerto ? '🎉 SORTEIO VÁLIDO!' : '⚠️ SORTEIO COM PROBLEMAS!'}</h3>
                <p style="font-size: 1.1em;">${tudoCerto ? 'O sorteio está perfeito e pode ser usado!' : 'Há problemas no sorteio. Recomenda-se fazer um novo sorteio!'}</p>
            </div>
        `;
        
        // Mostrar sequência do círculo
        if (formaCirculoUnico) {
            html += '<div style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 10px;">';
            html += '<h4 style="color: var(--cor-primaria); margin-bottom: 15px; text-align: center;">🔄 Sequência do Círculo</h4>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center;">';
            
            let atualSeq = participantes[0];
            let count = 0;
            do {
                html += `<div style="background: white; padding: 10px 15px; border-radius: 8px; border: 2px solid var(--cor-secundaria); font-weight: 600;">${atualSeq}</div>`;
                html += '<div style="font-size: 1.5em;">→</div>';
                atualSeq = resultado[atualSeq].tirouNome;
                count++;
                if (count > participantes.length) break; // Segurança contra loop infinito
            } while (atualSeq !== participantes[0]);
            
            html += `<div style="background: white; padding: 10px 15px; border-radius: 8px; border: 2px solid var(--cor-sucesso); font-weight: 600;">${participantes[0]}</div>`;
            html += '</div></div>';
        }
        
        html += '</div>';
        
        if (resultadoDiv) resultadoDiv.innerHTML = html;
        showLoading(false);
        
        if (tudoCerto) {
            showAlert('✅ Sorteio verificado! Está tudo correto!', 'success');
        } else {
            showAlert('⚠️ Problemas detectados no sorteio! Veja o relatório abaixo.', 'error');
        }
        
    } catch (error) {
        showLoading(false);
        showAlert('Erro ao verificar sorteio: ' + (error.message || error), 'error');
        console.error(error);
    }
}

const btnVerificar = document.getElementById('btnVerificar') || document.getElementById('btnVerificarSorteio');
if (btnVerificar) {
    btnVerificar.addEventListener('click', verificarSorteioFlow);
}

// ==========================================
// VER RESULTADO DO SORTEIO (ADMIN - COM CÓDIGOS E WHATSAPP)
// ==========================================
const btnVerSorteio = document.getElementById('btnVerSorteio');
if (btnVerSorteio) {
    btnVerSorteio.addEventListener('click', async function() {
        const senhaEl = document.getElementById('senhaAdmin');
        const senha = senhaEl ? senhaEl.value : '';

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
            
            if (resultadoDiv) resultadoDiv.innerHTML = html;
            showLoading(false);
            showAlert('Códigos carregados! Use os botões para enviar via WhatsApp.', 'success');
            
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao carregar resultado: ' + (error.message || error), 'error');
            console.error(error);
        }
    });
}

// ==========================================
// CONSULTAR AMIGO SECRETO (PARTICIPANTE - SEM TELEFONE)
// ==========================================
const btnConsultar = document.getElementById('btnConsultar');
if (btnConsultar) {
    btnConsultar.addEventListener('click', async function() {
        const codigoInput = document.getElementById('codigoConsulta');
        const codigo = codigoInput ? codigoInput.value.trim().toUpperCase() : '';
        
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
            const nomeAmigoSecreto = dados.tirouNome || (dados.dadosAmigo && dados.dadosAmigo.nome) || '—';
            const sugestoesAmigo = (dados.dadosAmigo && dados.dadosAmigo.sugestoes) || '';

            if (resultadoDiv) {
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
            }
            
            showLoading(false);
            createConfetti();
            
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao consultar: ' + (error.message || error), 'error');
            console.error('Erro completo:', error);
        }
    });
}

// Formatar código em tempo real
const codigoConsultaEl = document.getElementById('codigoConsulta');
if (codigoConsultaEl) {
    codigoConsultaEl.addEventListener('input', function(e) {
        e.target.value = e.target.value.toUpperCase();
    });
}

// ==========================================
// LIMPAR DADOS (APAGAR PARTICIPANTES E SORTEIO)
// ==========================================
const btnLimpar = document.getElementById('btnLimpar');
if (btnLimpar) {
    btnLimpar.addEventListener('click', async function() {
        const senhaEl = document.getElementById('senhaAdmin');
        const senha = senhaEl ? senhaEl.value : '';

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
            
            const resultadoDiv = document.getElementById('resultadoSorteio');
            if (resultadoDiv) resultadoDiv.innerHTML = '';
            
            showLoading(false);
            showAlert('✅ Todos os dados foram removidos com sucesso!', 'success');
            
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao limpar dados: ' + (error.message || error), 'error');
            console.error(error);
        }
    });
}

// ==========================================
// APAGAR ÚLTIMO SORTEIO (btnApagarSorteio)
// ==========================================
const btnApagarSorteio = document.getElementById('btnApagarSorteio');
if (btnApagarSorteio) {
    btnApagarSorteio.addEventListener('click', async function() {
        const senhaEl = document.getElementById('senhaAdmin');
        const senha = senhaEl ? senhaEl.value : '';

        if (senha !== SENHA_ADMIN) {
            showAlert('Senha incorreta! Apenas o organizador pode apagar o sorteio.', 'error');
            return;
        }

        const confirmacao = confirm('⚠️ Deseja apagar o sorteio atual? Isso removerá os códigos salvos (não os participantes).');
        if (!confirmacao) return;

        showLoading(true);
        try {
            await remove(ref(database, 'sorteio'));
            const resultadoDiv = document.getElementById('resultadoSorteio');
            if (resultadoDiv) resultadoDiv.innerHTML = '';
            showLoading(false);
            showAlert('✅ Sorteio apagado com sucesso!', 'success');
        } catch (error) {
            showLoading(false);
            showAlert('Erro ao apagar sorteio: ' + (error.message || error), 'error');
            console.error(error);
        }
    });
}

// ==========================================
// INICIALIZAÇÃO: garantir estado do painel
// ==========================================
(function initAdminVisibility() {
    const adminPanel = document.getElementById('adminPanelCard');
    const adminLogin = document.getElementById('adminLoginCard');

    // Se painel existir, garantir que esteja oculto inicialmente (HTML já aplica .hidden, mas reforçamos)
    if (adminPanel) adminPanel.classList.add('hidden');
    if (adminLogin) adminLogin.classList.remove('hidden');
})();
