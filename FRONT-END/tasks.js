const API = 'http://localhost:4242';
const listaEl = document.getElementById('lista-tasks');
const msgDiv = document.getElementById('mensagem');
const nomeEl = document.getElementById('nome-utilizador');
const inputNova = document.getElementById('nova-task');
const btnAdicionar = document.getElementById('btn-adicionar');
const btnSair = document.getElementById('btn-sair');
const descrip = document.getElementById('description')
const priorit = document.getElementById('priority')
const complete = document.getElementById('completed')

// ── 1. Verificar se o utilizador está autenticado ───────────────── // 
// Se não há token, redirecionar para o login imediatamente 
const token = localStorage.getItem('token'); 
if (!token) {
    window.location.href = 'login.html';
}

// ── 2. Função auxiliar: pedidos autenticados ────────────────────── 
// Esta função adiciona sempre o header Authorization com o token 
async function pedidoAPI(endpoint, opcoes = {}) {
    const resposta = await fetch(API + endpoint,
        {
            ...opcoes,
            headers: {
                'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token,
                ...opcoes.headers, 
            },
        });

    // Se o servidor devolver 401, o token expirou ou é inválido 
    if (resposta.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
    } return resposta;
}

// ── 3. Mostrar mensagem de feedback ────────────────────────────── 
function mostrarMensagem(texto, tipo) {
    msgDiv.textContent = texto;
    msgDiv.className = 'mensagem ' + tipo;
    setTimeout(() => {
        msgDiv.className = 'mensagem';
    }, 3000);
}

// ── 4. Carregar o perfil do utilizador ─────────────────────────── 
async function carregarPerfil() {
    try {
        const resposta = await pedidoAPI('/auth/profile');
        if (!resposta) return;
        const dados = await resposta.json();
        nomeEl.textContent = dados.name || dados.email;
    } catch (e) {
        console.error('Erro ao carregar perfil:', e);
    }
}

// ── 5. Renderizar a lista de tasks no HTML ──────────────────────── 
function renderizarTasks(tasks) {
    listaEl.innerHTML = '';
    // Limpar a lista atual 
    if (tasks.length === 0) {
        listaEl.innerHTML = '<li class="vazia">Ainda não tens tarefas. Adiciona uma acima!</li>';
        return;
    }

    tasks.forEach(function (task) {
        // Criar o elemento <li> para cada task 
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = ` <span class="task-titulo">${task.title}</span> 
                    <button class="perigo" data-id="${task.id}">Apagar</button> `;

        // Adicionar evento de clique ao botão Apagar 
        li.querySelector('button').addEventListener('click', function () {
            apagarTask(task.id);
        });
        listaEl.appendChild(li);
    });
}

// ── 6. Buscar todas as tasks à API ─────────────────────────────── 
async function carregarTasks() {
    listaEl.innerHTML = '<li class="vazia">A carregar...</li>';
    try {
        const resposta = await pedidoAPI('/tasks');
        if (!resposta) return;
        const dados = await resposta.json(); 
        renderizarTasks(dados);
    } catch (e) {
        mostrarMensagem('Erro ao carregar tarefas.', 'erro');
    }
}

// ── 7. Criar uma nova task ──────────────────────────────────────── 
async function criarTask() {
    const titulo = inputNova.value.trim();
    const description = descrip.value.trim();
    const priority = priorit.value.trim();
    const completed = complete.value === "true"
    if (!titulo) return;

    // Ignorar se o campo estiver vazio 
    btnAdicionar.disabled = true; 
    btnAdicionar.textContent = '...';
    try {
        const resposta = await pedidoAPI('/tasks', {
            method: 'POST',
            body: JSON.stringify({
                title: titulo,
                priority: priority,
                completed: completed,
                description: description
            }),
        });
        if (!resposta)
            return;
        if (!resposta.ok) {
            const dados = await resposta.json();
            mostrarMensagem(dados.message || 'Erro ao criar tarefa.', 'erro');
            return;
        }

        inputNova.value = '';

        // Limpar o campo de input 
        await carregarTasks();

        // Recarregar a lista 
        mostrarMensagem('Tarefa criada!', 'sucesso');
    }
    catch (e) {
        mostrarMensagem('Erro ao criar tarefa.', 'erro');
    } finally {
        btnAdicionar.disabled = false; 
        btnAdicionar.textContent = 'Adicionar';
    }
}

// ── 8. Apagar uma task ────────────────────────────────────────────
async function apagarTask(id) {
    if (!confirm('Tens a certeza que queres apagar esta tarefa?'))
        return;
    try {
        const resposta = await pedidoAPI('/tasks/' + id, {
            method: 'DELETE'
        });
        if (!resposta) return;
        if (!resposta.ok) {
            mostrarMensagem('Erro ao apagar tarefa.', 'erro');
            return;
        }
        await carregarTasks();

        // Recarregar a lista 
        mostrarMensagem('Tarefa apagada.', 'sucesso');
    } catch (e) {
        mostrarMensagem('Erro ao apagar tarefa.', 'erro');
    }
}

// ── 9. Eventos de interação ─────────────────────────────────────── 
// Botão Adicionar 
btnAdicionar.addEventListener('click', criarTask);
// Premir Enter no campo de input também cria a task 

inputNova.addEventListener('keydown',
    function (e) {
        if (e.key === 'Enter') criarTask();
    });

// Botão Sair — apaga o token e vai para o login 
btnSair.addEventListener('click', function () {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
});

// ── 10. Inicializar a página ────────────────────────────────────── 
carregarPerfil();
carregarTasks();