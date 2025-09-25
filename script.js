document.addEventListener('DOMContentLoaded', function() {
    // Altere para 'report.json' se você renomeou o arquivo
    const DATA_FILE = 'report.json'; 

    console.log(`Dashboard iniciado. Tentando carregar ${DATA_FILE}...`);
    
    fetch(DATA_FILE)
        .then(response => response.ok ? response.json() : Promise.reject(response.statusText))
        .then(data => {
            console.log("Dados JSON processados com sucesso:", data);
            if (data && data.length > 0) {
                const normalizedData = parseEsbmcResult(data[0]);
                renderDashboard(normalizedData);
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

/**
 * Converte o JSON bruto do ESBMC para o nosso formato de dados normalizado.
 * @param {object} rawData O objeto de resultado bruto do ESBMC.
 * @returns {object} Um objeto com os dados normalizados para o dashboard.
 */
function parseEsbmcResult(rawData) {
    console.log("Parser do ESBMC em ação...");
    
    if (!rawData || !rawData.steps) {
        throw new Error("Estrutura do JSON inválida: 'steps' não encontrado.");
    }

    const status = (rawData.status === 'violation') ? 'FAILURE' : 'SUCCESS';
    const steps = rawData.steps;
    const violationsRaw = steps.filter(step => step.type === 'violation');

    const violations = violationsRaw.map(v => ({
        file: normalizePath(v.file || 'N/A'),
        line: v.line || 'N/A',
        func: v.function || 'N/A',
        msg: v.message || v.assertion?.comment || 'Sem detalhes'
    }));

    // NOVA LÓGICA PARA MÚLTIPLOS ARQUIVOS
    const sources = [];
    const coverage = {};

    if (rawData.source_files) {
        for (const fullPath in rawData.source_files) {
            const shortPath = normalizePath(fullPath);
            sources.push({
                filename: shortPath,
                lines: rawData.source_files[fullPath]
            });

            if (rawData.coverage?.files[fullPath]?.covered_lines) {
                const coveredLinesRaw = rawData.coverage.files[fullPath].covered_lines;
                coverage[shortPath] = {};
                for (const lineNumber in coveredLinesRaw) {
                    coverage[shortPath][lineNumber] = coveredLinesRaw[lineNumber].type;
                }
            }
        }
    }
    
    const normalizedData = {
        status: status,
        metrics: {
            total: steps.length,
            failed: violations.length
        },
        violations: violations,
        sources: sources,
        coverage: coverage,
        trace: steps 
    };

    console.log("Dados Normalizados:", normalizedData);
    return normalizedData;
}

/**
 * Orquestra a renderização de todas as partes do dashboard.
 * @param {object} data O objeto de dados já normalizado pelo parser.
 */
function renderDashboard(data) {
    console.log("Iniciando a renderização do dashboard com dados normalizados.");

    // Renderiza Status, Métricas e Tabela de Violações
    const statusBox = document.getElementById('status-geral');
    const statusTexto = document.getElementById('status-texto');
    if (data.status === 'FAILURE') {
        statusBox.className = 'status-box failure';
        statusTexto.textContent = `VERIFICATION FAILED (${data.metrics.failed} VIOLATION(S))`;
    } else {
        statusBox.className = 'status-box success';
        statusTexto.textContent = 'VERIFICATION SUCCESSFUL';
    }
    document.getElementById('total-steps').textContent = data.metrics.total;
    document.getElementById('failure-checks').textContent = data.metrics.failed;

    if (data.violations.length > 0) {
        const tabelaBody = document.querySelector('#tabela-falhas tbody');
        tabelaBody.innerHTML = '';
        data.violations.forEach(v => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${v.file}</td><td>${v.func}</td><td>${v.line}</td><td>${v.msg}</td>`;
            tabelaBody.appendChild(row);
        });
        document.getElementById('detalhes-falhas').classList.remove('hidden');
    }

    // Renderiza Código-Fonte e Traço
    renderSourceCode(data.sources, data.coverage);
    renderTrace(data.trace);
    console.log("Renderização do dashboard concluída.");
}

/**
 * Renderiza o código de múltiplos arquivos, um após o outro.
 * @param {Array} sources Array de objetos contendo nome e linhas do arquivo.
 * @param {object} coverage Objeto de cobertura mapeado por nome de arquivo.
 */
function renderSourceCode(sources, coverage) {
    const codeContainer = document.getElementById('codigo-fonte');
    codeContainer.innerHTML = ''; // Limpa o container

    if (sources.length === 0) {
        console.warn("Nenhum arquivo de código-fonte encontrado nos dados normalizados.");
        return;
    }

    sources.forEach(source => {
        const fileCoverage = coverage[source.filename] || {};
        let html = `<h3>${source.filename}</h3>`;
        source.lines.forEach((lineContent, index) => {
            const lineNumber = index + 1;
            const coverageType = fileCoverage[lineNumber];
            
            let lineClass = 'line';
            if (coverageType) {
                lineClass += ` ${coverageType}`; // 'violation' ou 'covered'
            }
            const safeLineContent = lineContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            html += `<span class="${lineClass}"><span class="line-number">${lineNumber}</span>${safeLineContent}</span>`;
        });
        codeContainer.innerHTML += html;
    });
    
    document.getElementById('codigo-fonte-container').classList.remove('hidden');
}

/**
 * Renderiza o traço de execução completo.
 * @param {Array} steps Array de passos brutos do ESBMC.
 */
function renderTrace(steps) {
    const traceContainer = document.getElementById('traco-execucao');
    let html = '';
    steps.forEach(step => {
        let stepClass = 'trace-step';
        let stepDetails = `[Passo ${step.step_number}] ${step.type.toUpperCase()} @ ${normalizePath(step.file)}:${step.line}`;
        
        if(step.type === 'violation') {
            stepClass += ' violation';
            stepDetails += ` -> ${step.message || step.assertion?.comment || ''}`;
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

/**
 * Função utilitária para encurtar caminhos de arquivo longos.
 * @param {string} fullPath O caminho completo do arquivo.
 * @returns {string} O caminho simplificado.
 */
function normalizePath(fullPath) {
    if (!fullPath) return 'N/A';
    // Remove o prefixo comum de caminhos do Linux para deixar mais limpo
    return fullPath.replace(/^\/home\/silva\/Projetos\/02_projeto\//, '');
}