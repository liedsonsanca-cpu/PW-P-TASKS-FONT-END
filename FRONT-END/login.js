const form = document.getElementById('form-login');
const msgDiv = document.getElementById('mensagem');
const btnSubmit = document.getElementById('btn-entrar');
const API = 'http://localhost:4242';

function mostrarMensagem(texto, tipo) {
    msgDiv.textContent = texto;
    msgDiv.className = 'mensagem ' + tipo;
}

// Se já existe token guardado, redirecionar diretamente para tasks 
if (localStorage.getItem('token')) {
    window.location.href = 'tasks.html';
}

form.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'A entrar...';

    try {
        const resposta = await fetch(API + '/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                password 
            }),
        });
        const dados = await resposta.json();
        if (!resposta.ok) {
            mostrarMensagem(dados.message || 'Credenciais inválidas.', 'erro');
            return;
        }


        // ─── PASSO FUNDAMENTAL ─────────────────────────────────────── 
        // O servidor devolveu o token — guardamo-lo no localStorage 
        localStorage.setItem('token', dados.token); 
        // ─────────────────────────────────────────────────────────────

        mostrarMensagem('Login com sucesso! A redirecionar...', 'sucesso');
        setTimeout(() => {
            window.location.href = 'tasks.html';
        }, 1000);
    } catch (erro) {
        mostrarMensagem('Não foi possível ligar ao servidor.', 'erro');
    } finally {
        btnSubmit.disabled = false; 
        btnSubmit.textContent = 'Entrar';
    }
});