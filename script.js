
alert("JavaScript está funcionando!"); // Este alerta deve aparecer ao carregar a página

document.addEventListener('DOMContentLoaded', () => {
    // Pegue apenas o botão de girar para este teste
    const spinButton = document.getElementById('spin-button');
    const messageDisplay = document.getElementById('message');

    if (spinButton) { // Verifica se o botão foi encontrado no HTML
        alert("Botão GIRAR encontrado!"); // Este alerta deve aparecer se o JS rodar e encontrar o botão

        spinButton.addEventListener('click', () => {
            alert("Botão GIRAR foi CLICADO!"); // Este alerta deve aparecer ao clicar no botão
            messageDisplay.textContent = "Você clicou no GIRAR!";
        });
    } else {
        alert("Erro: Botão GIRAR NÃO encontrado!"); // Se o botão não for encontrado
    }

    // Apenas para mostrar algo no saldo e aposta, já que o resto do JS não está ativo neste teste
    document.getElementById('balance-value').textContent = "TESTE";
    document.getElementById('bet-value').textContent = "TESTE";
});
