document.addEventListener('DOMContentLoaded', function() {
    // Altere para o nome do seu arquivo JSON se for diferente
    const DATA_FILE = 'report.json'; 

    fetch(DATA_FILE)
        .then(response => response.ok ? response.json() : Promise.reject(response.statusText))
        .then(data => {
            if (!data || data.length === 0) throw new Error("JSON está vazio ou inválido.");
            renderDashboard(data[0]);
        })
        .catch(handleError);
});

function renderDashboard(resultado) {
    if (!resultado || !resultado.steps) {
        throw new Error("Estrutura do JSON inválida: a chave 'steps' não foi encontrada.");
    }

    // Extração de dados
    const status = resultado.status || 'unknown';
    const steps = resultado.steps;
    const violations = steps.filter(step => step.type === 'violation');
    const initialValues = resultado.initial_values || {};

    // Renderização dos componentes
    renderStatusAndMetrics(status, steps.length, violations.length);
    if (violations.length > 0) {
        renderViolationsTable(violations);
        document.getElementById('detalhes-falhas').classList.remove('hidden');
    }
    if (Object.keys(initialValues).length > 0) {
        renderInitialValues(initialValues);
        document.getElementById('valores-iniciais-container').classList.remove('hidden');
    }
    renderSourceFiles(resultado.source_files, resultado.coverage?.files);
    renderTrace(steps);
    
    console.log("Renderização do dashboard concluída.");
}

function renderStatusAndMetrics(status, totalSteps, violationCount) {
    const statusBox = document.getElementById('status-geral');
    const statusTexto = document.getElementById('status-texto');
    if (status === 'violation') {
        statusBox.className = 'status-box failure';
        statusTexto.textContent = `VERIFICATION FAILED (${violationCount} VIOLATION(S))`;
    } else {
        statusBox.className = 'status-box success';
        statusTexto.textContent = 'VERIFICATION SUCCESSFUL';
    }
    document.getElementById('total-steps').textContent = totalSteps;
    document.getElementById('failure-checks').textContent = violationCount;
}

function renderViolationsTable(violations) {
    const tabelaBody = document.querySelector('#tabela-falhas tbody');
    tabelaBody.innerHTML = '';
    violations.forEach(v => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${normalizePath(v.file)}</td>
            <td>${v.function || 'N/A'}</td>
            <td>${v.line || 'N/A'}</td>
            <td>${v.message || v.assertion?.comment || 'Sem detalhes'}</td>
        `;
        tabelaBody.appendChild(row);
    });
}

function renderInitialValues(values) {
    const container = document.getElementById('valores-iniciais');
    let textContent = 'Valores que causaram a falha:\n\n';
    for (const varName in values) {
        textContent += `${varName} = ${values[varName].value}\n`;
    }
    container.textContent = textContent;
}

function renderSourceFiles(sourceFiles, coverageFiles) {
    const wrapper = document.getElementById('codigo-fonte-wrapper');
    wrapper.innerHTML = ''; // Limpa o wrapper
    if (!sourceFiles) return;

    for (const fullPath in sourceFiles) {
        const shortPath = normalizePath(fullPath);
        const codeContainer = document.createElement('code');
        
        let html = `<h3>${shortPath}</h3>`;
        const codeView = document.createElement('div');
        codeView.className = 'code-view';
        
        const pre = document.createElement('pre');
        
        const sourceLines = sourceFiles[fullPath];
        const coverage = coverageFiles?.[fullPath]?.covered_lines || {};

        let linesHtml = '';
        sourceLines.forEach((lineContent, index) => {
            const lineNumber = index + 1;
            const coverageInfo = coverage[lineNumber];
            let lineClass = 'line';
            if (coverageInfo) {
                lineClass += ` ${coverageInfo.type}`; // 'violation' ou 'execution'
            }
            const safeLineContent = lineContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            linesHtml += `<span class="${lineClass}"><span class="line-number">${lineNumber}</span>${safeLineContent}</span>`;
        });
        
        pre.innerHTML = linesHtml;
        codeView.appendChild(pre);
        wrapper.appendChild(codeView);
    }
    document.getElementById('codigo-fonte-container').classList.remove('hidden');
}

function renderTrace(steps) {
    const traceContainer = document.getElementById('traco-execucao');
    let html = '';
    steps.forEach(step => {
        let stepClass = 'trace-step';
        let stepDetails = `[Passo ${step.step_number}] ${step.type.toUpperCase()} @ ${normalizePath(step.file)}:${step.line}`;
        
        if (step.type === 'violation') {
            stepClass += ' violation';
            stepDetails += ` -> ${step.message || ''}`;
        }
        if (step.type === 'assignment') {
            stepClass += ' assignment';
            const rhs = typeof step.assignment.rhs === 'object' ? JSON.stringify(step.assignment.rhs) : step.assignment.rhs;
            stepDetails += ` -> ${step.assignment.lhs} = ${rhs}`;
        }
        html += `<span class="${stepClass}">${stepDetails}</span>\n`;
    });
    traceContainer.innerHTML = html;
    document.getElementById('traco-execucao-container').classList.remove('hidden');
}

function handleError(error) {
    console.error('Falha crítica no dashboard:', error);
    const statusTexto = document.getElementById('status-texto');
    statusTexto.textContent = 'Erro ao carregar dados. Verifique o console (F12).';
    document.getElementById('status-geral').className = 'status-box failure';
}

function normalizePath(fullPath) {
    if (!fullPath) return 'N/A';
    return fullPath.split('/').slice(-2).join('/'); // Pega os dois últimos segmentos do caminho
}