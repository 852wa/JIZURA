# JIZURA — 가사 모션 비디오 메이커

가사를 입력하면 브라우저에서 리릭 모션 영상을 자동으로 구성하고 MP4로 내보낼 수 있습니다. JIZURA는 레이아웃, 등장, 유지, 퇴장, 장식, 글자 효과, 배경, 카메라, 화면 효과, 전환을 조합하며, 시드를 바꾸거나 **자동으로 만들기**를 누르면 다른 구성을 만들 수 있습니다.

**[한국어판 열기](https://852wa.github.io/JIZURA/ko/)** · [日本語版](https://852wa.github.io/JIZURA/) · [English](https://852wa.github.io/JIZURA/en/) · [일본어 가이드](README.md)

한국어·영어·일본어 브라우저판은 같은 프로젝트 형식과 브라우저 저장 데이터를 사용합니다. 편집기 상단의 언어 링크로 UI 언어를 바꿔도 가사와 설정은 그대로 유지됩니다.

<details>
<summary><h2>빠른 시작</h2></summary>

1. 왼쪽 가사 입력란에 한 줄당 한 프레이즈씩 가사를 붙여 넣습니다.
2. 필요하면 음원을 불러옵니다. JIZURA가 박자를 감지해 컷을 맞출 수 있으며, **탭으로 동기화**에서 각 줄이 시작될 때 Space를 눌러 직접 타이밍을 지정할 수도 있습니다.
3. **자동으로 만들기**(또는 R)를 눌러 스타일, 분위기, 움직임, 배색, 구성을 랜덤으로 만듭니다. **이전 / 다음**으로 버전을 오가거나 **이 부분만 변경**으로 일부만 다시 만들 수 있습니다.
4. 화면비, 해상도, 프레임레이트를 선택하고 MP4로 내보냅니다. 고급 모드에서는 PNG 시퀀스, 투명 PNG, 합성용 배경, 개별 기법 설정도 사용할 수 있습니다.

<details>
<summary><h3>한글 가사</h3></summary>

가사 입력란 아래의 **가사 언어**는 기본값이 **자동 감지**입니다. 한글이 포함된 가사는 자동으로 한국어로 감지되며, 각 스타일의 일본어 글꼴은 비슷한 인상의 한국어 글꼴로 바뀝니다.

예를 들어 Noto Sans JP 계열은 Noto Sans KR, Noto Serif JP 계열은 Noto Serif KR로 대응하고, Dela Gothic One은 Black Han Sans, 둥근 글꼴은 Jua, 손글씨 계열은 Gowun Batang 또는 Nanum Brush Script 등으로 대응합니다. 필요한 글꼴은 Google Fonts에서 현재 구성에 필요한 것만 불러옵니다.

가사 표기법:

- 새벽의 색을/기억하고 있어 — / 위치에서 컷 분할
- *투명* — 강조
- 줄 끝의 ! — 플래시와 흔들림
- 가사|메모 — 주석용 작은 글자
- [01:23.45]가사 — LRC 타임스탬프
- # 주석 — 무시되는 줄

</details>

</details>

<details>
<summary><h2>개인정보와 출력물</h2></summary>

가사와 음원은 브라우저 안에서 처리되며 서버로 전송되지 않습니다. 필요한 Google Fonts만 외부에서 불러옵니다.

이 도구로 만든 동영상과 이미지의 권리는 제작자에게 있으며, 사용한 가사와 음원의 권리는 각각의 권리자에게 있습니다. JIZURA 자체는 MIT License로 공개되어 있습니다. 자세한 내용은 [LICENSE](LICENSE)와 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인해 주세요.

</details>

<details>
<summary><h2>빌드</h2></summary>

저장소 루트에서 python3 build.py 를 실행합니다.

index.html, en/index.html, ko/index.html이 생성됩니다. 세 파일은 GitHub Pages에서 각각 일본어, 영어, 한국어판으로 사용할 수 있는 단일 HTML 파일입니다.

한국어판은 브라우저 UI 번역만 추가합니다. After Effects 패널의 프로젝트 JSON 형식은 기존과 동일하며, 가사의 한국어 감지와 한국어 글꼴 매핑은 기존 엔진을 그대로 사용합니다.

</details>
