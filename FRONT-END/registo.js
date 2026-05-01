// Selecionar elementos do DOM pelo seu id 
const form = document.getElementById('form-registo');
const msgDiv = document.getElementById('mensagem');
const btnSubmit = document.getElementById('btn-registar');

// URL base do backend — ajusta se a porta for diferente 

const API = 'http://localhost:4242';

// Função auxiliar: mostra uma mensagem de erro ou sucesso 
function mostrarMensagem(texto, tipo) {
    msgDiv.textContent = texto;
    msgDiv.className = 'mensagem ' + tipo; // 'erro' ou 'sucesso' 
}

// Ouvir o evento 'submit' do formulário 
form.addEventListener('submit', async function (evento) {
    // Impede o comportamento padrão do browser (recarregar a página) 
    evento.preventDefault();

    // Ler os valores dos campos 
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Desativar o botão enquanto o pedido está a ser feito 
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'A criar conta...';
    try {
        // Fazer o pedido POST à API 
        const resposta = await fetch(API + '/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nome,
                email,
                password
            }),
        });

        // Converter a resposta para JSON 
        const dados = await resposta.json();
        if (!resposta.ok) {

            // O servidor devolveu um erro (ex: email já existe) 
            mostrarMensagem(dados.message || 'Erro ao criar conta.', 'erro');
            return;
        }

        // Sucesso — mostrar mensagem e redirecionar para o login 
        mostrarMensagem('Conta criada! A redirecionar...', 'sucesso');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (erro) {
        // Erro de rede (ex: servidor não está a correr) 
        mostrarMensagem('Não foi possível ligar ao servidor.', 'erro');
    } finally {
        // Reativar o botão independentemente do resultado 
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Criar conta';
    }
});