# KT 정산검수툴

- 툴: https://woori-001.github.io/ktaudit/
- 워크라인 연동 설치: https://woori-001.github.io/ktaudit/workline.html

## 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 검수툴 본체 (단일 HTML). 규칙·맥락은 `인수인계_문서.md` 참고 |
| `workline-bookmarklet.js` | 워크라인 → 검수툴 북마클릿 원본 소스 |
| `workline.html` | 북마클릿 설치 페이지 (**빌드 결과물 — 직접 고치지 말 것**) |
| `tools/workline.template.html` | 설치 페이지 템플릿 |
| `tools/build-bookmarklet.sh` | `workline-bookmarklet.js` 수정 후 실행하면 `workline.html` 재생성 |

## 완료 상태 저장 (Supabase)

- 프로젝트 `woori-001's Project`, 테이블 `public.ktaudit_state`
  (`key_hash` PK, `done`, `handled int[]`, `note`, `updated_by`, `updated_at`)
- `key_hash` = SHA-256(`ktaudit:v1|` + 연락처숫자|고객명|협력점). 고객 정보 원문은 서버에 저장하지 않음
- 로그인 없음. publishable(anon) 키 + RLS 전체 허용 → 키를 아는 사람은 누구나 읽기/쓰기/삭제 가능
- 예전 `localStorage`(`ktv1_done`, `ktv1_hl`) 기록은 해당 고객이 들어있는 파일을 처음 열 때 서버로 1회 이전 후 로컬에서 삭제

## 배포

`main` 브랜치 루트를 GitHub Pages로 배포. 푸시하면 1~2분 뒤 반영.
