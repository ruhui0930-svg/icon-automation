# Icon Automation — Cowork 세팅 가이드

**대상**: 개발 경험이 없는 디자이너/팀원
**소요 시간**: 최초 1회 약 10~15분
**준비물**: 브라우저 + 아래 3개 계정
- Anthropic (Claude) 계정
- Google 계정 (Gemini API Key 발급용)
- Figma 계정 (쓰기 권한)

---

## 이 도구로 무엇을 하나

팀 Figma 파일에 있는 기존 3D 아이콘 스타일을 학습해서, 새 키워드(예: `wallet`, `shopping cart`, `두쫀쿠`)에 대해 **같은 톤의 새 3D 아이콘을 자동 생성**하고 같은 Figma 파일의 "Generated Icons" 페이지에 자동 업로드해주는 도구다. 생성은 Google의 Gemini(나노 바나나) 이미지 모델을 사용한다.

---

## 왜 Cowork인가

- **설치 제로** — Mac/Windows/Chromebook 상관없이 브라우저만 있으면 됨
- 개발 도구(git, node, Claude Code CLI)가 미리 깔려 있음
- 팀원끼리 workspace 공유 가능
- 작업물이 클라우드에 저장돼서 다른 기기에서도 이어서 사용 가능

---

## 1단계: Gemini API Key 발급 (먼저 해둬야 함)

> ⚠️ **중요**: 이미지 생성 모델은 무료 티어 한도가 0이라 **billing(결제수단) 연결이 거의 필수**다. 키 발급 후 billing 연결 전까지는 호출할 때마다 quota 에러가 난다.

1. 브라우저에서 https://aistudio.google.com/apikey 접속
2. Google 계정 로그인
3. **"Create API key"** 클릭 → **"Create API key in new project"** 선택
4. 뜨는 문자열(`AIzaSy...`로 시작)을 **복사해서 메모장/노트에 임시 저장**
5. 같은 Google 계정으로 https://console.cloud.google.com/billing 접속
6. 새로 만든 프로젝트에 **결제수단(카드) 연결**
7. 연결 완료 확인 후 몇 분 기다리기

> 💡 비용 감: 이미지 한 장당 약 $0.03~0.04 (₩40~55). 하루 30장 만들어도 월 $30 안 됨.

---

## 2단계: Cowork workspace 만들기

1. 브라우저에서 https://claude.ai/code 접속
2. Anthropic 계정 로그인
3. **"Cowork"** 또는 **"Cloud workspace"** / **"New workspace"** 메뉴 클릭
4. Workspace 생성 화면에서:
   - **"Clone from GitHub"** 옵션 선택
   - URL 입력: `https://github.com/ruhui0930-svg/icon-automation`
   - **Create** 클릭

> Clone 옵션이 UI에 안 보이면 빈 workspace 생성 후 Claude에게 아래 문장 복붙:
> ```
> git clone https://github.com/ruhui0930-svg/icon-automation 하고 그 폴더로 cd 해줘
> ```

workspace가 준비되면 Claude Code 세션과 파일 트리가 브라우저에 보인다.

---

## 3단계: Claude에게 셋업 실행 요청

Claude Code 입력창에 아래 문장을 그대로 복붙하되, `여기에_붙여넣기` 부분만 1단계에서 발급받은 Gemini API Key 값으로 교체:

```
icon-automation 폴더의 setup.sh를 실행해줘.
스크립트가 Gemini API Key를 물어보면 이 값을 입력해줘: 여기에_붙여넣기
```

Claude가 자동으로:
- `setup.sh`에 실행 권한 부여
- 스크립트 실행
- Key 입력 단계 자동 처리
- MCP 서버 2개(`mcp-image`, `figma-official`) 등록
- 완료 확인

마지막에 `claude mcp list` 결과에 두 서버 이름이 나오면 성공.

---

## 4단계: Figma 권한 부여 (첫 실행 시 1회)

처음 `/generate-icon`을 실행할 때 Figma OAuth 로그인 페이지가 브라우저 새 탭에 열린다.

