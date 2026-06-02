# 🎨 YOLO Annotation Tool: Design System (M3 Based)

## 1. 디자인 원칙 (Design Principles)

- **Focus First:** 작업 영역(이미지 캔버스)의 시각적 노이즈를 최소화합니다.
- **Efficient Interaction:** 마우스 이동 경로를 최적화하여 3단 레이아웃 내에서 작업이 완결되도록 합니다.
- **Contextual Clarity:** 현재 상태(선택된 클래스, 박스 위치 등)를 즉각적으로 알 수 있는 고대비 피드백을 제공합니다.

## 2. 스타일 가이드 (Design Tokens)

### 2.1 컬러 팔레트 (Dark Mode: M3 Neutral/Primary)

작업자의 눈 피로도를 최소화하고, 바운딩 박스(Neon)의 대비를 극대화합니다.

- **Surface Container (BG):** `bg-neutral-900` (#121212)
- **Primary (Accent):** `bg-primary-500` (#6750A4)
- **High Contrast (BBox):** `border-lime-400` (#A3E635) / `border-pink-500` (#EC4899)
- **On Surface (Text):** `text-neutral-100`

### 2.2 타이포그래피 (Sans-serif: 'Inter' 또는 'Roboto')

- **Display Small (작업 모드/상태):** `text-2xl font-bold`
- **Label Medium (좌표값/리스트):** `text-sm font-medium tracking-wide`
- **Body Small (단축키 힌트):** `text-xs text-neutral-400`

### 2.3 UI 컴포넌트 스타일

- **Canvas Container:** `rounded-2xl border border-neutral-700 bg-neutral-950`
- **Buttons:** `rounded-full px-6 py-2 transition-all hover:bg-primary-100/10`
- **Input/Dropdown:** `rounded-lg bg-neutral-800 border-neutral-600 focus:ring-2 focus:ring-primary-500`

## 3. 3단 레이아웃 및 컴포넌트 목록

| **영역**           | **컴포넌트명**      | **역할**                                                     |
| ------------------ | ------------------- | ------------------------------------------------------------ |
| **좌측 (Sidebar)** | `FileList`          | 이미지 리스트 및 라벨링 완료 상태(체크 아이콘) 표시          |
| **중앙 (Canvas)**  | `InteractionCanvas` | 마우스 드래그 박스 툴, 정규화 좌표 실시간 피드백 오버레이    |
| **우측 (Panel)**   | `ClassController`   | 클래스 선택, 라벨 리스트 아이템(박스 수정/삭제), 단축키 가이드 |

## 4. 레이아웃 상세 전략

- **가로 구성:** `w-[240px]` (좌) | `flex-1` (중) | `w-[300px]` (우)
- **간격 (Spacing):** 컴포넌트 간 `gap-4` (1rem), 내부 패딩 `p-4` 유지
- **공간 설계:** 중앙 캔버스가 전체 작업 공간의 60% 이상을 점유하도록 배치하여 정밀 라벨링 보장.

## 5. 화면 디자인 예시 (3단 구성)

> **[Top Header]** 파일 경로 정보 / 현재 이미지 명 / 검증 모드 토글 스위치
>
> **[Main Body]**
>
> - **[Left]** 이미지 리스트 (스크롤 가능)
> - **[Center]** 이미지 표시 영역 (이미지 위 반투명 BBox 오버레이 / 마우스 커서 십자선 표시)
> - **[Right]** >     * 클래스 선택 메뉴 (Dropdown)
>   - 라벨 리스트 (박스 ID / 클래스 명 / 수정 아이콘)
>   - 단축키 가이드 하단 배치 (`[Enter] 저장` `[Ctrl+Z] 취소`)

## 6. 톤앤매너

- **전문적(Professional):** 감정적인 표현을 배제하고, 상태를 명확히 기술합니다. (e.g., '작업 시작' 대신 'Load Next Task')
- **절제됨(Minimalist):** 필요한 정보만 노출하고, 인터랙션이 발생할 때만 색상을 반전시켜 시각적 무게를 줄입니다.

### 개발자를 위한 디자인 시스템 활용 팁

- **Tailwind 활용:** 위 규격을 기반으로 `tailwind.config.js`에 `primary`, `neutral` 테마를 커스텀 컬러로 등록하세요.
- **Canvas 성능:** `framer-motion`을 사용하되, 라벨링 중인 박스 그리기 애니메이션은 `requestAnimationFrame`을 사용하여 60fps를 확보하는 것이 좋습니다.