#!/bin/bash
set -euo pipefail

VOLUME_NAME="opencode-qdrant-data"
QDRANT_CONTAINER="opencode-qdrant"
QDRANT_PORT=6333
COLLECTION_NAME="${QDRANT_COLLECTION:-code-repository}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-sentence-transformers/all-MiniLM-L6-v2}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

if ! command -v uvx >/dev/null 2>&1 && [ -f "$HOME/.local/bin/env" ]; then
    # Astral's installer puts uv/uvx here on macOS/Linux hosts.
    # shellcheck disable=SC1091
    . "$HOME/.local/bin/env"
fi

is_container_running() {
    local name="$1"
    local running
    running=$(docker ps -q -f name="^${name}$" 2>/dev/null || true)
    [ -n "$running" ]
}

start_qdrant() {
    docker rm -f "$QDRANT_CONTAINER" 2>/dev/null || true
    docker run -d \
        --name "$QDRANT_CONTAINER" \
        -p "$QDRANT_PORT:6333" \
        -p "6334:6334" \
        -v "$VOLUME_NAME:/qdrant/storage" \
        --rm \
        qdrant/qdrant:latest >/dev/null 2>&1
}

wait_for_qdrant() {
    local i
    for i in $(seq 1 30); do
        if curl -sf "http://localhost:$QDRANT_PORT/readyz" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

# Check Docker
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running or not accessible" >&2
    exit 1
fi

# Check uvx
if ! command -v uvx >/dev/null 2>&1; then
    echo "Error: uvx not found. Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
    exit 1
fi

# Setup Docker volume
if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    echo "Creating Docker volume: $VOLUME_NAME" >&2
    docker volume create "$VOLUME_NAME" >/dev/null
fi

# Start Qdrant if not running
if ! is_container_running "$QDRANT_CONTAINER"; then
    echo "Starting Qdrant container..." >&2
    if ! start_qdrant; then
        echo "Error: Failed to start Qdrant container" >&2
        exit 1
    fi
fi

# Wait for Qdrant
if ! wait_for_qdrant; then
    echo "Error: Qdrant did not become ready within 30 seconds" >&2
    exit 1
fi

echo "Qdrant is ready on port $QDRANT_PORT" >&2
echo "Starting Qdrant MCP server with uvx..." >&2

# Run the official Qdrant MCP server with uvx
export QDRANT_URL="http://localhost:$QDRANT_PORT"
export COLLECTION_NAME="$COLLECTION_NAME"
export EMBEDDING_MODEL="$EMBEDDING_MODEL"
export TOOL_STORE_DESCRIPTION="Store code snippets and documentation for semantic search. The 'information' parameter should contain a natural language description of what the code does, while the actual code should be included in the 'metadata' parameter as a 'code' property. Use this to index the codebase for later retrieval."
export TOOL_FIND_DESCRIPTION="Search for relevant code snippets and documentation using natural language. The 'query' parameter should describe the functionality or pattern you're looking for. Returns matching code snippets with their descriptions."

exec uvx mcp-server-qdrant
