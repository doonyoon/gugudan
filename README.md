# 고양이 성채전

설치 없이 실행되는 오리지널 횡스크롤 고양이 디펜스 웹 게임입니다.

## 실행

`index.html`을 브라우저에서 열면 바로 실행됩니다. 로컬 서버가 필요하다면 다음 명령을 사용하세요.

```powershell
python -m http.server 8000
```

브라우저에서 `http://localhost:8000`으로 접속합니다.

## 구성

- `index.html`: 게임 화면과 접근성 구조
- `style.css`: PC·모바일·가로 화면 반응형 디자인
- `game.js`: Canvas 전투, 유닛, 적, 자원, 사운드 시스템
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포

외부 패키지나 빌드 과정은 필요하지 않습니다.
