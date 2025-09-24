document.addEventListener('DOMContentLoaded', function() {
    console.log("Dashboard iniciado. Tentando carregar results.json...");
    
    fetch('results.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log("Arquivo results.json encontrado. Processando...");
            return response.json();
        })
        .then(data => {
            console.log("Dados JSON processados com sucesso:", data);
            if (data && data.length > 0) {
                processarResultados(data[0]); // Processa o primeiro (e único) objeto no array
            } else {
                throw new Error("O arquivo JSON está vazio ou em formato inesperado.");
            }
        })
        .catch(error => {
            console.error('Falha crítica ao carregar ou processar o dashboard:', error);
            const statusTexto = document.getElementById('status-texto');
            statusTexto.textContent = 'Erro ao carregar dados. Verifique o console (F12).';
            document.getElementById('status-geral').className = 'status-box failure';
        });
});

function processarResultados(resultado) {
    console.log("Iniciando a renderização do dashboard com os resultados.");

    if (!resultado || !resultado.steps) {
        console.error("Estrutura do JSON inválida: a chave 'steps' não foi encontrada.");
        return;
    }

    const status = resultado.status || 'unknown';
    const steps = resultado.steps;
    const violations = steps.filter(step => step.type === 'violation');

    // 1. Atualiza Status Geral e Métricas
    document.getElementById('total-steps').textContent = steps.length;
    document.getElementById('failure-checks').textContent = violations.length;

    const statusBox = document.getElementById('status-geral');
    const statusTexto = document.getElementById('status-texto');
    if (status === 'violation' && violations.length > 0) {
        statusBox.className = 'status-box failure';
        statusTexto.textContent = 'VERIFICATION FAILED (VIOLATION)';
    } else {
        statusBox.className = 'status-box success';
        statusTexto.textContent = 'VERIFICATION SUCCESSFUL';
    }

    // 2. Preenche a Tabela de Violações
    if (violations.length > 0) {
        const tabelaBody = document.querySelector('#tabela-falhas tbody');
        tabelaBody.innerHTML = '';
        violations.forEach(v => {
            const row = document.createElement('tr');
            // A chave 'message' pode estar dentro de 'assertion' em algumas versões
            const message = v.message || v.assertion?.comment || 'Sem detalhes';
            row.innerHTML = `
                <td>${v.file || 'N/A'}</td>
                <td>${v.function || 'N/A'}</td>
                <td>${v.line || 'N/A'}</td>
                <td>${message}</td>
            `;
            tabelaBody.appendChild(row);
        });
        document.getElementById('detalhes-falhas').classList.remove('hidden');
    }

    // 3. Renderiza o Código Fonte com Destaques
    renderizarCodigoFonte(resultado);

    // 4. Renderiza o Traço de Execução
    renderizarTraco(steps);
    console.log("Renderização do dashboard concluída.");
}

function renderizarCodigoFonte(resultado) {
    if (!resultado.source_files || !resultado.coverage || !resultado.coverage.files) {
        console.warn("Dados de código-fonte ou cobertura não encontrados no JSON.");
        return;
    }
    
    const filename = Object.keys(resultado.source_files)[0];
    if (!filename) {
        console.warn("Nenhum arquivo de código-fonte encontrado.");
        return;
    }

    const sourceLines = resultado.source_files[filename];
    const coverage = resultado.coverage.files[filename]?.covered_lines || {};
    const codeContainer = document.getElementById('codigo-fonte');
    
    let html = '';
    sourceLines.forEach((lineContent, index) => {
        const lineNumber = index + 1;
        const coverageInfo = coverage[lineNumber];
        
        let lineClass = 'line';
        if (coverageInfo) {
            lineClass += coverageInfo.type === 'violation' ? ' violation' : ' covered';
        }
        const safeLineContent = lineContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html += `<span class="${lineClass}"><span class="line-number">${lineNumber}</span>${safeLineContent}</span>`;
    });

    codeContainer.innerHTML = html;
    document.getElementById('codigo-fonte-container').classList.remove('hidden');
}

function renderizarTraco(steps) {
    const traceContainer = document.getElementById('traco-execucao');
    let html = '';
    steps.forEach(step => {
        let stepClass = 'trace-step';
        let stepDetails = `[Passo ${step.step_number}] ${step.type.toUpperCase()} @ ${step.file}:${step.line}`;
        
        if(step.type === 'violation') {
            stepClass += ' violation';
            const message = step.message || step.assertion?.comment || '';
            stepDetails += ` -> ${message}`;
        }
        if(step.type === 'assignment') {
            stepClass += ' assignment';
            const rhs = typeof step.assignment.rhs === 'object' ? JSON.stringify(step.assignment.rhs) : step.assignment.rhs;
            stepDetails += ` -> ${step.assignment.lhs} = ${rhs}`;
        }

        html += `<span class="${stepClass}">${stepDetails}</span>\n`;
    });

    traceContainer.innerHTML = html;
    document.getElementById('traco-execucao-container').classList.remove('hidden');
}