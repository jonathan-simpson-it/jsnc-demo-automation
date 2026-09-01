#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────
# PE AI Engineering Portfolio — Full App Launcher
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════╗"
    echo "║     🏦  PE AI Engineering Portfolio             ║"
    echo "║     RAG + Multi-Agent System for Private Equity ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ─── Check .env ──────────────────────────────────────────────
check_env() {
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠  No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}   Please edit .env and set your DEEPSEEK_API_KEY${NC}"
        echo -e "${RED}   Then re-run this script.${NC}"
        exit 1
    fi

    source .env
    if [ -z "$DEEPSEEK_API_KEY" ] || [ "$DEEPSEEK_API_KEY" = "your-deepseek-api-key-here" ]; then
        echo -e "${RED}❌ DEEPSEEK_API_KEY is not set in .env${NC}"
        echo -e "${RED}   Get your key at https://platform.deepseek.com${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ DEEPSEEK_API_KEY is configured${NC}"
}

# ─── Install dependencies ───────────────────────────────────
install_deps() {
    echo -e "\n${CYAN}📦 Installing dependencies...${NC}"
    pip install -e ".[dev]" -q 2>/dev/null
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# ─── Ingest documents ───────────────────────────────────────
ingest_docs() {
    echo -e "\n${CYAN}📂 Ingesting documents into vector store...${NC}"
    python scripts/ingest.py
}

# ─── Parse arguments ────────────────────────────────────────
API_PORT="${API_PORT:-8000}"
STREAMLIT_PORT="${STREAMLIT_PORT:-8501}"
SKIP_INSTALL=false
SKIP_INGEST=false
API_ONLY=false
UI_ONLY=false

for arg in "$@"; do
    case $arg in
        --skip-install)  SKIP_INSTALL=true ;;
        --skip-ingest)   SKIP_INGEST=true ;;
        --api-only)      API_ONLY=true ;;
        --ui-only)       UI_ONLY=true ;;
        --api-port=*)    API_PORT="${arg#*=}" ;;
        --ui-port=*)     STREAMLIT_PORT="${arg#*=}" ;;
        --help|-h)
            echo "Usage: ./run.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-install    Skip pip install step"
            echo "  --skip-ingest     Skip document ingestion step"
            echo "  --api-only        Only start the FastAPI server"
            echo "  --ui-only         Only start the Streamlit UI"
            echo "  --api-port=PORT   API server port (default: 8000)"
            echo "  --ui-port=PORT    Streamlit UI port (default: 8501)"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Run ./run.sh --help for usage"
            exit 1
            ;;
    esac
done

# ─── Main ───────────────────────────────────────────────────
print_banner

# Step 1: Environment
echo -e "\n${CYAN}Step 1/4: Checking environment${NC}"
check_env

# Step 2: Install
if [ "$SKIP_INSTALL" = false ]; then
    echo -e "\n${CYAN}Step 2/4: Installing dependencies${NC}"
    install_deps
else
    echo -e "\n${YELLOW}Step 2/4: Skipping install (--skip-install)${NC}"
fi

# Step 3: Ingest
if [ "$SKIP_INGEST" = false ] && [ "$UI_ONLY" = false ]; then
    echo -e "\n${CYAN}Step 3/4: Ingesting documents${NC}"
    ingest_docs
else
    echo -e "\n${YELLOW}Step 3/4: Skipping ingestion${NC}"
fi

# Step 4: Launch
echo -e "\n${CYAN}Step 4/4: Starting services${NC}"
echo ""

cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
    kill $(jobs -p) 2>/dev/null
    wait
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

if [ "$API_ONLY" = true ]; then
    echo -e "${GREEN}🚀 Starting FastAPI on http://localhost:${API_PORT}${NC}"
    echo -e "${CYAN}📖 API docs: http://localhost:${API_PORT}/docs${NC}"
    uvicorn src.api.main:app --host 0.0.0.0 --port "$API_PORT" --reload

elif [ "$UI_ONLY" = true ]; then
    echo -e "${GREEN}🚀 Starting Streamlit on http://localhost:${STREAMLIT_PORT}${NC}"
    streamlit run src/ui/app.py --server.port "$STREAMLIT_PORT"

else
    # Start both
    echo -e "${GREEN}🚀 Starting FastAPI on http://localhost:${API_PORT}${NC}"
    echo -e "${GREEN}🚀 Starting Streamlit on http://localhost:${STREAMLIT_PORT}${NC}"
    echo -e "${CYAN}📖 API docs: http://localhost:${API_PORT}/docs${NC}"
    echo -e "${CYAN}🖥  Streamlit UI: http://localhost:${STREAMLIT_PORT}${NC}"
    echo ""

    uvicorn src.api.main:app --host 0.0.0.0 --port "$API_PORT" --reload &
    API_PID=$!

    streamlit run src/ui/app.py --server.port "$STREAMLIT_PORT" &
    UI_PID=$!

    echo -e "\n${GREEN}✅ Both services running (API: PID $API_PID, UI: PID $UI_PID)${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}\n"

    wait
fi
