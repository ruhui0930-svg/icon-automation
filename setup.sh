#!/bin/bash
# Icon Automation - MCP 서버 셋업 스크립트
# 다른 컴퓨터에서 이 프로젝트를 clone한 후 실행하세요.
#
# 사용법: ./setup.sh
#
# 필요한 것:
#   1. Claude Code CLI 설치 (https://claude.ai/code)
#   2. Gemini API Key (https://aistudio.google.com/apikey)

set -e

echo "=== Icon Automation Setup ==="
echo ""

# 1. 디렉토리 생성
echo "[1/4] 디렉토리 생성..."
mkdir -p styles/references generated

# 2. Gemini API Key 입력
if [ -f .env ]; then
    echo "[2/4] .env 파일이 이미 존재합니다. 스킵."
    source .env
else
    echo "[2/4] Gemini API Key를 입력하세요 (https://aistudio.google.com/apikey 에서 발급):"
    read -r GEMINI_API_KEY
    echo "GEMINI_API_KEY=$GEMINI_API_KEY" > .env
    echo "  → .env 파일 생성 완료"
fi

# 3. MCP 서버 설정
echo "[3/4] MCP 서버 설정..."

# mcp-image (Gemini Nano Banana)
GEMINI_KEY=$(grep GEMINI_API_KEY .env | cut -d'=' -f2)
PROJECT_DIR=$(pwd)

claude mcp add --transport stdio mcp-image -s user \
    -e GEMINI_API_KEY="$GEMINI_KEY" \
    -e IMAGE_OUTPUT_DIR="$PROJECT_DIR/generated" \
    -- npx -y mcp-image
echo "  → mcp-image 설치 완료"

# figma-official
claude mcp add --transport http figma-official -s user https://mcp.figma.com/mcp
echo "  → figma-official 설치 완료 (첫 사용 시 브라우저에서 OAuth 인증 필요)"

# 4. 확인
echo "[4/4] MCP 서버 상태 확인..."
claude mcp list

echo ""
echo "=== 셋업 완료 ==="
echo ""
echo "사용법:"
echo "  claude 실행 후 /generate-icon [단어] 입력"
echo ""
echo "예시:"
echo "  /generate-icon tree"
echo "  /generate-icon 두쫀쿠"
echo "  /generate-icon 봄동비빔밥"
