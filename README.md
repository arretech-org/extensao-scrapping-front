# 🕷️ WebScraper Chrome Extension

Uma extensão moderna e inteligente para Chrome que permite fazer webscraping da página atual e enviar o conteúdo extraído para endpoints de backend para análise e processamento.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## ✨ Funcionalidades

- 🔍 **Webscraping Inteligente**: Extrai conteúdo principal removendo elementos desnecessários (ads, navegação, etc.)
- 🎨 **Interface Moderna**: Design limpo com cores customizadas em OKLCH
- 📊 **Metadados Completos**: Extrai título, URL, descrição, palavras-chave e dados estruturados
- 🚀 **Envio para Backend**: Dois endpoints configuráveis para análise e processamento
- 📱 **Responsivo**: Interface adaptada para popup de extensão
- 🔄 **Feedback em Tempo Real**: Status visual das operações
- 📝 **Editor de Conteúdo**: Textarea editável com contador de caracteres

## 🎨 Design System

### Cores Principais
- **Primária**: `oklch(0.208 0.042 265.755)` - Azul escuro profissional
- **Secundária**: `oklch(0.984 0.003 247.858)` - Branco suave

### Tipografia
- **Interface**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Código**: Courier New, monospace

## 📁 Estrutura do Projeto

```
webscraper-extension/
├── 📄 manifest.json          # Configuração da extensão
├── 🌐 index.html             # Interface principal (popup)
├── 🎨 index.css              # Estilos e design system
├── ⚡ index.js               # Lógica principal da extensão
├── 🔧 background.js          # Service Worker (Manifest V3)
├── 📖 README.md              # Este arquivo
├── 📚 MANIFEST_GUIDE.md      # Guia detalhado do manifest.json
└── 🖼️ icons/                # Ícones da extensão
    ├── icon16.png            # 16x16px - Favicon
    ├── icon32.png            # 32x32px - Retina
    ├── icon48.png            # 48x48px - Página de extensões
    └── icon128.png           # 128x128px - Chrome Web Store
```

## 🚀 Instalação

### Pré-requisitos
- Google Chrome (versão 88+)
- Conhecimento básico de desenvolvimento web
- Backend configurado (opcional para teste)

### Passo a Passo

1. **Clone ou baixe o projeto**
   ```bash
   git clone https://github.com/seu-usuario/webscraper-extension.git
   cd webscraper-extension
   ```

2. **Prepare os ícones**
   - Crie a pasta `icons/`
   - Adicione ícones nos tamanhos: 16px, 32px, 48px, 128px
   - Use formato PNG para melhor compatibilidade

3. **Carregue no Chrome**
   - Abra `chrome://extensions/`
   - Ative o **"Modo do desenvolvedor"**
   - Clique em **"Carregar sem compactação"**
   - Selecione a pasta do projeto
   - ✅ Extensão instalada!

4. **Verifique as permissões**
   - A extensão solicitará permissões para:
     - Acessar a aba ativa
     - Executar scripts
     - Fazer requisições para localhost

## 💻 Como Usar

### 1. Extrair Conteúdo
1. Navegue até qualquer página web
2. Clique no ícone da extensão 🕷️
3. Clique em **"Realizar Leitura"**
4. Aguarde a extração do conteúdo

### 2. Editar Resultado
- O conteúdo aparecerá no textarea
- Você pode editar manualmente se necessário
- O contador de caracteres é atualizado em tempo real

### 3. Enviar para Backend
- **📊 Análise**: Envia para análise de conteúdo
- **⚙️ Processo**: Envia para processamento

## 🔧 API Endpoints

### POST `api/feed/agent/analise`
Endpoint para análise de conteúdo extraído.

**Request Body:**
```json
{
  "content": "Conteúdo extraído da página...",
  "timestamp": "2025-07-06T15:30:00.000Z",
  "source": "chrome_extension",
  "agent": "analise",
  "contentLength": 1234
}
```

### POST `api/feed/agent/processo`
Endpoint para processamento de conteúdo extraído.

**Request Body:**
```json
{
  "content": "Conteúdo extraído da página...",
  "timestamp": "2025-07-06T15:30:00.000Z",
  "source": "chrome_extension",
  "agent": "processo",
  "contentLength": 1234
}
```

## 🛠️ Configuração do Backend

### Exemplo com Express.js
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Habilitar CORS para a extensão
app.use(cors({
  origin: ['chrome-extension://*'],
  credentials: true
}));

app.use(express.json());

// Endpoint de análise
app.post('api/feed/agent/analise', (req, res) => {
  console.log('Conteúdo para análise:', req.body);
  res.json({ success: true, message: 'Análise iniciada' });
});

// Endpoint de processo
app.post('api/feed/agent/processo', (req, res) => {
  console.log('Conteúdo para processo:', req.body);
  res.json({ success: true, message: 'Processamento iniciado' });
});

app.listen(8000, () => {
  console.log('Backend rodando em http://localhost:8000');
});

## 🧠 Como Funciona

### 1. Extração de Conteúdo
```javascript
// A função é injetada na página e executa:
function extractPageContent() {
  // Remove elementos indesejados
  removeUnwantedElements();
  
  // Extrai texto principal
  const content = extractTextContent();
  
  // Extrai metadados
  const metadata = extractMetadata();
  
  // Retorna resultado estruturado
  return formatResult(content, metadata);
}
```

### 2. Elementos Removidos
- Scripts e estilos
- Navegação e rodapés
- Anúncios e popups
- Comentários e sidebars
- Banners de cookies

### 3. Metadados Extraídos
- Título da página
- URL completa
- Descrição (meta description)
- Palavras-chave
- Autor
- Data de publicação
- Dados estruturados (Schema.org)

## 🔒 Segurança e Permissões

### Permissões Solicitadas
- **activeTab**: Acesso temporário à aba ativa
- **scripting**: Injeção de scripts para extração
- **tabs**: Leitura de informações da aba
- **host_permissions**: Requisições para backend

### Política de Segurança
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### Boas Práticas
- ✅ Solicita apenas permissões necessárias
- ✅ Usa `activeTab` em vez de `<all_urls>` quando possível
- ✅ Não executa código inline

### Modificando a Extensão
1. Edite os arquivos
2. Vá para `chrome://extensions/`
3. Clique em "🔄 Recarregar" na extensão
4. Teste as modificações

Para mais informações sobre o manifest.json, consulte [MANIFEST_GUIDE.md](MANIFEST_GUIDE.md)