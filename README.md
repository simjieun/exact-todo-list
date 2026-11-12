# 하루 한 걸음 · Daily Todo

Exact의 Contract + TypeScript로 만든 날짜별 Todo 앱입니다. 같은 소스로 Web, iOS(UIKit), macOS(AppKit)를 빌드합니다.

## 기능

- 오늘/이전/다음 날짜, 날짜 직접 선택
- 할 일 추가·수정·완료/해제·삭제 확인
- 전체/진행 중/완료 필터, 완료 현황
- 기기 내 SQLite 영구 저장, 자정 이후 오늘 날짜 갱신
- 한국어 UI, 플랫폼 기본 컨트롤과 다크 모드
- 저장 실패 안내, 성공한 저장 이후에만 입력 초기화

로그인과 기기 간 동기화는 없습니다. Web은 동일한 브라우저 프로필과 사이트 주소에서 기록이 유지됩니다. 브라우저 데이터 삭제 또는 앱 데이터 삭제 시 기록이 없어질 수 있습니다. 이 버전은 개인용 MVP이며 백업/내보내기는 포함하지 않습니다.

## Web 빠르게 열기

Exact로 빌드한 `dist/`를 포함했습니다. Python 3.9 이상이 있다면 별도 빌드 없이:

```sh
cd daily-todo
python3 run-web.py
```

브라우저에서 http://localhost:8080 에 접속하세요. 파일을 더블클릭하는 `file://` 방식은 지원하지 않습니다. 기록을 유지하려면 같은 브라우저와 같은 URL/포트를 사용하세요. 소스를 수정하면 아래 Exact 명령으로 다시 빌드해야 합니다.

## 준비

Exact는 React/Expo SDK 프로젝트가 아닙니다. npm으로 배포되는 안정 버전이 아닌 소스 체크아웃을 사용합니다.

- Bun 1.4.2 이상, Rust(rustup), Git, Chrome/Chromium
- iOS/macOS 빌드: Mac + Xcode와 해당 SDK. iOS 시뮬레이터를 설치합니다.
- iPhone 실기기/배포용 빌드는 Apple 서명 설정이 추가로 필요합니다.

참조한 Exact 커밋: `c80cb84cf94a60fec0a01fa525aac1a3c2befba8`.
원본: https://github.com/expo/exact

압축을 풀어 다음 구조로 준비합니다. `exact`는 앱 폴더의 **형제 폴더**입니다.

```sh
# daily-todo 폴더가 있는 상위 디렉터리에서 실행
 git clone https://github.com/expo/exact.git exact
 git -C exact checkout c80cb84cf94a60fec0a01fa525aac1a3c2befba8
 cd exact
 bun install --frozen-lockfile
 bun scripts/exact.mjs setup
 cd ../daily-todo
```

기존 Exact 체크아웃을 쓰려면 `EXACT=/절대/경로/exact bun exact.mjs web` 형태로 실행할 수 있습니다. API 변경이 잦으므로 위 커밋을 권장합니다.

## 실행

```sh
bun exact.mjs web           # Web 개발 서버, 출력된 URL 접속
bun exact.mjs ios --run     # iOS 시뮬레이터
bun exact.mjs mac --run     # macOS 앱
```

처음 네이티브 빌드는 도구 다운로드와 Rust/Swift 컴파일로 오래 걸릴 수 있습니다. 빌드 도구가 정확한 누락 SDK를 안내합니다.

## 검증

```sh
bun exact.mjs verify        # Web 빌드, 동작, 레이아웃 검증
bun exact.mjs verify ios    # Mac에서 iOS 검증
bun exact.mjs test macos    # Mac에서 동일 시나리오 실행
node --test tests/storage.test.mjs  # Node 24+: 실제 SQLite 데이터 테스트
```

`app.test.contract`에는 추가·완료·수정·재실행 보존, 날짜 분리, 삭제 취소/확정, 필터, 자정 전환 시나리오가 있습니다.

## 파일

| 파일 | 역할 |
| --- | --- |
| app.contract | 공통 화면, 상태, 액션, 접근성 이름 |
| app.ts | SQLite 조회/저장, 날짜와 입력 검증 |
| app.json | 앱 ID와 Web/iOS/macOS 설정 |
| app.test.contract | 플랫폼 공통 UI 테스트 |
| tests/storage.test.mjs | 실제 SQLite 어댑터를 이용한 데이터 테스트 |
| exact.mjs | Exact가 생성한 실행 진입점 |

`app.contract.d.ts`와 빌드 산출물은 Exact가 생성합니다. 데이터 파일은 앱의 `app:/data/todos.db`에 저장됩니다. 앱 ID `com.joy.dailytodo`를 바꾸면 기존 저장 영역과 분리될 수 있습니다.

## 이번 환경의 검증 결과

- Exact Contract 컴파일: 오류 0개.
- Exact Web 프로덕션 빌드: 성공, `dist/` 포함.
- Node 실제 SQLite 테스트: 3개 통과.
- 브라우저 UI 테스트/화면 검수: 실행 환경의 Chromium 소켓 권한 제한으로 미완료. 테스트 파일은 포함되어 있으나 통과를 주장하지 않습니다.
- iOS/macOS 앱 빌드 및 실기기 검증: Linux 환경이므로 미완료. 설치 가능한 `.ipa`/`.app` 배포본이 아닌 공통 소스 프로젝트입니다.

## 디자인

색은 `app.tamber`(토큰, 라이트·다크), 모양은 `app.contract`의 스타일 속성에 있습니다. Web·iOS·macOS에 같이 적용됩니다.

`npm run build`는 Exact 빌드 후 파비콘을 `dist/`에 반영합니다.
포함된 배포본에 에셋 변경만 다시 적용하려면 `npm run favicon`을 실행하세요.
`bun exact.mjs web-build`를 직접 실행했다면 이후 `npm run favicon`이 필요합니다.
