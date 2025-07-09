document.addEventListener('DOMContentLoaded', () => {
    const reel1 = document.getElementById('reel1');
    const reel2 = document.getElementById('reel2');
    const reel3 = document.getElementById('reel3');
    const balanceValue = document.getElementById('balance-value');
    const betValue = document.getElementById('bet-value');
    const betDownButton = document.getElementById('bet-down');
    const betUpButton = document.getElementById('bet-up');
    const spinButton = document.getElementById('spin-button');
    const messageDisplay = document.getElementById('message');

    let balance = 100.00;
    let currentBet = 1.00;
    const minBet = 0.50;
    const maxBet = 100.00;
    const betStep = 0.50;

    // --- Configuração de Áudio ---
    const audioPath = './audio/'; // Caminho para a pasta de áudio

    // Crie elementos de áudio
    const spinSound = new Audio(audioPath + 'spin.mp3'); // Certifique-se de ter spin.mp3
    const winSound = new Audio(audioPath + 'win.mp3');   // Certifique-se de ter win.mp3
    const loseSound = new Audio(audioPath + 'lose.mp3'); // Certifique-se de ter lose.mp3
    const buttonClickSound = new Audio(audioPath + 'button.mp3'); // Certifique-se de ter button.mp3

    // Opcional: Ajustar volume
    spinSound.volume = 1.0;
    winSound.volume = 0.8;
    loseSound.volume = 0.7;
    buttonClickSound.volume = 0.8;

    // Símbolos: Nome (para referência), Display (o que aparece), Multiplicador
    const symbols = [
        { name: 'cherry', display: '🍒', multiplier: 2 },
        { name: 'bell', display: '🔔', multiplier: 5 },
        { name: 'bar', display: '💲', multiplier: 10 },
        { name: 'seven', display: '7️⃣', multiplier: 20 },
        { name: 'wild', display: '🐯', multiplier: 50 } // O Tigre é o Wild e de maior valor
    ];

    // Atualiza a exibição de saldo e aposta
    function updateDisplay() {
        balanceValue.textContent = balance.toFixed(2);
        betValue.textContent = currentBet.toFixed(2);
        spinButton.disabled = balance < currentBet;
    }

    // Função para renderizar um símbolo na bobina
    function renderSymbol(reelElement, symbolObj) {
        reelElement.innerHTML = `<div class="symbol symbol-${symbolObj.name}">${symbolObj.display}</div>`;
    }

    // Seleciona um símbolo aleatório
    function getRandomSymbol() {
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    // Lógica do giro
    spinButton.addEventListener('click', () => {
        if (balance < currentBet) {
            showMessage("Saldo insuficiente para apostar!");
            return;
        }

        balance -= currentBet;
        updateDisplay();
        showMessage("Girando...");
        spinButton.disabled = true; // Desabilita o botão enquanto gira

        // Toca o som de giro
        spinSound.currentTime = 0; // Reinicia o som se já estiver tocando
        spinSound.play();

        const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

        // Animação de giro (simulada)
        let spinCount = 0;
        const maxSpins = 38; // Número de "quadros" para a animação
        const spinInterval = setInterval(() => {
            renderSymbol(reel1, getRandomSymbol());
            renderSymbol(reel2, getRandomSymbol());
            renderSymbol(reel3, getRandomSymbol());
            spinCount++;

            if (spinCount > maxSpins) {
                clearInterval(spinInterval);
                // Define os resultados finais
                renderSymbol(reel1, results[0]);
                renderSymbol(reel2, results[1]);
                renderSymbol(reel3, results[2]);
                checkWin(results);
                spinButton.disabled = false; // Habilita o botão novamente
            }
        }, 80); // Velocidade do giro
    });

    // Lógica de verificação de vitória
    function checkWin(results) {
        let winAmount = 0;
        let message = "Não foi desta vez!";

        // Condição de vitória: 3 símbolos iguais OU símbolos com Wild (Tigre)
        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        // Se todos são iguais
        if (s1.name === s2.name && s2.name === s3.name) {
            winAmount = s1.multiplier * currentBet;
            message = `🎉 TRIO DE ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        // Se há Wilds
        else if (s1.name === 'wild' && s2.name === s3.name) { // Wild no primeiro, outros dois iguais
            winAmount = s2.multiplier * currentBet * 1.5; // Multiplicador extra para Wild
            message = `🎉 WILD com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s2.name === 'wild' && s1.name === s3.name) { // Wild no meio, outros dois iguais
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s3.name === 'wild' && s1.name === s2.name) { // Wild no último, outros dois iguais
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        // Casos com dois wilds (ex: Wild, Wild, X ou Wild, X, Wild)
        else if (s1.name === 'wild' && s2.name === 'wild') {
            winAmount = s3.multiplier * currentBet * 2; // Multiplicador maior para dois Wilds
            message = `🤩 DOIS WILDS com ${s3.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s1.name === 'wild' && s3.name === 'wild') {
            winAmount = s2.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s2.name === 'wild' && s3.name === 'wild') {
            winAmount = s1.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        // Três Wilds é o maior prêmio!
        else if (s1.name === 'wild' && s2.name === 'wild' && s3.name === 'wild') {
            winAmount = symbols.find(s => s.name === 'wild').multiplier * currentBet * 3; // Super multiplicador
            message = `👑 FORTUNE TIGER! VOCÊ GANHOU O JACKPOT DE R$ ${winAmount.toFixed(2)}! 👑`;
        }


        if (winAmount > 0) {
            balance += winAmount;
            winSound.currentTime = 0;
            winSound.play(); // Toca som de vitória
        } else {
            loseSound.currentTime = 0;
            loseSound.play(); // Toca som de derrota
        }
        showMessage(message);
        updateDisplay();
    }

    // Botões de aposta
    betDownButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play(); // Toca som de clique
        if (currentBet > minBet) {
            currentBet = Math.max(minBet, currentBet - betStep);
            updateDisplay();
        }
    });

    betUpButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play(); // Toca som de clique
        if (currentBet < maxBet) {
            currentBet = Math.min(maxBet, currentBet + betStep);
            updateDisplay();
        }
    });

    // Exibe mensagens temporárias
    function showMessage(msg) {
        messageDisplay.textContent = msg;
        // Opcional: Limpar a mensagem após alguns segundos (descomente se quiser)
        // setTimeout(() => {
        //     messageDisplay.textContent = '';
        // }, 3000);
    }

    // Inicializa o jogo com símbolos aleatórios e atualiza display
    renderSymbol(reel1, getRandomSymbol());
    renderSymbol(reel2, getRandomSymbol());
    renderSymbol(reel3, getRandomSymbol());
    updateDisplay();
});
