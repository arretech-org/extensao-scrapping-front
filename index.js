const CONFIG = {
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


    removeUnwantedElements();

    const textContent = extractTextContent();
    const metadata = extractMetadata();
    const structuredData = extractStructuredData();

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
        this.authToken = null;
        this.userRoles = [];

        this.initializeEventListeners();
        this.initExtensionState();
    }

    initializeEventListeners() {
        this.scrapeButton.addEventListener('click', () => this.performScraping());
        this.sendButton.addEventListener('click', () => this.sendToBackend());
        this.resultTextarea.addEventListener('input', () => this.updateCharCount());
        this.agentSelect.addEventListener('change', () => this.enableActionButtons());
    }

    async initExtensionState() {
        this.showStatus('loading', '<span class="spinner"></span>Iniciando extensão...');
        this.scrapeButton.disabled = true;
        this.sendButton.disabled = true;
        this.agentSelect.disabled = true;

        await this.loadAuthToken();
        await this.loadAgentsIntoSelect();
        this.enableActionButtons();

        this.scrapeButton.disabled = false;

        // Mensagens de status mais detalhadas
        if (!this.authToken) {
            this.showStatus('error', '❌ Usuário não autenticado. Faça login na plataforma para usar a extensão.');
        } else if (Object.keys(this.agents).length === 0) {
            this.showStatus('error', '❌ Não foi possível carregar agentes. Verifique a conexão ou tente novamente.');
        } else if (!this.hasAdminRole()) { // <-- Verifica a role aqui
            this.showStatus('warning', '⚠️ Você não tem permissão para enviar o processamento.');
        } else {
            this.showStatus('success', '✅ Extensão pronta!');
        }
    }

    /**
     * Decodifica um JWT (parte do payload) e retorna o JSON.
     * @param {string} token
     * @returns {object|null}
     */
    decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Erro ao decodificar JWT:", e);
            return null;
        }
    }

    async loadAuthToken() {
        try {
            const cookie = await new Promise(resolve => {
                const timeoutId = setTimeout(() => {
                    console.warn('Timeout ao tentar obter o cookie "token".');
                    resolve(null);
                }, 2000); // Timeout de 2 segundos para o cookie

                chrome.cookies.get({ url: `https://${CONFIG.backend.backendDomain}`, name: 'token' },
                    function(c) {
                        clearTimeout(timeoutId);
                        resolve(c);
                    }
                );
            });

            this.authToken = cookie ? cookie.value : null;
            this.userRoles = [];

            if (this.authToken) {
                console.log('Token de autenticação carregado em this.authToken.');
                const decodedToken = this.decodeJwt(this.authToken);
                if (decodedToken && decodedToken.roles && Array.isArray(decodedToken.roles)) {
                    this.userRoles = decodedToken.roles;
                    console.log('Roles do usuário:', this.userRoles);
                } else {
                    console.warn('Roles não encontradas ou inválidas no token.');
                }
            } else {
                console.warn('Token de autenticação não encontrado nos cookies.');
            }
        } catch (e) {
            console.error("Erro ao obter cookie ou decodificar token:", e);
            this.authToken = null;
            this.userRoles = [];
        }
    }

    /**
     * Verifica se o usuário possui a role 'admin'.
     * @returns {boolean}
     */
    hasAdminRole() {
        return this.userRoles.includes('admin');
    }

    async fetchAgents() {
        this.showStatus('loading', '<span class="spinner"></span>Carregando agentes...');
        this.agentSelect.disabled = true;

        try {
            const token = this.authToken;

            let headers = {
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('Token de autenticação usado para listar agentes.');
            } else {
                this.showStatus('error', '❌ Usuário não autenticado. Faça login na plataforma para carregar os agentes.');
                return [];
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
                this.authToken = null;
                this.userRoles = []; // Limpa as roles se a autenticação falhar
                this.enableActionButtons();
                return [];
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Erro ao buscar agentes:', error);
            this.showStatus('error', '❌ Erro ao carregar agentes.');
            return [];
        } finally {
            this.agentSelect.disabled = false;
        }
    }

    async loadAgentsIntoSelect() {
        const agentsData = await this.fetchAgents();
        if (agentsData.length > 0) {
            this.agentSelect.innerHTML = '<option value="">Selecione um agente</option>';
            this.agents = {};

            agentsData.forEach(agent => {
                this.agents[agent.id] = { id: agent.id, name: agent.name, displayName: agent.name };
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = agent.name.charAt(0).toUpperCase() + agent.name.slice(1);
                this.agentSelect.appendChild(option);
            });
            this.showStatus('success', '✅ Agentes carregados com sucesso!');
        } else {
            this.agentSelect.innerHTML = '<option value="">Não foi possível carregar agentes</option>';
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


        if (!this.hasAdminRole()) {
            this.showStatus('error', '❌ Você não tem permissão para enviar o processamento. Apenas usuários "admin" podem fazê-lo.');
            return;
        }

        this.showStatus('loading', `<span class="spinner"></span>Enviando...`);
        this.sendButton.disabled = true;

        try {
            // Revalida o token antes do envio final
            await this.loadAuthToken();
            const token = this.authToken;

            let headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('Token de autenticação usado para envio de conteúdo.');
            } else {
                this.showStatus('error', '❌ Usuário não autenticado. Faça login na plataforma para enviar conteúdo.');
                return;
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
                this.showStatus('error', '❌ Não autorizado. Verifique se você está logado na plataforma e possui as permissões necessárias.');
                this.authToken = null;
                this.userRoles = [];
                this.enableActionButtons();
                throw new Error(`Autenticação falhou: ${response.statusText}`);
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Erro ao enviar para backend:', error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showStatus('error', `❌ Erro de conexão.`);
            } else {
                this.showStatus('error', `❌ Erro ao enviar processamento.`);
            }
        } finally {
            this.sendButton.disabled = false;
            this.enableActionButtons();
        }
    }

    enableActionButtons() {
        const hasContent = this.resultTextarea.value.trim().length > 0;
        const hasAgents = Object.keys(this.agents).length > 0;
        const agentSelected = this.agentSelect.value !== '';
        const isAdmin = this.hasAdminRole();

        this.sendButton.disabled = !hasContent || !hasAgents || !agentSelected || !this.authToken || !isAdmin;

        this.agentSelect.disabled = !hasAgents || !this.authToken;

        if (this.authToken && !isAdmin) {
            this.sendButton.disabled = true;
            this.sendButton.title = 'Apenas usuários admin podem enviar para processamento.';
        } else {
            this.sendButton.title = '';
        }
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
            }, 15000);
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
