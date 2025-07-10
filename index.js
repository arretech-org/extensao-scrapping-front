const CONFIG = {
  // Configurações do Backend
  backend: {
    baseUrl: 'http://localhost:8000/api',
  }
}


// Função de extração de conteúdo que será injetada na página
function extractPageContent() {
    // Função que será executada no contexto da página
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
        
        // Mapeamento dos agentes
        this.agents = {
            '1': { id: 1, name: 'trabalhista', displayName: 'Trabalhista' },
            '2': { id: 2, name: 'civel', displayName: 'Cível' }
        };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.scrapeButton.addEventListener('click', () => this.performScraping());
        this.sendButton.addEventListener('click', () => this.sendToBackend());
        this.resultTextarea.addEventListener('input', () => this.updateCharCount());
        this.agentSelect.addEventListener('change', () => this.enableActionButtons());
    }

    async performScraping() {
        this.showStatus('loading', '<span class="spinner"></span>Extraindo conteúdo da página...');
        this.scrapeButton.disabled = true;
        
        try {
            // Verificar se estamos no contexto correto
            if (typeof chrome === 'undefined' || !chrome.tabs) {
                throw new Error('API do Chrome não disponível. Execute como extensão.');
            }

            // Obter a aba ativa
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                throw new Error('Nenhuma aba ativa encontrada.');
            }

            // Executar script de scraping na página
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

        const agent = Object.entries(this.agents)
            .filter(([key, value]) => key === this.agentSelect.value)
            .map(([key, value]) => value)[0];
        
        this.showStatus('loading', `<span class="spinner"></span>Enviando...`);

        try {
            // URL do backend
            const backendUrl = `${CONFIG.backend.baseUrl}/feed/agent/${agent.id}`;
            
            const payload = {
                content: content,
                timestamp: new Date().toISOString(),
                source: 'chrome_extension',
                agent: agent,
                contentLength: content.length
            };

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const responseData = await response.json();
                this.showStatus('sent', `✅ Conteúdo enviado para ${agent.name} com sucesso!`);
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Erro ao enviar para backend:', error);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showStatus('error', `❌ Erro de conexão: Verifique se o backend está rodando em localhost:8000`);
            } else {
                this.showStatus('error', `❌ Erro ao enviar para ${buttonText}: ${error.message}`);
            }
        } finally {
            // Reabilitar botões
            this.enableActionButtons();
        }
    }

    enableActionButtons() {
        const hasContent = this.resultTextarea.value.trim().length > 0;
        this.agentSelect.disabled = !hasContent;
        this.sendButton.disabled = !this.agentSelect.value;
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
        
        // Auto-ocultar status de sucesso após 3 segundos
        if (type === 'success') {
            setTimeout(() => {
                if (this.statusDiv.classList.contains('success')) {
                    this.statusDiv.classList.add('hidden');
                }
            }, 5000);
        }

        if (type === 'sent') {
            this.resultTextarea.setAttribute('readonly', 'readonly');
            this.resultTextarea.value = '';
            this.updateCharCount();
            setTimeout(() => {
                if (this.statusDiv.classList.contains('sent')) {
                    console.log('Conteúdo enviado com sucesso!');
                    this.statusDiv.classList.add('hidden');
                }
            }, 5000);
        }
    }
}

// Inicializar a extensão quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const extension = new WebScraperExtension();
    
    // Adicionar método global para desenvolvimento/debug
    window.scraperExtension = extension;
    
    console.log('WebScraper Extension carregada com sucesso!');
});