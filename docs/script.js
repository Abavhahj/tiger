document.addEventListener('DOMContentLoaded', () => {
    const reel1 = document.getElementById('reel1');
    const reel2 = document.getElementById('reel2');
    const reel3 = document.getElementById('reel3');
    const balanceValue = document.getElementById('balance-value');
    const betValueDisplayInGameInfo = document.getElementById('bet-value'); // Elemento da aposta no cabeçalho
    const betValueDisplayInControls = document.querySelector('.current-bet-display'); // Elemento da aposta nos controles
    const betDownButton = document.getElementById('bet-down');
    const betUpButton = document.getElementById('bet-up');
    const spinButton = document.getElementById('spin-button');
    const messageDisplay = document.getElementById('message');
    const turboButton = document.getElementById('turbo-button');
    const autoSpinButton = document.getElementById('auto-spin-button');

    // Elementos da tela de Mega Ganho
    const megaWinScreen = document.getElementById('mega-win-screen');
    const megaWinAmountDisplay = document.getElementById('mega-win-amount');
    
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
    const bonusMusic = new Audio(audioPath + 'bonus_music.mp3');
    const mainMusic = new Audio(audioPath + 'main_music.mp3'); 
    const megaWinSound = new Audio(audioPath + 'mega_win_sound.mp3');

    // Configurações de volume
    spinSound.volume = 0.7;
    winSound.volume = 0.8;
    loseSound.volume = 0.7;
    buttonClickSound.volume = 0.5;
    bonusMusic.volume = 0.6;
    mainMusic.volume = 0.2;
    megaWinSound.volume = 0.8;

    mainMusic.loop = true;
    bonusMusic.loop = true;
    megaWinSound.loop = true; // O som de mega ganho repete até ser fechado

    // --- Variáveis do Bônus ---
    let inBonusRound = false;
    let bonusSpinsLeft = 0;
    const bonusChance = 0.05; // 5% de chance de ativar o bônus a cada giro
    const bonusSymbol = { name: 'wild', display: '🐯', multiplier: 50 };
    const bonusMultiplier = 50;

    // --- Variáveis de Turbo e Auto-Spin ---
    let isTurboMode = false;
    let isAutoSpin = false;
    let spinDuration = 3040; // Duração normal do spin em ms (38 * 80)
    let turboSpinDuration = 1000; // Duração do spin em modo turbo em ms
    let isMegaWinAnimating = false; // Flag para controlar se a animação de mega ganho está ativa
    let megaWinTimeoutId; // NOVO: ID para o setTimeout do Mega Ganho

    // Símbolos
    const symbols = [
        { name: 'cherry', display: '🍒', multiplier: 2 },
        { name: 'bell', display: '🔔', multiplier: 5 },
        { name: 'bar', display: '💲', multiplier: 10 },
        { name: 'seven', display: '7️⃣', multiplier: 20 },
        { name: 'wild', display: '🐯', multiplier: 50 }
    ];

    // Atualiza a exibição de saldo e aposta e estado dos botões
    function updateDisplay() {
        balanceValue.textContent = balance.toFixed(2);
        // Atualiza AMBOS os spans de valor da aposta
        betValueDisplayInGameInfo.textContent = currentBet.toFixed(2); 
        betValueDisplayInControls.textContent = currentBet.toFixed(2); 
        
        const disableSpinAndBet = inBonusRound || isAutoSpin || isMegaWinAnimating; // Desabilita durante mega ganho

        spinButton.disabled = disableSpinAndBet || balance < currentBet;
        betDownButton.disabled = disableSpinAndBet;
        betUpButton.disabled = disableSpinAndBet;
        
        // Botões Turbo e Auto
        turboButton.disabled = inBonusRound || isMegaWinAnimating; // Desabilita durante mega ganho
        autoSpinButton.disabled = inBonusRound || isMegaWinAnimating; // Desabilita durante mega ganho

        // Atualiza classe 'active' e texto para botões de turbo/auto
        if (isTurboMode) {
            turboButton.classList.add('active');
            turboButton.textContent = 'TURBO ATIVO';
        } else {
            turboButton.classList.remove('active');
            turboButton.textContent = 'TURBO';
        }
        if (isAutoSpin) {
            autoSpinButton.classList.add('active');
            autoSpinButton.textContent = 'AUTO ATIVO';
        } else {
            autoSpinButton.classList.remove('active');
            autoSpinButton.textContent = 'AUTO';
        }
    }

    // Renderiza um símbolo na bobina, controlando se deve animar
    function renderSymbol(reelElement, symbolObj, animating = false) {
        reelElement.innerHTML = `<div class="symbol symbol-${symbolObj.name}">${symbolObj.display}</div>`;
        const symbolDiv = reelElement.querySelector('.symbol');
        if (animating) {
            symbolDiv.classList.add('animating'); // Adiciona classe para animar
        } else {
            symbolDiv.classList.remove('animating'); // Remove ao parar
        }
    }

    // Seleciona um símbolo aleatório
    function getRandomSymbol() {
        if (inBonusRound) {
            return Math.random() < 0.9 ? bonusSymbol : { name: 'empty', display: ' ', multiplier: 0 };
        }
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    // Toca a música principal
    function playMainMusic() {
        mainMusic.currentTime = 0;
        mainMusic.play().catch(e => console.log("Música principal não pôde tocar automaticamente:", e));
    }

    // Função principal de giro
    function performSpin() {
        if (!inBonusRound && balance < currentBet) {
            showMessage("Saldo insuficiente para apostar!");
            stopAutoSpin();
            return;
        }
        if (!inBonusRound) {
            balance -= currentBet;
        }

        updateDisplay();
        showMessage(inBonusRound ? `Bônus: ${bonusSpinsLeft} giros restantes...` : "Girando...");
        
        spinButton.disabled = true;

        spinSound.currentTime = 0;
        spinSound.play();

        const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

        let spinCount = 0;
        const currentSpinDuration = isTurboMode ? turboSpinDuration : spinDuration;
        const intervalStep = 80;
        const maxSpins = Math.floor(currentSpinDuration / intervalStep); 

        const spinInterval = setInterval(() => {
            renderSymbol(reel1, getRandomSymbol(), true); // Anima durante o giro
            renderSymbol(reel2, getRandomSymbol(), true);
            renderSymbol(reel3, getRandomSymbol(), true);
            spinCount++;

            if (spinCount > maxSpins) {
                clearInterval(spinInterval);
                renderSymbol(reel1, results[0], false); // Para a animação no resultado final
                renderSymbol(reel2, results[1], false);
                renderSymbol(reel3, results[2], false);
                
                if (inBonusRound) {
                    checkBonusWin(results);
                } else {
                    checkWin(results);
                    if (Math.random() < bonusChance) {
                        startBonusRound();
                    }
                }
                // Habilita o botão apenas se não estiver em animação de mega ganho
                if (!isMegaWinAnimating) { 
                    spinButton.disabled = false; 
                }
                if (!inBonusRound && mainMusic) mainMusic.play(); 

                if (isAutoSpin && !inBonusRound && !isMegaWinAnimating) { // Não inicia auto-spin se estiver em mega ganho
                    setTimeout(performSpin, 500); 
                }
            }
        }, intervalStep);
    }

    // Lógica de verificação de vitória (giro normal)
    function checkWin(results) {
        let winAmount = 0;
        let message = "Não foi desta vez!";

        const s1 = results[0];
        const s2 = results[1];
        const s3 = results[2];

        // Condições de vitória
        if (s1.name === s2.name && s2.name === s3.name) {
            winAmount = s1.multiplier * currentBet;
            message = `🎉 TRIO DE ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === s3.name && s2.name !== 'wild') {
            winAmount = s2.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s2.name === 'wild' && s1.name === s3.name && s1.name !== 'wild') {
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s3.name === 'wild' && s1.name === s2.name && s1.name !== 'wild') {
            winAmount = s1.multiplier * currentBet * 1.5;
            message = `🎉 WILD com ${s1.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🎉`;
        }
        else if (s1.name === 'wild' && s2.name === 'wild' && s3.name !== 'wild') {
            winAmount = s3.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s3.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s1.name === 'wild' && s3.name === 'wild' && s2.name !== 'wild') {
            winAmount = s2.multiplier * currentBet * 2;
            message = `🤩 DOIS WILDS com ${s2.display}! Você ganhou R$ ${winAmount.toFixed(2)}! 🤩`;
        }
        else if (s2.name === 'wild' && s3.name === 'wild' && s1.name !== 'wild') {
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

            // Lógica para Mega Ganho
            if (winAmount >= (currentBet * 8) && winAmount >= 50) { // 8x a aposta E mínimo de R$50
                console.log("Condições para Mega Ganho atendidas! Chamando showMegaWin(). Ganho:", winAmount.toFixed(2), "Aposta:", currentBet.toFixed(2));
                showMegaWin(winAmount);
            } else {
                console.log("Condições para Mega Ganho NÃO atendidas. Ganho:", winAmount.toFixed(2), "Aposta:", currentBet.toFixed(2), "Multiplicador de ganho:", (winAmount / currentBet).toFixed(2));
                showMessage(message);
            }
        } else {
            loseSound.currentTime = 0;
            loseSound.play();
            showMessage(message);
        }
        updateDisplay();
    }

    // --- Lógica do Bônus ---
    function startBonusRound() {
        inBonusRound = true;
        bonusSpinsLeft = 5; // 5 giros de bônus
        showMessage("🎉 BÔNUS ATIVADO! 🎉 Prepare-se para o Fortune Tiger!");

        stopAutoSpin(); // Para auto-spin ao entrar no bônus

        if (mainMusic) mainMusic.pause();
        bonusMusic.currentTime = 0;
        bonusMusic.play();

        updateDisplay();
        setTimeout(performSpin, 1000); // Pequeno delay para a música do bônus começar
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
            // Lógica para Mega Ganho no bônus
            if (bonusWinAmount >= (currentBet * 8) && bonusWinAmount >= 50) {
                console.log("Condições para Mega Ganho (Bônus) atendidas! Chamando showMegaWin(). Ganho:", bonusWinAmount.toFixed(2), "Aposta:", currentBet.toFixed(2));
                showMegaWin(bonusWinAmount, true); // true indica que é do bônus, para encerrá-lo depois
            } else {
                console.log("Condições para Mega Ganho (Bônus) NÃO atendidas. Ganho:", bonusWinAmount.toFixed(2), "Aposta:", currentBet.toFixed(2), "Multiplicador de ganho:", (bonusWinAmount / currentBet).toFixed(2));
                endBonusRound(); // Termina o bônus imediatamente se ganhar, mas não foi mega
            }
        } else {
            loseSound.currentTime = 0;
            loseSound.play();
            bonusSpinsLeft--;
            if (bonusSpinsLeft <= 0) {
                endBonusRound();
            }
        }
        showMessage(message);
        updateDisplay();

        if (inBonusRound && bonusSpinsLeft > 0 && !isMegaWinAnimating) {
            setTimeout(performSpin, 500);
        }
    }

    function endBonusRound() {
        inBonusRound = false;
        bonusSpinsLeft = 0;
        showMessage("Bônus Encerrado. Boa sorte no próximo giro!");

        bonusMusic.pause();
        bonusMusic.currentTime = 0;
        if (mainMusic) mainMusic.play();
        updateDisplay();
    }

    // --- Lógica de Mega Ganho ---
    let animationInterval; // Para o contador
    let currentCountedAmount = 0;
    let targetMegaWinAmount = 0;
    let finishMegaWinCallback = null; // Callback para quando a animação terminar (ex: fim do bônus)

    function showMegaWin(amount, fromBonus = false) {
        isMegaWinAnimating = true;
        targetMegaWinAmount = amount;
        currentCountedAmount = 0;
        megaWinAmountDisplay.textContent = `R$ 0.00`;
        megaWinScreen.classList.add('active'); // Mostra a tela de mega ganho

        if (mainMusic) mainMusic.pause();
        if (bonusMusic) bonusMusic.pause();
        megaWinSound.currentTime = 0;
        megaWinSound.play();

        // Faz o valor subir
        const duration = 3000; // 3 segundos para o contador subir
        const steps = 100; // Quantidade de passos
        const increment = targetMegaWinAmount / steps;
        let stepCount = 0;

        animationInterval = setInterval(() => {
            currentCountedAmount += increment;
            stepCount++;
            if (stepCount >= steps) {
                currentCountedAmount = targetMegaWinAmount; // Garante que o valor final seja exato
                clearInterval(animationInterval);
                animationInterval = null; // Limpa o intervalo
                
                // NOVO: Define um timeout para esconder a tela após 30 segundos, se não for clicado
                megaWinTimeoutId = setTimeout(() => hideMegaWin(fromBonus), 30000); 
            }
            megaWinAmountDisplay.textContent = `R$ ${currentCountedAmount.toFixed(2)}`;
        }, duration / steps);

        // Permite pular clicando na tela
        megaWinScreen.addEventListener('click', skipMegaWin, { once: true });

        if (fromBonus) {
            finishMegaWinCallback = () => {
                endBonusRound();
            };
        }
        updateDisplay(); // Atualiza estado dos botões
    }

    function skipMegaWin() {
        // Limpa o timeout de auto-fechamento do Mega Ganho se ele estiver ativo
        if (megaWinTimeoutId) {
            clearTimeout(megaWinTimeoutId);
            megaWinTimeoutId = null;
        }

        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
        }
        currentCountedAmount = targetMegaWinAmount; // Seta o valor direto
        megaWinAmountDisplay.textContent = `R$ ${targetMegaWinAmount.toFixed(2)}`;
        
        hideMegaWin(finishMegaWinCallback !== null); // Chama hideMegaWin imediatamente
    }

    function hideMegaWin(wasBonusRound) {
        megaWinScreen.classList.remove('active'); // Oculta a tela
        isMegaWinAnimating = false;
        megaWinSound.pause(); // Para o som do mega ganho
        megaWinSound.currentTime = 0;

        // Garante que qualquer timeout pendente seja limpo
        if (megaWinTimeoutId) {
            clearTimeout(megaWinTimeoutId);
            megaWinTimeoutId = null;
        }

        if (wasBonusRound && finishMegaWinCallback) {
            finishMegaWinCallback(); // Chama o callback para encerrar o bônus
            finishMegaWinCallback = null;
        } else {
            if (mainMusic) mainMusic.play(); // Volta a música principal se não for bônus
        }
        updateDisplay(); // Re-habilita botões
    }

    // --- Event Listeners para Botões ---
    spinButton.addEventListener('click', performSpin);

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

    // --- Lógica de Turbo Mode ---
    turboButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        isTurboMode = !isTurboMode; // Alterna o modo turbo
        updateDisplay();
    });

    // --- Lógica de Auto Spin ---
    autoSpinButton.addEventListener('click', () => {
        buttonClickSound.currentTime = 0;
        buttonClickSound.play();
        if (isAutoSpin) {
            stopAutoSpin();
        } else {
            startAutoSpin();
        }
    });

    function startAutoSpin() {
        if (balance < currentBet) {
            showMessage("Saldo insuficiente para iniciar Auto Spin!");
            return;
        }
        isAutoSpin = true;
        updateDisplay();
        performSpin(); // Inicia o primeiro giro automático
    }

    function stopAutoSpin() {
        isAutoSpin = false;
        updateDisplay();
    }

    // Exibe mensagens temporárias na área de mensagem
    function showMessage(msg) {
        messageDisplay.textContent = msg;
    }

    // --- Inicialização do Jogo ---
    playMainMusic();

    // Renderiza símbolos iniciais e atualiza o display
    renderSymbol(reel1, getRandomSymbol(), false); // Símbolos iniciais NÃO devem animar
    renderSymbol(reel2, getRandomSymbol(), false);
    renderSymbol(reel3, getRandomSymbol(), false);
    updateDisplay(); // Garante que o estado inicial dos botões esteja correto
});
