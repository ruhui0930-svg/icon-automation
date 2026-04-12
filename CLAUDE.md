# Icon Automation Project

## Figma
- **파일 URL**: https://www.figma.com/design/pKdkjgZU1mbhgpeFcklnYh/test?node-id=41-2
- **레퍼런스**: 한 페이지에 3D 아이콘 PNG 나열
- **출력**: 같은 파일 "Generated Icons" 페이지

## MCP Servers
- `figma-official`: Figma 읽기/쓰기 (OAuth)
- `mcp-image`: Gemini Nano Banana 이미지 생성

## Rules
- Figma MCP에서 localhost 이미지 소스가 반환되면 직접 사용할 것
- 아이콘 생성 시 새 패키지를 추가하지 말 것 — 모든 에셋은 생성된 결과물 사용
- placeholder 이미지를 사용하지 말 것
- 생성된 아이콘은 `generated/` 디렉토리에 저장
- 스타일 프로파일은 `styles/` 디렉토리에 캐싱
