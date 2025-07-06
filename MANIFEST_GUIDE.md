# 📋 Guia Completo do manifest.json

Este documento explica detalhadamente cada propriedade do arquivo `manifest.json` usado na WebScraper Chrome Extension.

## 📖 Índice

- [Introdução](#-introdução)
- [Propriedades Obrigatórias](#-propriedades-obrigatórias)
- [Identificação e Metadados](#-identificação-e-metadados)
- [Permissões](#-permissões)
- [Interface do Usuário](#-interface-do-usuário)
- [Scripts e Workers](#-scripts-e-workers)
- [Segurança](#-segurança)
- [Recursos Acessíveis](#-recursos-acessíveis)
- [Propriedades Opcionais](#-propriedades-opcionais)
- [Migração V2 → V3](#-migração-v2--v3)
- [Boas Práticas](#-boas-práticas)

---

## 🎯 Introdução

O `manifest.json` é o arquivo de configuração central de qualquer extensão do Chrome. Ele define:
- **Metadados** da extensão (nome, versão, descrição)
- **Permissões** necessárias para funcionar
- **Interface** e comportamento
- **Scripts** e recursos utilizados
- **Políticas de segurança**

### Nosso manifest.json
```json
{
  "manifest_version": 3,
  "name": "WebScraper Extension",
  "version": "1.0.0",
  "description": "Extensão para fazer webscraping da página atual e enviar para backend",
  "author": "Desenvolvedor",
  "permissions": ["activeTab", "scripting", "tabs"],
  "host_permissions": ["http://localhost:8000/*", "<all_urls>"],
  "action": {
    "default_popup": "index.html",
    "default_title": "WebScraper Extension",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "web_accessible_resources": [
    {
      "resources": ["index.html", "index.css", "index.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## ✅ Propriedades Obrigatórias

### `manifest_version`
```json
"manifest_version": 3
```

| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Tipo** | Número | Versão do formato do manifest |
| **Valores** | `2` ou `3` | V2 (obsoleto), V3 (atual) |
| **Obrigatório** | ✅ Sim | Sempre necessário |

**Por que V3?**
- 🔒 **Maior segurança**: Service Workers ao invés de background pages persistentes
- ⚡ **Melhor performance**: Execução sob demanda
- 🚀 **Futuro**: V2 será descontinuado em 2024

**Principais mudanças do V2 → V3:**
```diff
- "background": {"scripts": ["bg.js"], "persistent": false}
+ "background": {"service_worker": "bg.js"}

- "browser_action": {...}
+ "action": {...}

- "web_accessible_resources": ["file.js"]
+ "web_accessible_resources": [{"resources": ["file.js"], "matches": ["<all_urls>"]}]
```

### `name`
```json
"name": "WebScraper Extension"
```

| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Limite** | 75 caracteres | Nome exibido na loja e lista de extensões |
| **Visível em** | Chrome Web Store, gerenciador de extensões, tooltips | |
| **Obrigatório** | ✅ Sim | Identificação da extensão |

**Dicas para o nome:**
- ✅ Seja descritivo e único
- ✅ Use palavras-chave relevantes
- ❌ Evite caracteres especiais excessivos
- ❌ Não use nomes de marcas registradas

### `version`
```json
"version": "1.0.0"
```

| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Formato** | `major.minor.patch[.build]` | Até 4 números separados por pontos |
| **Exemplos** | `"1.0"`, `"2.1.3"`, `"1.0.0.1"` | Versionamento semântico |
| **Uso** | Chrome detecta atualizações automaticamente | |

**Versionamento semântico:**
- **Major (1.x.x)**: Mudanças incompatíveis
- **Minor (x.1.x)**: Novas funcionalidades compatíveis
- **Patch (x.x.1)**: Correções de bugs
- **Build (x.x.x.1)**: Builds específicos

### `description`
```json
"description": "Extensão para fazer webscraping da página atual e enviar para backend de análise e processamento"
```

| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Limite** | 132 caracteres | Descrição breve da funcionalidade |
| **Visível em** | Chrome Web Store, detalhes da extensão | |
| **SEO** | Importante para descoberta na loja | |

---

## 🏷️ Identificação e Metadados

### `author`
```json
"author": "Desenvolvedor"
```

| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Opcional** | ❌ Não obrigatório | Nome do desenvolvedor ou empresa |
| **Alternativa** | Campo `developer` com sub-propriedades | Para informações mais detalhadas |

**Formato alternativo:**
```json
"developer": {
  "name": "Sua Empresa",
  "url": "https://seusite.com"
}
```

---

## 🔐 Permissões

### `permissions`
```json
"permissions": ["activeTab", "scripting", "tabs"]
```

Permissões para APIs do Chrome que não requerem acesso a hosts específicos.

#### `"activeTab"`
| Característica | Descrição |
|----------------|-----------|
| **O que permite** | Acesso temporário à aba ativa quando usuário interage |
| **Escopo** | Apenas aba atual, apenas quando solicitado |
| **Vantagem** | Não requer permissão ampla "todas as abas" |
| **Na nossa extensão** | Para fazer scraping da página atual |

**Exemplo de uso:**
```javascript
// Só funciona quando usuário clica na extensão
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.scripting.executeScript({
    target: {tabId: tabs[0].id},
    function: extractContent
  });
});
```

#### `"scripting"`
| Característica | Descrição |
|----------------|-----------|
| **O que permite** | Injetar e executar scripts em páginas web |
| **API relacionada** | `chrome.scripting.executeScript()` |
| **Manifest V3** | Substitui as antigas APIs de content scripts |
| **Na nossa extensão** | Para executar função de scraping na página |

**Exemplo de uso:**
```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  function: myFunction
});
```

#### `"tabs"`
| Característica | Descrição |
|----------------|-----------|
| **O que permite** | Ler URL, título e outras propriedades das abas |
| **API relacionada** | `chrome.tabs.query()`, `chrome.tabs.get()` |
| **Limitação** | Não permite acesso ao conteúdo, apenas metadados |
| **Na nossa extensão** | Para obter informações da aba ativa |

### `host_permissions`
```json
"host_permissions": ["http://localhost:8000/*", "<all_urls>"]
```

Permissões para acessar URLs específicas.

#### `"http://localhost:8000/*"`
| Característica | Descrição |
|----------------|-----------|
| **Padrão** | `protocolo://host:porta/caminho` |
| **Nossa extensão** | Para comunicar com backend local |
| **Necessário para** | `fetch()` requests para o servidor |

#### `"<all_urls>"`
| Característica | Descrição |
|----------------|-----------|
| **O que permite** | Acesso a qualquer URL (HTTP, HTTPS, FTP) |
| **Uso** | Para fazer scraping em qualquer site |
| **Alternativa** | Especificar domínios: `"https://*.example.com/*"` |
| **Cuidado** | Permissão muito ampla, use com moderação |

**Padrões de URL válidos:**
```json
"host_permissions": [
  "https://example.com/*",           // Domínio específico
  "https://*.google.com/*",          // Subdomínios
  "http://*/foo*",                   // Qualquer host, caminho específico
  "*://mail.google.com/*",           // Qualquer protocolo
  "<all_urls>"                       // Todos os URLs
]
```

---

## 🎨 Interface do Usuário

### `action`
```json
"action": {
  "default_popup": "index.html",
  "default_title": "WebScraper Extension",
  "default_icon": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Configura o botão da extensão na barra de ferramentas.

#### `default_popup`
| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Arquivo** | `"index.html"` | HTML que abre quando usuário clica no ícone |
| **Dimensões** | Nossa extensão: 400x600px | Definido no CSS do popup |
| **Alternativa** | Listener `chrome.action.onClicked` | Para ações sem popup |

#### `default_title`
| Propriedade | Valor | Descrição |
|-------------|-------|-----------|
| **Tooltip** | Texto ao passar mouse sobre o ícone | |
| **Padrão** | Usa o `name` se não especificado | |

#### `default_icon`
```json
"default_icon": {
  "16": "icons/icon16.png",    // Favicon na barra
  "32": "icons/icon32.png",    // Telas de alta densidade
  "48": "icons/icon48.png",    // Página de extensões
  "128": "icons/icon128.png"   // Chrome Web Store
}
```

**Dimensões recomendadas:**
- **16px**: Ícone pequeno na barra de ferramentas
- **32px**: Versão alta densidade (Retina) do 16px
- **48px**: Página de gerenciamento de extensões
- **128px**: Chrome Web Store e instalação

### `icons` (Global)
```json
"icons": {
  "16": "icons/icon16.png",
  "32": "icons/icon32.png",
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

Ícones para toda a extensão (diferentes do `action.default_icon`).

| Contexto | Tamanho | Uso |
|----------|---------|-----|
| **Chrome Web Store** | 128px | Listagens e instalação |
| **Gerenciador** | 48px | Lista de extensões instaladas |
| **Sistema** | 32px | Notificações e alertas |
| **Favicon** | 16px | Alguns contextos específicos |

**Formatos suportados:**
- ✅ **PNG**: Recomendado (suporte completo)
- ✅ **JPEG**: Suportado
- ❌ **SVG**: Não suportado para ícones

---

## ⚙️ Scripts e Workers

### `background`
```json
"background": {
  "service_worker": "background.js"
}
```

Define o script que roda em segundo plano.

#### Manifest V3: Service Worker
| Característica | Descrição |
|----------------|-----------|
| **Tipo** | Service Worker (não persistent) |
| **Execução** | Sob demanda, baseado em eventos |
| **Contexto** | Sem acesso ao DOM |
| **Ciclo de vida** | Inicia/para automaticamente |

#### Nossa implementação:
```javascript
// background.js
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extensão instalada:', details.reason);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Processar mensagens
});
```

#### Manifest V2 (obsoleto):
```json
"background": {
  "scripts": ["background.js"],
  "persistent": false
}
```

---

## 🔒 Segurança

### `content_security_policy`
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

Define política de segurança para prevenir ataques XSS.

#### `extension_pages`
| Diretiva | Valor | Descrição |
|----------|-------|-----------|
| `script-src 'self'` | Apenas scripts do pacote da extensão | Proíbe CDNs externos |
| `object-src 'self'` | Apenas objetos do pacote da extensão | Proíbe plugins externos |

**Políticas mais restritivas:**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
}
```

**O que é proibido:**
- ❌ `eval()` e similares
- ❌ Scripts inline (`<script>código</script>`)
- ❌ CDNs externos (exceto lista permitida)
- ❌ Event handlers inline (`onclick="..."`)

**CDNs permitidos pelo Chrome:**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' https://cdnjs.cloudflare.com; object-src 'self'"
}
```

---

## 📂 Recursos Acessíveis

### `web_accessible_resources`
```json
"web_accessible_resources": [
  {
    "resources": ["index.html", "index.css", "index.js"],
    "matches": ["<all_urls>"]
  }
]
```

Define quais arquivos da extensão podem ser acessados por páginas web.

#### `resources`
| Propriedade | Descrição |
|-------------|-----------|
| **Arquivos** | Lista de arquivos acessíveis |
| **Padrões** | Suporta wildcards (`*.png`) |
| **URL gerada** | `chrome-extension://[id]/arquivo.ext` |

#### `matches`
| Padrão | Descrição |
|--------|-----------|
| `"<all_urls>"` | Qualquer site pode acessar |
| `"https://example.com/*"` | Apenas sites específicos |
| `["https://*.google.com/*", "https://github.com/*"]` | Múltiplos domínios |

**Exemplo de uso em content script:**
```javascript
// content.js
const imgUrl = chrome.runtime.getURL('images/icon.png');
const img = document.createElement('img');
img.src = imgUrl;
document.body.appendChild(img);
```

**Manifest V2 vs V3:**
```diff
// Manifest V2
- "web_accessible_resources": ["icon.png", "script.js"]

// Manifest V3
+ "web_accessible_resources": [
+   {
+     "resources": ["icon.png", "script.js"],
+     "matches": ["<all_urls>"]
+   }
+ ]
```

---

## 📋 Propriedades Opcionais

### `content_scripts` (não usado na nossa extensão)
```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_end"
  }
]
```

Scripts que executam automaticamente em páginas correspondentes.

| Propriedade | Valores | Descrição |
|-------------|---------|-----------|
| `matches` | Padrões de URL | Onde o script deve executar |
| `js` | Array de arquivos | Scripts JavaScript |
| `css` | Array de arquivos | Folhas de estilo |
| `run_at` | `document_start`, `document_end`, `document_idle` | Quando executar |

**Por que não usamos:**
- ✅ **Sob demanda**: Preferimos injeção apenas quando necessário
- ✅ **Performance**: Não carrega scripts desnecessariamente
- ✅ **Controle**: `chrome.scripting` oferece mais flexibilidade

### `options_page` / `options_ui`
```json
"options_ui": {
  "page": "options.html",
  "open_in_tab": false
}
```

Página de configurações da extensão.

| Propriedade | Descrição |
|-------------|-----------|
| `page` | Arquivo HTML das opções |
| `open_in_tab` | Abrir em aba (`true`) ou popup (`false`) |

**Acesso**: Clique direito no ícone → "Opções"

### `permissions` adicionais comuns
```json
"permissions": [
  "storage",           // chrome.storage API
  "alarms",            // chrome.alarms API
  "notifications",     // chrome.notifications API
  "contextMenus",      // chrome.contextMenus API
  "cookies",           // chrome.cookies API
  "bookmarks",         // chrome.bookmarks API
  "history",           // chrome.history API
  "downloads",         // chrome.downloads API
  "webRequest",        // chrome.webRequest API
  "declarativeNetRequest"  // Replacement for webRequest in MV3
]
```

---

## 🔄 Migração V2 → V3

### Principais Mudanças

| Manifest V2 | Manifest V3 | Motivo |
|-------------|-------------|--------|
| `"manifest_version": 2` | `"manifest_version": 3` | Nova versão |
| `"background": {"scripts": [...]}` | `"background": {"service_worker": "..."}` | Service Workers |
| `"browser_action"` | `"action"` | Unificação de APIs |
| `"page_action"` | `"action"` | Unificação de APIs |
| `chrome.browserAction` | `chrome.action` | Nova API |
| `"web_accessible_resources": [...]` | `"web_accessible_resources": [{"resources": [...], "matches": [...]}]` | Maior controle |

### Exemplo de Migração

**Manifest V2:**
```json
{
  "manifest_version": 2,
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  "browser_action": {
    "default_popup": "popup.html"
  },
  "web_accessible_resources": ["icon.png"]
}
```

**Manifest V3:**
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "web_accessible_resources": [
    {
      "resources": ["icon.png"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Mudanças no Código

**Background Script:**
```diff
// V2: Background Page
- chrome.browserAction.onClicked.addListener(...)
+ chrome.action.onClicked.addListener(...)

// V3: Service Worker
- var data = {}; // Não persiste
+ chrome.storage.local.set({data: {}}); // Usar storage
```

**Content Scripts:**
```diff
// V2
- chrome.extension.getURL('icon.png')
+ chrome.runtime.getURL('icon.png')
```

---

## ✅ Boas Práticas

### Permissões Mínimas
```json
// ✅ Específico e necessário
"host_permissions": ["https://api.example.com/*"]

// ❌ Muito amplo
"host_permissions": ["<all_urls>"]
```

### Versionamento
```json
// ✅ Semântico
"version": "1.2.3"

// ❌ Inconsistente
"version": "v1.2"
```

### Segurança
```json
// ✅ CSP restritiva
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}

// ❌ CSP permissiva
"content_security_policy": {
  "extension_pages": "script-src 'self' 'unsafe-eval'; object-src 'self'"
}
```

### Ícones Completos
```json
// ✅ Todos os tamanhos
"icons": {
  "16": "icon16.png",
  "32": "icon32.png", 
  "48": "icon48.png",
  "128": "icon128.png"
}

// ❌ Tamanho único
"icons": {
  "48": "icon.png"
}
```

### Metadados Descritivos
```json
// ✅ Descritivo e útil
"name": "WebScraper Extension",
"description": "Extrair conteúdo de páginas web e enviar para análise"

// ❌ Vago
"name": "My Extension",
"description": "Does stuff"
```

---

## 🛠️ Ferramentas de Validação

### Chrome Extensions Developer Tools
1. Acesse `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Carregue a extensão
4. Verifique erros na console

### Validação Manual
```bash
# Verificar sintaxe JSON
cat manifest.json | jq .

# Validar estrutura
# Use ferramentas online ou scripts específicos
```

### Erros Comuns
| Erro | Causa | Solução |
|------|-------|---------|
| "Invalid manifest" | JSON malformado | Verificar sintaxe |
| "Unknown permission" | Permissão inexistente | Consultar documentação |
| "Invalid icon path" | Arquivo não encontrado | Verificar caminhos |
| "CSP violation" | Política muito restritiva | Ajustar CSP |

---

## 📚 Recursos Extras

### Documentação Oficial
- [Chrome Extension Manifest](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Migração para Manifest V3](https://developer.chrome.com/docs/extensions/migrating/)
- [Samples e Exemplos](https://github.com/GoogleChrome/chrome-extensions-samples)

### Ferramentas Úteis
- **Validator**: Chrome built-in em `chrome://extensions/`
- **JSON Validator**: [jsonlint.com](https://jsonlint.com/)
- **Icon Generator**: [favicon.io](https://favicon.io/)

### Comunidade
- [Stack Overflow](https://stackoverflow.com/questions/tagged/chrome-extension)
- [Chrome Extension Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Reddit r/chrome_extensions](https://reddit.com/r/chrome_extensions)

---

**📝 Este guia cobre todas as propriedades essenciais do manifest.json para desenvolvimento de extensões Chrome modernas e seguras.**