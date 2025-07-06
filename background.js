// Background script para WebScraper Extension
// Service Worker para Manifest V3

// Evento de instalação da extensão
chrome.runtime.onInstalled.addListener((details) => {
  console.log("WebScraper Extension instalada:", details.reason);

  if (details.reason === "install") {
    // Primeira instalação
    console.log("Primeira instalação da extensão");
  } else if (details.reason === "update") {
    // Atualização da extensão
    console.log(
      "Extensão atualizada para versão:",
      chrome.runtime.getManifest().version
    );
  }
});

// Evento de clique no ícone da extensão
chrome.action.onClicked.addListener((tab) => {
  console.log("Ícone da extensão clicado na aba:", tab.url);
});

// Listener para mensagens do content script ou popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Mensagem recebida:", request);

  switch (request.action) {
    case "scrapeCompleted":
      console.log("Scraping completado com sucesso");
      sendResponse({ status: "success" });
      break;

    case "scrapeFailed":
      console.log("Erro no scraping:", request.error);
      sendResponse({ status: "error", error: request.error });
      break;

    case "backendRequest":
      console.log("Requisição para backend:", request.agent);
      sendResponse({ status: "received" });
      break;

    default:
      console.log("Ação não reconhecida:", request.action);
      sendResponse({ status: "unknown_action" });
  }

  return true; // Manter o canal de mensagem aberto
});

// Listener para mudanças de aba
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log("Aba ativa mudou:", activeInfo.tabId);
});

// Listener para atualizações de aba
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Página carregada:", tab.url);
  }
});

// Função para verificar se o backend está disponível
async function checkBackendHealth() {
  try {
    const response = await fetch("http://localhost:8000/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.log("Backend não está disponível:", error.message);
    return false;
  }
}

// Verificar saúde do backend periodicamente (a cada 5 minutos)
setInterval(async () => {
  const isHealthy = await checkBackendHealth();
  console.log("Status do backend:", isHealthy ? "Disponível" : "Indisponível");
}, 5 * 60 * 1000);

// Log de inicialização
console.log("Background script da WebScraper Extension iniciado");
