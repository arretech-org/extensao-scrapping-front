const CONFIG = {
    // Configurações do Backend
    backend: {
        baseUrl: 'https://app.juridtech.com.br/api/admin/agents/feed/extension',
        agentsListUrl: 'https://app.juridtech.com.br/api/agents',
        backendDomain: 'app.juridtech.com.br'
    }
}

// Função de extração de conteúdo que será injetada na página
function extractPageContent() {
    const removeUnwantedElements = () => {
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer',
            '.advertisement', '.ads', '.popup', '.modal',
            '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
            '.cookie-banner', '.newsletter-signup', '.social-share',
            '.comments-section', '.sidebar', '.related-posts'
        ];

        unwantedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none'; // Ocultar em vez de remover
            });
        });
    };

    const extractTextContent = () => {
        const contentSelectors = [
            'main', 'article', '.content', '.main-content',
            '.post-content', '.entry-content', '#content',
            '.article-body', '.post-body', '.text-content'
        ];

        // Tentar encontrar container principal de conteúdo
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.innerText.trim();
            }
        }

        // Fallback: extrair do body, mas filtrar melhor
        const bodyText = document.body.innerText || document.body.textContent || '';

        // Limpar texto repetitivo e ruído
        const lines = bodyText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 3) // Remover linhas muito curtas
            .filter((line, index, arr) => arr.indexOf(line) === index); // Remover duplicatas

        return lines.join('\n');
    };

    const extractMetadata = () => {
        const getMetaContent = (name) => {
            return document.querySelector(`meta[name="${name}"]`)?.content ||
                document.querySelector(`meta[property="${name}"]`)?.content ||
                document.querySelector(`meta[property="og:${name}"]`)?.content || '';
        };

        return {
            title: document.title || 'Sem título',
            url: window.location.href,
            description: getMetaContent('description'),
            keywords: getMetaContent('keywords'),
            author: getMetaContent('author'),
            publishDate: getMetaContent('article:published_time') || getMetaContent('datePublished'),
            timestamp: new Date().toLocaleString('pt-BR')
        };
    };

    const extractStructuredData = () => {
        try {
            // Tentar extrair dados estruturados (Schema.org)
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            const structuredData = [];

            scripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    structuredData.push(data);
                } catch (e) {
                    // Ignorar scripts JSON inválidos
                }
            });

            return structuredData.length > 0 ? JSON.stringify(structuredData, null, 2) : '';
        } catch (error) {
            return '';
        }
    };

    // Remover elementos indesejados
    removeUnwantedElements();

    // Extrair conteúdo
    const textContent = extractTextContent();
    const metadata = extractMetadata();
    const structuredData = extractStructuredData();

    // Formar resultado estruturado
    let result = `=== METADADOS ===
Título: ${metadata.title}
URL: ${metadata.url}
Descrição: ${metadata.description}
Palavras-chave: ${metadata.keywords}
Autor: ${metadata.author}
Data de Publicação: ${metadata.publishDate}
Extraído em: ${metadata.timestamp}

=== CONTEÚDO PRINCIPAL ===
${textContent}`;

    if (structuredData) {
        result += `\n\n=== DADOS ESTRUTURADOS ===
${structuredData}`;
    }

    return result;
}

class WebScraperExtension {
    constructor() {
        this.scrapeButton = document.getElementById('scrapeButton');
        this.resultTextarea = document.getElementById('resultTextarea');
        this.agentSelect = document.getElementById('agentSelect');
        this.sendButton = document.getElementById('sendButton');
        this.statusDiv = document.getElementById('statusDiv');
        this.charCount = document.getElementById('charCount');

        this.agents = {};

        this.initializeEventListeners();
        this.loadAgentsIntoSelect();
    }

    initializeEventListeners() {
        this.scrapeButton.addEventListener('click', () => this.performScraping());
        this.sendButton.addEventListener('click', () => this.sendToBackend());
        this.resultTextarea.addEventListener('input', () => this.updateCharCount());
        this.agentSelect.addEventListener('change', () => this.enableActionButtons());
    }

    // Função auxiliar para obter o token do cookie
    async getAuthToken() {
        try {
            const cookie = await new Promise(resolve => {
                chrome.cookies.get({ url: `https://${CONFIG.backend.backendDomain}`, name: 'token' },
                    function(cookie) {
                        resolve(cookie);
                    }
                );
            });
            return cookie ? cookie.value : null;
        } catch (e) {
            console.error("Erro ao obter cookie:", e);
            return null;
        }
    }

