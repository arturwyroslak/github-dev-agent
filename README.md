# GitHub Dev Agent 🤖

Inteligentny agent developerski z integracjią GitHub, zaprojektowany do automatyzacji zadań programistycznych i zarządzania projektami.

## ✨ Nowe Funkcje

### Ulepszony Interfejs
- **Czysty interfejs chatu** - skupiony na najważniejszej funkcjonalności
- **Usunięto zbędne panele** - bez imitacji zaawansowanych funkcji
- **Responsywny design** - pełna responsywność na wszystkich urządzeniach
- **Nowoczesne style** - ciemny motyw z gradientami i animacjami

### Interface Chatu
- **Prosty i funkcjonalny** - bez skomplikowanych elementów wizualnych
- **Markdown support** - pełne wsparcie dla formatowania
- **Syntax highlighting** - podświetlanie składni kodu
- **Auto-resize textarea** - automatyczne dopasowanie wysokości
- **Loading indicators** - wizualne wskazniki ładowania
- **Error handling** - obsługa błędów z user-friendly komunikatami

## 🏗️ Architektura

### Frontend
- **React 18 + TypeScript** - nowoczesny stack frontend
- **Vite** - szybki build tool
- **SCSS** - zaawansowane style
- **Lucide Icons** - spójne ikony
- **React Markdown** - renderowanie Markdown
- **Syntax Highlighter** - podświetlanie kodu

### Backend
- **Python FastAPI** - szybkie API
- **WebSocket** - komunikacja w czasie rzeczywistym
- **GitHub API** - integracja z GitHub
- **Docker** - konteneryzacja

## 🚀 Szybki Start

### Wymagania
- Docker i Docker Compose
- Git
- GitHub token (opcjonalnie)

### Instalacja

1. **Klonowanie repozytorium**
```bash
git clone https://github.com/arturwyroslak/github-dev-agent.git
cd github-dev-agent
```

2. **Konfiguracja środowiska**
```bash
cp .env.example .env
# Edytuj .env i uzupełnij niezbędne zmienne
```

3. **Uruchomienie z Docker Compose**
```bash
# Wersja rozwojowa
docker-compose up -d

# Wersja produkcyjna
docker-compose -f docker-compose.production.yml up -d

# Wersja uproszczona (tylko chat)
docker-compose -f docker-compose.simple.yml up -d
```

4. **Otwórz przeglądarkę**
```
http://localhost:3000
```

## 🛠️ Rozwoj

### Tryb Developerski

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Struktura Projektów

```
github-dev-agent/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── chat/          # Chat interface
│   │   │       └── SimpleChatInterface.tsx
│   │   └── styles/         # SCSS styles
│   │       ├── globals.scss
│   │       └── components/
│   │           └── chat.scss
│   └── package.json
├── backend/               # Python backend
│   ├── main.py
│   └── requirements.txt
├── nginx/                # Nginx config
└── docker-compose.yml    # Docker setup
```

## 📚 API

### Endpoints

- `GET /api/health` - Status zdrowia aplikacji
- `POST /api/chat` - Wysyłanie wiadomości do agenta
- `WebSocket /ws/chat` - Komunikacja w czasie rzeczywistym

### Przykład Użycia API

```javascript
// Wysyłanie wiadomości
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Stwórz komponent React do wyświetlania listy',
    history: []
  })
});

const data = await response.json();
console.log(data.response);
```

## 🔧 Konfiguracja

### Zmienne Środowiskowe

```env
# GitHub
GITHUB_TOKEN=ghp_your_token_here
GITHUB_USERNAME=your_username

# API
API_HOST=0.0.0.0
API_PORT=8080

# Frontend
VITE_API_URL=http://localhost:8080
```

### Docker Configuration

```yaml
# docker-compose.simple.yml - Uproszczona wersja
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
  
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
```

## 📋 TODO

- [ ] Backend API implementation
- [ ] GitHub API integration
- [ ] WebSocket real-time communication
- [ ] User authentication
- [ ] Project management features
- [ ] Code analysis tools
- [ ] Automated testing
- [ ] CI/CD integration

## 👍 Contributing

1. Fork projektu
2. Stwórz branch feature (`git checkout -b feature/amazing-feature`)
3. Commit zmian (`git commit -m 'Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

## 📜 Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) po szczegóły.

## 🚀 Roadmap

### v1.1 - Podstawowy Chat (Aktualna)
- ✅ Czysty interfejs chatu
- ✅ Markdown support
- ✅ Responsywny design
- ✅ Error handling

### v1.2 - Backend Integration
- ⏳ API backend implementation
- ⏳ GitHub API integration
- ⏳ Real-time WebSocket

### v1.3 - Advanced Features
- ⏳ Code analysis
- ⏳ Project management
- ⏳ Automated workflows

---

**GitHub Dev Agent** - Twój inteligentny partner w rozwoju oprogramowania! 💻✨