1. Figma 계정 로그인돼 있는지 확인
2. **"Allow"** 또는 **"Authorize"** 클릭
3. "Authentication successful" 메시지 확인 후 Cowork 탭으로 돌아가기

이후에는 권한이 저장돼서 다시 안 물어본다.

---

## 5단계: 첫 테스트

Claude Code 입력창에:

```
/generate-icon tree
```

진행 순서 (스킬이 알아서 함):
1. 팀 Figma 파일에서 레퍼런스 아이콘 캡처
2. 스타일 분석(최초 1회만, 이후 캐시)
3. 입력 단어 리서치
4. Gemini로 이미지 생성
5. 스타일 일치도 검증
6. Figma "Generated Icons" 페이지에 자동 업로드

완료 후 결과물:
- Cowork 파일 트리의 `generated/tree.png` (우클릭 → Download로 로컬 저장 가능)
- 팀 Figma 파일의 "Generated Icons" 페이지에도 자동 추가됨

---

## 일상 사용법 (세팅 완료 후)

1. https://claude.ai/code 접속 → 해당 workspace 열기
2. 입력창에:
   ```
   /generate-icon [키워드]
   ```
   예시:
   - `/generate-icon wallet`
   - `/generate-icon shopping cart`
   - `/generate-icon 두쫀쿠`
3. 결과 확인
4. 필요 시 결과 이미지 로컬 다운로드

### 스타일 재분석이 필요할 때

팀 Figma 파일의 레퍼런스 아이콘이 변경됐거나 결과가 이상할 때:

```
/generate-icon [키워드] --refresh
```

`--refresh` 플래그를 붙이면 캐시된 스타일 프로파일을 무시하고 Figma에서 다시 분석한다.

---

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `command not found` 에러 | MCP 서버 미등록 | Claude에게 "claude mcp list로 확인하고 없으면 setup.sh 다시 실행" |
| "quota exceeded" / "RESOURCE_EXHAUSTED" | Gemini billing 미연결 | 1단계의 billing 연결 단계 다시 확인 |
| Figma 업로드 실패 | OAuth 권한 만료/거부 | Claude에게 "figma 재인증" 요청 → 다시 뜨는 브라우저 창에서 Allow |
| 결과 이미지가 너무 사실적 | 스타일 캐시 오류 | `--refresh` 플래그로 재시도 |
| 결과 이미지가 키워드와 다름 | 단어 리서치 실패 | Claude에게 "이 키워드는 X 모양이야, 다시 생성해줘"로 교정 입력 |
| Workspace가 안 열림 | Cowork 세션 만료 | 재로그인 후 workspace 목록에서 다시 선택 |

---

## 팀장/관리자 메모

### API Key 관리
- Gemini API Key는 workspace 내 `.env` 파일에 저장됨
- **workspace를 팀원과 공유하면 키도 함께 노출**됨
- 권장: 팀원 각자 자기 workspace를 만들어서 각자 키 관리
- 키가 노출된 경우 https://aistudio.google.com/apikey 에서 즉시 Delete 후 재발급

### 팀 공유 방식
1. **개별 workspace 방식 (권장)**: 각자 이 가이드대로 본인 workspace 생성
2. **공유 workspace 방식**: 1명이 만든 workspace를 팀에 공유 (비용 분담 가능하지만 키 관리 주의)

### 비용 예상
- Gemini 이미지 생성: 한 장당 약 $0.03~0.04
- Cowork 사용료: Anthropic 플랜에 포함됨 (별도 요금 구조는 플랜 확인)

### 업데이트 반영
저장소가 업데이트되면 Cowork workspace에서 Claude에게:
```
icon-automation 폴더에서 git pull 해줘
```

---

## 참고 링크

- 저장소: https://github.com/ruhui0930-svg/icon-automation
- Claude Code: https://claude.ai/code
- Gemini API: https://aistudio.google.com/apikey
- Google Cloud Billing: https://console.cloud.google.com/billing
- Figma: https://figma.com

---

_이 가이드는 icon-automation 저장소와 함께 배포됩니다. 문제가 있으면 팀장에게 문의._
