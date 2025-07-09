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
    const maxBet = 10.00;
    const betStep = 0.50;

    // --- Configuração de Áudio ---
    const audioPath = './audio/'; 

    const spinSound = new Audio(audioPath + 'spin.mp3'); 
    const winSound = new Audio(audioPath + 'win.mp3');   
    const loseSound = new Audio(audioPath + 'lose.mp3'); 
    const buttonClickSound = new Audio(audioPath + 'button.mp3'); 
    const bonusMusic = new Audio(audioPath + 'bonus_music.mp3'); // NOVA MÚSICA DE BÔNUS
    const mainMusic = new Audio(audioPath + 'main_music.mp3'); // Opcional: Música de fundo principal

    // Configurações de volume
    spinSound.volume = 0.9;
    winSound.volume = 0.8;
    loseSound.volume = 0.7;
    buttonClickSound.volume = 0.5;
    bonusMusic.volume = 0.6;
    mainMusic.volume = 0.2; // Ajuste conforme preferir

    // Loop da música principal (se você tiver uma)
    mainMusic.loop = true;
    bonusMusic.loop = true;

    // --- Variáveis do Bônus ---
    let inBonusRound = false;
    let bonusSpinsLeft = 0;
    const bonusChance = 0.05; // 5% de chance de ativar o bônus a cada giro
    const bonusSymbol = { name: 'wild', display: '🐯', multiplier: 50 }; // O símbolo do Tigre para o bônus
    const bonusMultiplier = 50; // Multiplicador se preencher a tela no bônus

    // Símbolos: Nome (para referência), Display (o que aparece), Multiplicador
    const symbols = [
        { name: 'cherry', display: '🍒', multiplier: 2 },
        { name: 'bell', display: '🔔', multiplier: 5 },
        { name: 'bar', display: '💲', multiplier: 10 },
        { name: 'seven', display: '7️⃣', multiplier: 20 },
        { name: 'wild', display: '🐯', multiplier: 50 } 
    ];

    // Atualiza a exibição de saldo e aposta
    function updateDisplay() {
        balanceValue.textContent = balance.toFixed(2);
        betValue.textContent = currentBet.toFixed(2);
        // Desabilita o botão de girar se não tiver saldo ou se estiver em bônus
        spinButton.disabled = balance < currentBet || inBonusRound; 
        // Desabilita botões de aposta durante o bônus
        betDownButton.disabled = inBonusRound;
        betUpButton.disabled = inBonusRound;
    }

    // Função para renderizar um símbolo na bobina
    function renderSymbol(reelElement, symbolObj) {
        reelElement.innerHTML = `<div class="symbol symbol-${symbolObj.name}">${symbolObj.display}</div>`;
    }

    // Seleciona um símbolo aleatório (ou o símbolo de bônus se estiver no bônus)
    function getRandomSymbol() {
        if (inBonusRound) {
            // No bônus, só pode vir o símbolo de bônus
            // Adiciona uma pequena chance de vir um símbolo "vazio" para não ser garantido
            // Ajuste 0.1 (10%) para a dificuldade do bônus
            return Math.random() < 0.9 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 }; 
        }
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    // Função para iniciar a música principal (chame isso ao iniciar o jogo)
    function playMainMusic() {
        mainMusic.currentTime = 0;
        mainMusic.play().catch(e => console.log("Música principal não pôde tocar automaticamente:", e));
    }

    // Lógica do giro
    spinButton.addEventListener('click', () => {
        // Se não estiver em bônus e não tiver saldo
        if (!inBonusRound && balance < currentBet) {
            showMessage("Saldo insuficiente para apostar!");
            return;
        }
        // Se não estiver em bônus, subtrai a aposta
        if (!inBonusRound) {
            balance -= currentBet;
        }
        
        updateDisplay();
        showMessage(inBonusRound ? `Bônus: ${bonusSpinsLeft} giros restantes...` : "Girando...");
        spinButton.disabled = true; // Desabilita o botão enquanto gira

        // Para o som principal e toca o som de giro
        spinSound.currentTime = 0; 
        spinSound.play();

        const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

        let spinCount = 0;
        const maxSpins = 36; // Ajustado para ~3 segundos
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
                
                // Verifica a vitória ou ativa o bônus
                if (inBonusRound) {
                    checkBonusWin(results);
                } else {
                    checkWin(results);
                    // Chance de ativar o bônus após um giro normal
                    if (Math.random() < bonusChance) {
                        startBonusRound();
                    }
                }
                spinButton.disabled = false; // Habilita o botão novamente
                // Retoma a música principal se não estiver em bônus
                if (!inBonusRound && mainMusic) mainMusic.play();
            }
        }, 80); 
    });

    // Lógica de verificação de vitória (giro normal)
    function checkWin(results) {
        let winAmount = 0;
        let message = "Não foi desta vez!";

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        if (s1.name === s2.name && s2.name === s3.name) {
            winAmount = s1.multiplier * currentBet;
            message = `🎉 TRIO DE ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === s3.name) { 
            winAmount = s2.multiplier * currentBet * 1.5; 
            message = `🎉 WILD com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s2.name === 'wild' && s1.name === s3.name) { 
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s3.name === 'wild' && s1.name === s2.name) { 
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === 'wild') {
            winAmount = s3.multiplier * currentBet * 2; 
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
        else if (s1.name === 'wild' && s2.name === 'wild' && s3.name === 'wild') {
            winAmount = symbols.find(s => s.name === 'wild').multiplier * currentBet * 3; 
            message = `👑 FORTUNE TIGER! VOCÊ GANHOU O JACKPOT DE R$ ${winAmount.toFixed(2)}! 👑`;
        }

        if (winAmount > 0) {
            balance += winAmount;
            winSound.currentTime = 0;
            winSound.play(); 
        } else {
            loseSound.currentTime = 0;
            loseSound.play(); 
        }
        showMessage(message);
        updateDisplay();
    }

    // --- Lógica do Bônus ---
    function startBonusRound() {
        inBonusRound = true;
        bonusSpinsLeft = 5; // 5 giros de bônus
        showMessage("🎉 BÔNUS ATIVADO! 🎉 Prepare-se para o Fortune Tiger!");
        
        // Para a música principal e toca a música de bônus
        if (mainMusic) mainMusic.pause();
        bonusMusic.currentTime = 0;
        bonusMusic.play();

        updateDisplay(); // Atualiza botões desabilitados
    }

    function checkBonusWin(results) {
        let bonusWinAmount = 0;
        let message = `Bônus: ${bonusSpinsLeft} giros restantes...`;

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        // Condição de vitória do bônus: todas as 3 bobinas com o símbolo de bônus
        if (s1.name === bonusSymbol.name && s2.name === bonusSymbol.name && s3.name === bonusSymbol.name) {
            bonusWinAmount = currentBet * bonusMultiplier;
            message = `🏆 FORTUNE TIGER COMPLETO! Você ganhou R$ ${bonusWinAmount.toFixed(2)}! 🏆`;
            balance += bonusWinAmount;
            winSound.currentTime = 0;
            winSound.play();
            endBonusRound(); // Termina o bônus imediatamente se ganhar
        } else {
            loseSound.currentTime = 0;
            loseSound.play(); // Som de "não ganhou" no bônus
            bonusSpinsLeft--;
            if (bonusSpinsLeft <= 0) {
                endBonusRound();
            }
        }
        showMessage(message);
        updateDisplay();
    }

    function endBonusRound() {
        inBonusRound = false;
        bonusSpinsLeft = 0;
        showMessage("Bônus Encerrado. Boa sorte no próximo giro!");
        
        // Para a música de bônus e retoma a música principal
        bonusMusic.pause();
        if (mainMusic) mainMusic.play();
        updateDisplay(); // Habilita botões novamente
    }

    // Botões de aposta
    betDownButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play(); 
        if (currentBet > minBet) {
            currentBet = Math.max(minBet, currentBet - betStep);
            updateDisplay();
        }
    });

    betUpButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play(); 
        if (currentBet < maxBet) {
            currentBet = Math.min(maxBet, currentBet + betStep);
            updateDisplay();
        }
    });

    // Exibe mensagens temporárias
    function showMessage(msg) {
        messageDisplay.textContent = msg;
    }

    // --- Inicialização do Jogo ---
    // Tenta tocar a música principal ao carregar a página
    // Isso pode falhar em alguns navegadores até a primeira interação do usuário
    playMainMusic(); 

    // Inicializa o jogo com símbolos aleatórios e atualiza display
    renderSymbol(reel1, getRandomSymbol());
    renderSymbol(reel2, getRandomSymbol());
    renderSymbol(reel3, getRandomSymbol());
    updateDisplay();
});
