# Icon Automation

팀 Figma 파일에 있는 3D 아이콘 스타일을 학습해서, 새 키워드에 대해 같은 톤의 3D 아이콘을 자동 생성하고 Figma에 자동 업로드하는 Claude Code 스킬.

## 무엇을 하는가

1. 팀 Figma 파일에서 기존 3D 아이콘 스타일을 분석 (자동)
2. 입력 키워드(예: `wallet`, `shopping cart`, `두쫀쿠`)의 실물 특성을 리서치
3. Gemini 2.5 Flash Image(nano banana)로 아이콘 이미지 생성
4. 스타일 일치 여부 자동 검증
5. 같은 Figma 파일의 "Generated Icons" 페이지에 자동 업로드
6. 로컬 `generated/` 폴더에도 저장

## 빠른 시작

비개발자용 Cowork 기반 세팅 가이드는 [SETUP_COWORK.md](./SETUP_COWORK.md)를 참고.

로컬 Mac에 설치하려면:

```bash
git clone https://github.com/ruhui0930-svg/icon-automation ~/icon-automation
cd ~/icon-automation
chmod +x setup.sh && ./setup.sh
```

셋업 스크립트가 요구하는 것:
- Claude Code CLI — https://claude.ai/code
- Gemini API Key — https://aistudio.google.com/apikey (billing 연결 필요)
- Figma 계정 (첫 실행 시 OAuth 인증)

## 사용법

Claude Code 세션에서:

```
/generate-icon [키워드]
```

예:
- `/generate-icon wallet`
- `/generate-icon 두쫀쿠`
- `/generate-icon shopping cart --refresh` (스타일 캐시 재분석)

## 구조

```
.
├── .claude/skills/generate-icon/SKILL.md   # 스킬 본체
├── styles/
│   ├── icon-style-profile.md               # 스타일 프로파일 (캐시)
│   ├── prompt-template.md                  # 생성 프롬프트 템플릿
│   └── references/                         # Figma 캡처 레퍼런스 (자동 생성)
├── generated/                              # 생성된 아이콘 PNG (자동 생성)
├── setup.sh                                # MCP 서버 자동 셋업
├── CLAUDE.md                               # 프로젝트 설정
├── SETUP_COWORK.md                         # Cowork 세팅 가이드
└── README.md
```

## MCP 의존성

- `figma-official` — Figma 읽기/쓰기 (OAuth)
- `mcp-image` — Gemini Nano Banana 이미지 생성

둘 다 `setup.sh`가 자동 등록한다.