    async fetchAgents() {
        this.showStatus('loading', '<span class="spinner"></span>Carregando agentes...');
        this.agentSelect.disabled = true; // Desabilita enquanto carrega

        try {
            const token = await this.getAuthToken();

            let headers = {
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('Token de autenticação encontrado e adicionado aos cabeçalhos para listar agentes.');
            } else {
                console.warn('Token de autenticação não encontrado nos cookies. Não será possível carregar os agentes.');
                this.showStatus('error', '❌ Usuário não autenticado. Faça login na plataforma para carregar os agentes.');
                return []; // Retorna array vazio se não houver token
            }

            const response = await fetch(CONFIG.backend.agentsListUrl, {
                method: 'GET',
                headers: headers
            });

            if (response.ok) {
                const data = await response.json();
                return data.agents;
            } else if (response.status === 401 || response.status === 403) {
                this.showStatus('error', '❌ Não autorizado. Verifique se você está logado na plataforma.');
                throw new Error(`Autenticação falhou: ${response.statusText}`);
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Erro ao buscar agentes:', error);
            this.showStatus('error', '❌ Erro ao carregar agentes: ' + error.message);
            return [];
        } finally {
            // Habilita o select após a tentativa de carregamento
            this.agentSelect.disabled = false;
        }
    }

    async loadAgentsIntoSelect() {
        const agentsData = await this.fetchAgents();
        if (agentsData.length > 0) {
            this.agentSelect.innerHTML = '<option value="">Selecione um agente</option>'; // Opção padrão
            this.agents = {}; // Limpa o objeto agents antes de popular

            agentsData.forEach(agent => {
                this.agents[agent.id] = { id: agent.id, name: agent.name, displayName: agent.name };
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = agent.name.charAt(0).toUpperCase() + agent.name.slice(1);
                this.agentSelect.appendChild(option);
            });
            this.showStatus('success', '✅ Agentes carregados com sucesso!');
        } else {
            // Garante que o select esteja limpo e com a opção padrão se não houver agentes
            this.agentSelect.innerHTML = '<option value="">Não foi possível carregar agentes</option>';
            // A mensagem de erro já foi setada em fetchAgents
            this.enableActionButtons();
        }
    }

    async performScraping() {
        this.showStatus('loading', '<span class="spinner"></span>Extraindo conteúdo da página...');
        this.scrapeButton.disabled = true;

        try {
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                throw new Error('API do Chrome não disponível. Execute como extensão.');
            }

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('Nenhuma aba ativa encontrada.');
            }

            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: extractPageContent
            });

            const scrapedContent = results[0].result;

            if (scrapedContent && scrapedContent.trim()) {
                this.resultTextarea.value = scrapedContent;
                this.resultTextarea.removeAttribute('readonly');
                this.updateCharCount();
                this.enableActionButtons();
                this.showStatus('success', '✅ Conteúdo extraído com sucesso!');
            } else {
                this.showStatus('error', '❌ Nenhum conteúdo foi encontrado na página.');
            }
        } catch (error) {
            console.error('Erro durante o scraping:', error);
            this.showStatus('error', '❌ Erro ao extrair conteúdo: ' + error.message);
        } finally {
            this.scrapeButton.disabled = false;
        }
    }

    async sendToBackend() {
        const content = this.resultTextarea.value.trim();

        if (!content) {
            this.showStatus('error', '❌ Nenhum conteúdo para enviar!');
            return;
        }

        const agent = this.agents[this.agentSelect.value];

        if (!agent) {
            this.showStatus('error', '❌ Selecione um agente válido!');
            return;
        }

        this.showStatus('loading', `<span class="spinner"></span>Enviando...`);

        try {
            const token = await this.getAuthToken();

            let headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('Token de autenticação encontrado e adicionado aos cabeçalhos para envio de conteúdo.');
            } else {
                this.showStatus('error', '❌ Usuário não autenticado. Faça login na plataforma para enviar conteúdo.');
                return; // Impede o envio se não houver token
            }

            const backendUrl = `${CONFIG.backend.baseUrl}`;

            const payload = {
                text: content,
                agent_id: agent.id,
                timestamp: new Date().toISOString(),
                source: 'chrome_extension',
                contentLength: content.length
            };

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const responseData = await response.json();
                this.showStatus('sent', `✅ Conteúdo enviado para ${agent.displayName} com sucesso!`);
            } else if (response.status === 401 || response.status === 403) {
                this.showStatus('error', '❌ Não autorizado. Verifique se você está logado na plataforma.');
                throw new Error(`Autenticação falhou: ${response.statusText}`);
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Erro ao enviar para backend:', error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showStatus('error', `❌ Erro de conexão: Verifique se o backend está rodando em localhost:8000 ou se a URL está correta.`);
            } else {
                this.showStatus('error', `❌ Erro ao enviar para o backend: ${error.message}`);
            }
        } finally {
            this.enableActionButtons();
        }
    }

    enableActionButtons() {
        const hasContent = this.resultTextarea.value.trim().length > 0;
        this.agentSelect.disabled = Object.keys(this.agents).length === 0;
        // O botão de envio só é habilitado se houver conteúdo E um agente selecionado
        this.sendButton.disabled = !hasContent || !this.agentSelect.value || Object.keys(this.agents).length === 0;
    }

    updateCharCount() {
        const count = this.resultTextarea.value.length;
        this.charCount.textContent = `${count.toLocaleString('pt-BR')} caracteres`;
        this.enableActionButtons();
    }

    showStatus(type, message) {
        this.statusDiv.className = `status ${type}`;
        this.statusDiv.innerHTML = message;
        this.statusDiv.classList.remove('hidden');

        if (type === 'success' || type === 'sent') {
            setTimeout(() => {
                this.statusDiv.classList.add('hidden');
            }, 5000);
        }

        if (type === 'sent') {
            this.resultTextarea.setAttribute('readonly', 'readonly');
            this.resultTextarea.value = '';
            this.updateCharCount();
            console.log('Conteúdo enviado com sucesso!');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const extension = new WebScraperExtension();
    window.scraperExtension = extension;
    console.log('WebScraper Extension carregada com sucesso!');
});
