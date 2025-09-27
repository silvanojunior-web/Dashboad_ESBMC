// Variável global para armazenar os dados de todos os relatórios carregados
let todosOsResultados = [];

document.addEventListener('DOMContentLoaded', function() {
    iniciarDashboard();
});

/**
 * Função principal que orquestra o carregamento do dashboard.
 * 1. Busca o arquivo de índice.
 * 2. Busca todos os relatórios listados no índice.
 * 3. Cria o seletor (dropdown) para os relatórios.
 * 4. Renderiza o primeiro relatório da lista.
 */
async function iniciarDashboard() {
    // URL do seu arquivo de índice no repositório de dados.
    // SUBSTITUA COM SEUS DADOS REAIS!
  // LINHA CORRETA (EXEMPLO):
const URL_INDICE = 'https://raw.githubusercontent.com/silvanajunior-web/dashboard-dados/main/index.json'; 
    try {
        const responseIndex = await fetch(URL_INDICE);
        if (!responseIndex.ok) throw new Error(`Não foi possível carregar o arquivo de índice: ${responseIndex.statusText}`);
        
        const indice = await responseIndex.json();
        const arquivosParaBuscar = indice.arquivos_participantes; // Use a chave correta do seu index.json

        // Busca todos os arquivos de relatório em paralelo
        const promessas = arquivosParaBuscar.map(url => fetch(url).then(res => res.json()));
        const resultadosCarregados = await Promise.all(promessas);

        // Armazena os resultados. O seu código original esperava data[0],
        // então vamos garantir que cada resultado seja o primeiro elemento do seu array.
        todosOsResultados = resultadosCarregados.map((data, index) => ({
            // Usamos o nome do arquivo como um título padrão
            titulo: new URL(arquivosParaBuscar[index]).pathname.split('/').pop(),
            // Seu código original usava data[0], então pegamos o primeiro item de cada arquivo carregado
            dados: data[0] 
        }));

        if (todosOsResultados.length === 0) throw new Error("Nenhum relatório foi carregado.");

        // Cria o menu dropdown
        criarSeletorDeRelatorios();
        
        // Renderiza o primeiro relatório por padrão
        renderDashboard(todosOsResultados[0].dados);

    } catch (error) {
        handleError(error);
    }
}

/**
 * Cria e configura o menu dropdown (select) para escolher entre os relatórios carregados.
 */
function criarSeletorDeRelatorios() {
    const seletor = document.getElementById('seletor-relatorios');
    seletor.innerHTML = ''; // Limpa opções antigas

    todosOsResultados.forEach((resultado, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = resultado.titulo; // Ex: 'joao.json'
        seletor.appendChild(option);
    });

    // Adiciona um evento que renderiza o dashboard selecionado quando o usuário muda a opção
    seletor.addEventListener('change', (event) => {
        const indiceSelecionado = event.target.value;
        const resultadoSelecionado = todosOsResultados[indiceSelecionado];
        renderDashboard(resultadoSelecionado.dados);
    });
}


// =========================================================================
// SUAS FUNÇÕES ORIGINAIS (PRATICAMENTE SEM ALTERAÇÕES)
// =========================================================================

function renderDashboard(resultado) {
    if (!resultado || !resultado.steps) {
        // Limpa o dashboard antigo antes de mostrar o erro para não confundir o usuário
        limparDashboard();
        throw new Error("Estrutura do JSON inválida: a chave 'steps' não foi encontrada.");
    }
    
    // Limpa visualizações anteriores antes de renderizar a nova
    limparDashboard();

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
    
    console.log(`Renderização do dashboard para o resultado selecionado concluída.`);
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
        
        const fileContainer = document.createElement('div');
        fileContainer.className = 'file-container';
        
        const header = document.createElement('h3');
        header.textContent = shortPath;
        fileContainer.appendChild(header);

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
        fileContainer.appendChild(codeView);
        wrapper.appendChild(fileContainer);
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
    // Esconde todos os containers de detalhes em caso de erro
    limparDashboard();
}

function normalizePath(fullPath) {
    if (!fullPath) return 'N/A';
    return fullPath.split('/').slice(-2).join('/'); // Pega os dois últimos segmentos do caminho
}

/**
 * Limpa todas as seções de detalhes do dashboard para preparar para uma nova renderização
 * ou para limpar a tela em caso de erro.
 */
function limparDashboard() {
    document.getElementById('detalhes-falhas').classList.add('hidden');
    document.getElementById('valores-iniciais-container').classList.add('hidden');
    document.getElementById('codigo-fonte-container').classList.add('hidden');
    document.getElementById('traco-execucao-container').classList.add('hidden');
    document.querySelector('#tabela-falhas tbody').innerHTML = '';
    document.getElementById('valores-iniciais').textContent = '';
    document.getElementById('codigo-fonte-wrapper').innerHTML = '';
    document.getElementById('traco-execucao').innerHTML = '';
}

