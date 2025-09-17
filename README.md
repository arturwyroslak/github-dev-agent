# 🤖 AI Developer Agent

Nowoczesna webowa aplikacja wykorzystująca GitHub MCP (Model Context Protocol) server do wykonywania operacji na GitHub w imieniu użytkownika.

## 🎯 Opis Funkcjonalny

**AI Developer Agent** to zaawansowane narzędzie, które działa jako most między użytkownikiem a GitHub API, wykorzystując Model Context Protocol do inteligentnego zarządzania repozytoriami, issues, pull requestami i innymi operacjami GitHub.

### Główne Funkcjonalności

#### 🏗️ Zarządzanie Repozytoriami
- Tworzenie, forkowanie i usuwanie repozytoriów
- Oznaczanie gwiazdką i zarządzanie obserwowanymi repozytoriami
- Kompletne zarządzanie strukturą projektu

#### 📁 Operacje na Plikach
- Tworzenie, edycja i usuwanie plików
- Bulk operacje (push_files)
- Przeglądanie zawartości plików

#### 🌿 Zarządzanie Gałęziami
- Tworzenie i zarządzanie branżami
- Przegląd historii commitów
- Operacje merge i rebase

#### 🐛 Issues i Sub-Issues
- Tworzenie, edycja i zamykanie issues
- Hierarchiczne zarządzanie sub-issues
- Przypisywanie Copilot do automatyzacji
- Priorytetyzacja i organizacja zadań

#### 🔄 Pull Requests
- Tworzenie PR z integracją Copilot
- Zarządzanie reviewami i komentarzami
- Automatyczne merge i status tracking
- Diff viewer i analiza zmian

#### ⚙️ Workflows i Actions
- Uruchamianie i monitorowanie workflow
- Zarządzanie artefaktami i logami
- Analiza wykorzystania zasobów
- Retry mechanizmy dla failed jobs

#### 🔍 Wyszukiwanie i Analiza
- Zaawansowane wyszukiwanie kodu
- Znajdowanie repozytoriów, użytkowników, organizacji
- Filtrowanie issues i pull requestów

#### 🔔 Powiadomienia
- Centralne zarządzanie notyfikacjami
- Subskrypcje repozytoriów
- Audyt aktywności

#### 🔒 Bezpieczeństwo
- Code scanning alerts
- Secret scanning
- Dependabot integration
- Security advisories

## 🏗️ Architektura

### Frontend
```
React 18 + TypeScript
├── Redux Toolkit (state management)
├── Material-UI v5 (component library)  
├── Styled Components (styling)
├── Vite (build tool)
└── React Router (routing)
```

### Backend
```
Node.js 18 + NestJS 9
├── PostgreSQL (database)
├── TypeORM (ORM)
├── OAuth 2.0 (GitHub authentication)
├── MCP Integration Layer
└── OpenTelemetry (observability)
```

### MCP Integration
```
Model Context Protocol Server
├── Advanced Prompt Engineering
├── Context Orchestration
├── Rate Limiting & Throttling
├── Audit & Compliance
└── Real-time Status Updates
```

## 🎨 Design System

### Paleta Kolorów
- **Primary**: #5B8CFF
- **Secondary**: #00C2A8, #F59E0B  
- **Success**: #28A745
- **Warning**: #FFC107
- **Error**: #DC3545
- **Info**: #0D6EFD

### Typografia
- **Font**: Inter, system fonts
- **Hierarchy**: H1 32px, H2 24px, H3 20px, Body 16px
- **Weights**: 300, 400, 500, 600, 700

### Komponenty
- Responsive design (320px - 1440px+)
- Accessibility compliance (WCAG 2.1)
- Dark/Light mode support
- Micro-interactions i animacje

## 🚀 Funkcjonalności

### Chat-like Interface
- Konwersacyjny interface do wydawania poleceń
- Inteligentne prompt engineering
- Kontekstowa historia operacji
- Auto-suggestions i command completion

### MCP Orchestration
- Zaawansowana inżynieria instrukcji systemowych
- Automatyczne tłumaczenie poleceń na GitHub API calls
- Polityki uprawnień i bezpieczeństwa
- Retry logic z exponential backoff

### Real-time Updates
- WebSocket connections dla live updates
- Progress tracking dla długotrwałych operacji  
- Status indicators i notyfikacje
- Activity feed i audit logs

### Security & Compliance
- OAuth 2.0 integration z GitHub
- Encrypted token storage
- Rate limiting compliance
- Audit trail wszystkich operacji

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px - 1439px
- **Large Desktop**: 1440px+

### Adaptive Features
- Collapsible sidebar na mobile
- Touch-optimized controls
- Fluid typography
- Contextual navigation

## 🔧 Instalacja i Uruchomienie

```bash
# Klonowanie repozytorium
git clone https://github.com/arturwyroslak/github-dev-agent.git
cd github-dev-agent

# Instalacja dependencies
npm install

# Setup środowiska
cp .env.example .env
# Skonfiguruj GitHub OAuth App i database

# Uruchomienie development
npm run dev
```

## 🧪 Testowanie

```bash
# Unit tests
npm run test

# E2E tests  
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 🏭 Deployment

### Production Build
```bash
npm run build
npm run preview
```

### Docker
```bash
docker build -t github-dev-agent .
docker run -p 3000:3000 github-dev-agent
```

### Environment Variables
```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/github_dev_agent

# MCP Server
MCP_SERVER_URL=http://localhost:8080
MCP_API_KEY=your_mcp_api_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## 📊 Monitoring i Observability

- **Metrics**: Prometheus + Grafana
- **Logging**: Structured logging z OpenTelemetry
- **Tracing**: Distributed tracing
- **Health Checks**: Liveness i readiness probes
- **Performance**: Web vitals tracking

## 🤝 Contributing

1. Fork repozytorium
2. Utwórz feature branch (`git checkout -b feature/amazing-feature`)  
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

## 📄 Licencja

MIT License - zobacz [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- GitHub API Team
- Model Context Protocol Community  
- React i NestJS Communities
- Open Source Contributors

---

**Zbudowane z ❤️ dla developer community**