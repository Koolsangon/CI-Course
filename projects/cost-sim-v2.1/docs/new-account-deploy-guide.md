# 신규 AWS 계정 배포 가이드 (한국어)

이 문서는 **처음으로 이 프로젝트를 본인 AWS 계정에 배포하는 분**을 위한
단계별 완전 가이드입니다.

---

## 목차

0. [AWS 계정 신규 생성 및 결제 정보 등록](#0-aws-계정-신규-생성-및-결제-정보-등록)
1. [사전 준비](#1-사전-준비)
2. [GitHub 저장소 포크 및 클론](#2-github-저장소-포크-및-클론)
3. [DynamoDB 테이블 생성](#3-dynamodb-테이블-생성)
4. [AWS Amplify 앱 생성](#4-aws-amplify-앱-생성)
5. [GitHub 연결 및 빌드 설정](#5-github-연결-및-빌드-설정)
6. [IAM 역할 설정 (DynamoDB 접근 권한)](#6-iam-역할-설정-dynamodb-접근-권한)
7. [환경변수 설정](#7-환경변수-설정)
8. [첫 배포 및 검증](#8-첫-배포-및-검증)
9. [자주 발생하는 문제 해결](#9-자주-발생하는-문제-해결)

---

## 0. AWS 계정 신규 생성 및 결제 정보 등록

> ⚠️ 이 프로젝트의 AWS 비용은 **인계받는 분 본인의 계정과 결제 수단**으로 운영합니다.
> 반드시 본인 이메일과 본인 결제 카드로 계정을 생성하세요.

### 0-1. AWS 계정 생성

1. [https://aws.amazon.com/ko/](https://aws.amazon.com/ko/) 접속 → **무료로 시작하기** 클릭
2. **이메일 주소**: 인계받는 분 본인 업무 이메일 입력
3. **계정 이름**: 예) `hanwhaocean-hrd` 또는 본인 이름 등 식별 가능한 이름
4. 이메일 인증 코드 입력
5. **비밀번호** 설정 (복잡한 비밀번호 권장)

### 0-2. 연락처 정보 입력

- 계정 유형: **개인** 또는 **전문가** (법인 카드 사용 시 **비즈니스** 선택)
- 성명, 전화번호, 주소 입력 (본인 또는 소속 부서 정보)

### 0-3. 결제 정보 (신용카드) 등록

> 💳 **인계받는 분 본인의 카드**를 등록합니다. (이전 운영자 카드 사용 금지)

- 카드 번호, 만료일, 카드 소유자 이름 입력
- 주소 입력 후 **Verify and Continue** 클릭
- AWS에서 1달러 미만 소액 인증이 진행됩니다 (자동 취소됨)

### 0-4. 전화 인증

- 전화번호 입력 → SMS 또는 음성 통화로 인증 코드 수신 → 입력

### 0-5. 지원 플랜 선택

- **Basic support (무료)** 선택 → **Complete sign up** 클릭

### 0-6. 계정 활성화 확인

- 가입 완료 이메일 수신 (수 분 소요)
- [https://console.aws.amazon.com](https://console.aws.amazon.com) 접속 → 로그인 확인
- 우측 상단 리전을 **아시아 태평양 (서울) ap-northeast-2** 로 변경

### 0-7. 루트 계정 MFA 설정 (강력 권장)

```
AWS 콘솔 → 우측 상단 계정명 클릭 → Security credentials
→ Multi-factor authentication (MFA) → Assign MFA device
→ Authenticator app 선택 → QR코드 스캔 (Google Authenticator 등)
```

---

## 1. 사전 준비

### 필수 항목

| 항목 | 버전/조건 | 확인 방법 |
|---|---|---|
| AWS 계정 | 0단계에서 생성 완료 | console.aws.amazon.com |
| GitHub 계정 | 없으면 github.com 가입 | — |
| Node.js | 20.x 이상 | `node -v` |
| AWS CLI | 2.x 이상 | `aws --version` |
| Git | 2.x 이상 | `git --version` |

### AWS CLI 초기 설정

```bash
# AWS CLI 자격증명 설정 (아래 1-1에서 생성한 IAM 사용자 키 사용)
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region name: ap-northeast-2
# Default output format: json

# 설정 확인
aws sts get-caller-identity
```

### IAM 사용자 생성 방법

```
AWS 콘솔 → IAM → Users → Create user
→ 사용자 이름: 예) ci-course-admin
→ Permissions: AdministratorAccess 연결
→ Access Key 생성 → CSV 다운로드 (안전한 곳에 보관)
```

> ⚠️ Access Key CSV 파일은 절대 Git에 커밋하지 마세요.
> `.gitignore`에 `*_accessKeys.csv` 가 이미 등록되어 있습니다.

---

## 2. GitHub 저장소 포크 및 클론

> 이 프로젝트는 **Fork** 방식으로 인수인계합니다.
> 원본 레포(`Koolsangon/CI-Course`)는 그대로 유지되고,
> 인계받는 분의 GitHub 계정에 독립적인 복사본이 생성됩니다.

### 2-1. GitHub 계정 준비

인계받는 분 전용 GitHub 계정이 없다면 새로 생성합니다:
1. [https://github.com](https://github.com) → **Sign up**
2. 업무용 이메일로 가입
3. 계정 이름 예) `hanwhaocean-hrd` 또는 본인 이름

### 2-2. 포크 (Fork)

1. 브라우저에서 [https://github.com/Koolsangon/CI-Course](https://github.com/Koolsangon/CI-Course) 접속
2. 우측 상단 **Fork** 버튼 클릭
3. Owner: **인계받는 분 계정** 선택 → **Create fork** 클릭
4. 포크된 레포 URL: `https://github.com/[인계받는분계정]/CI-Course`

> ✅ 이후 인계받는 분이 포크 레포에 push하면 Amplify가 자동으로 감지하여 배포합니다.

### 2-3. 로컬 클론

```bash
git clone https://github.com/[인계받는분계정]/CI-Course.git
cd CI-Course
```

### 2-4. 로컬 실행 확인 (선택사항)

```bash
cd projects/cost-sim-v2.1
npm install
npm run dev
# http://localhost:3000 접속 확인
```

---

## 3. DynamoDB 테이블 생성

### 3-1. 테이블 생성

```bash
export AWS_REGION=ap-northeast-2

aws dynamodb create-table \
  --table-name cost-sim-rooms \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"
```

### 3-2. 생성 확인

```bash
aws dynamodb describe-table \
  --table-name cost-sim-rooms \
  --region ap-northeast-2 \
  --query "Table.TableStatus"
# "ACTIVE" 출력 확인
```

> ✅ 테이블 ARN 을 메모해 두세요. IAM 정책 작성 시 필요합니다.
> ```bash
> aws dynamodb describe-table \
>   --table-name cost-sim-rooms \
>   --region ap-northeast-2 \
>   --query "Table.TableArn"
> ```

---

## 4. AWS Amplify 앱 생성

### 4-1. Amplify 콘솔 접속

1. [AWS Amplify 콘솔](https://console.aws.amazon.com/amplify/) 접속
2. 리전을 **아시아 태평양 (서울) ap-northeast-2** 로 변경
3. **Create new app** 클릭

### 4-2. 배포 방식 선택

- **GitHub** 선택 → **Next**

> 처음 연결 시 GitHub OAuth 인증 페이지가 열립니다. 허용 클릭.

### 4-3. 저장소 선택

- **Repository**: `[인계받는분계정]/CI-Course` 선택
- **Branch**: `master`
- **Next**

---

## 5. GitHub 연결 및 빌드 설정

### 5-1. 앱 설정 (App settings)

| 설정 항목 | 값 |
|---|---|
| App name | `cost-sim-v2` (자유롭게) |
| **Platform** | **`WEB_COMPUTE`** ← 반드시 선택 |

> ⚠️ **Platform 이 `WEB` 이면 SSR(서버 렌더링)이 동작하지 않습니다.**
> API Routes(/api/...)가 필요하므로 반드시 **`WEB_COMPUTE`** 를 선택하세요.

### 5-2. amplify.yml 빌드 설정

레포 루트에 `amplify.yml` 이 이미 포함되어 있어 자동 감지됩니다.
Amplify가 자동 감지에 실패하면 **Edit** 클릭 후 아래 내용을 직접 입력하세요.

```yaml
version: 1
applications:
  - appRoot: projects/cost-sim-v2.1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - "**/*"
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
```

> **appRoot**: 모노레포 구조에서 실제 Next.js 앱 경로를 지정합니다.
> **baseDirectory**: Next.js 빌드 산출물 디렉토리 `.next`

### 5-3. 설정 저장 및 다음 단계

- **Save and deploy** 클릭 (아직 배포는 실패해도 괜찮음 — 환경변수 미설정 상태)

---

## 6. IAM 역할 설정 (DynamoDB 접근 권한)

Amplify SSR Lambda가 DynamoDB에 접근하려면 실행 역할에 권한을 추가해야 합니다.

### 6-1. Amplify 서비스 역할 확인

```
Amplify 콘솔 → 해당 앱 → App settings → General settings
→ "Service role" 항목 확인
```

서비스 역할이 없으면 **Create and use a new service role** 클릭.

### 6-2. Amplify Backend 역할 찾기 (SSR Lambda 전용)

SSR Lambda는 별도 **compute role** 을 사용합니다. 콘솔 경로:

```
Amplify 콘솔 → 앱 → Hosting → Compute settings
→ "Compute role" 확인 또는 생성
```

> 역할이 없으면 IAM 콘솔에서 다음과 같이 생성합니다:
>
> ```
> IAM → Roles → Create role
> → Trusted entity: AWS service → Lambda
> → Next → (정책은 일단 건너뜀) → Role name: AmplifySSRLambdaRole
> → Create role
> ```

### 6-3. DynamoDB 접근 정책 추가

```bash
# 계정 ID 확인
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ROLE_NAME=AmplifySSRLambdaRole  # 실제 역할 이름으로 교체

# 정책 JSON 파일 생성
cat > /tmp/dynamodb-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostSimDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-2:${ACCOUNT_ID}:table/cost-sim-rooms"
      ]
    }
  ]
}
EOF

# 역할에 인라인 정책 추가
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name CostSimDynamoDBPolicy \
  --policy-document file:///tmp/dynamodb-policy.json
```

### 6-4. Amplify에 Compute Role 연결

```
Amplify 콘솔 → 앱 → Hosting → Compute settings
→ Compute role: AmplifySSRLambdaRole 선택 → Save
```

---

## 7. 환경변수 설정

### 7-1. Amplify 콘솔에서 설정

```
Amplify 콘솔 → 앱 선택 → App settings → Environment variables
→ Manage variables → Add variable
```

| 변수명 | 값 | 비고 |
|---|---|---|
| `DYNAMODB_TABLE_NAME` | `cost-sim-rooms` | DynamoDB 테이블 이름 |
| `AWS_REGION` | `ap-northeast-2` | 서울 리전 |

> ⚠️ AWS 자격증명(`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)은 **절대 입력하지 마세요**.
> Amplify Lambda는 IAM 역할 자격증명을 자동으로 사용합니다.

### 7-2. 변수 적용 범위

- Branch: `master` (또는 모든 브랜치)
- 저장 후 **다음 배포 시 자동 적용**

---

## 8. 첫 배포 및 검증

### 8-1. 배포 트리거

환경변수 저장 후:

```
Amplify 콘솔 → 앱 → Hosting → Deployments
→ Redeploy this version (또는 GitHub push로 자동 트리거)
```

또는 GitHub에 코드 push:

```bash
git add .
git commit -m "deploy: add dynamodb config"
git push origin master
```

### 8-2. 빌드 로그 모니터링

```
Amplify 콘솔 → Deployments → 최신 배포 클릭
→ Build logs 탭에서 실시간 확인
```

정상 완료 시:
```
✓ Provisioning
✓ Build
✓ Deploy
✓ Verify
```

### 8-3. 배포 URL 확인

```
Amplify 콘솔 → 앱 → Hosting
→ 도메인 예: https://master.abcdefg1234567.amplifyapp.com
```

### 8-4. API 동작 확인

```bash
export BASE_URL=https://master.abcdefg1234567.amplifyapp.com

# 방 생성 테스트
curl -X POST "$BASE_URL/api/rooms" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "timeCapSec": 600,
      "teamCount": 5,
      "hintPenaltyEnabled": true,
      "announcementMode": "full"
    }
  }'
```

정상 응답:
```json
{
  "code": "AB12",
  "adminToken": "tok_xxxxxxxx",
  "status": "waiting",
  "settings": { ... }
}
```

### 8-5. DynamoDB 콘솔에서 데이터 확인

```
DynamoDB 콘솔 → Tables → cost-sim-rooms → Explore items
→ Scan → Run
→ PK=ROOM#AB12, SK=META 아이템 확인
```

---

## 9. 자주 발생하는 문제 해결

### ❌ 문제 1: 빌드 실패 — "Cannot find module"

**증상**: 빌드 로그에 `Cannot find module '@aws-sdk/...'` 오류

**원인**: AWS SDK 패키지 미설치

**해결**:
```bash
cd projects/cost-sim-v2.1
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
git add package.json package-lock.json
git commit -m "chore: add aws sdk dependencies"
git push
```

---

### ❌ 문제 2: 빌드 실패 — appRoot 경로 오류

**증상**: `No such file or directory: projects/cost-sim-v2.1`

**원인**: `amplify.yml` 의 `appRoot` 경로가 잘못됨

**해결**: 저장소 루트에서 경로 확인:
```bash
ls projects/cost-sim-v2.1/package.json  # 이 파일이 있어야 함
```
`amplify.yml` 의 `appRoot` 를 실제 경로에 맞게 수정.

---

### ❌ 문제 3: API 500 오류 — DynamoDB 접근 거부

**증상**: `/api/rooms` 호출 시 500 오류, CloudWatch 로그에 `AccessDeniedException`

**원인**: Amplify Lambda 역할에 DynamoDB 권한 없음

**해결**:
1. [6. IAM 역할 설정](#6-iam-역할-설정-dynamodb-접근-권한) 단계 재확인
2. Compute role이 Amplify 앱에 연결되어 있는지 확인
3. 정책의 리전과 계정 ID가 올바른지 확인

CloudWatch 로그 확인:
```
CloudWatch 콘솔 → Log groups
→ /aws/amplify/... 또는 /aws/lambda/... 검색
```

---

### ❌ 문제 4: `Platform` 이 WEB으로 설정됨 (API 404)

**증상**: `/api/rooms` 가 404 반환

**원인**: Amplify Platform이 `WEB` (정적 호스팅)으로 설정됨. SSR/API Routes 미동작.

**해결**:
```
Amplify 콘솔 → 앱 → App settings → General
→ Platform: WEB_COMPUTE 로 변경 → Save
→ 재배포
```

---

### ❌ 문제 5: 환경변수 미반영

**증상**: DynamoDB가 아닌 in-memory로 동작 (재시작마다 데이터 초기화)

**원인**: `DYNAMODB_TABLE_NAME` 환경변수 미설정 또는 배포 전 설정

**해결**:
1. Amplify → Environment variables 에서 변수 확인
2. 변수 저장 후 반드시 **재배포** 필요
3. Lambda 함수 로그에서 환경변수 확인:
   ```
   CloudWatch → Log groups → Lambda 함수 로그
   → 'DYNAMODB_TABLE_NAME' 키워드 검색
   ```

---

### ❌ 문제 6: CORS 오류

**증상**: 브라우저 콘솔에 `CORS policy` 오류

**원인**: Next.js API Route에 CORS 헤더 미설정 (다른 도메인에서 API 호출 시)

**해결**: `next.config.ts` 또는 API Route에 CORS 헤더 추가.
(같은 도메인에서 호출하는 경우 일반적으로 발생하지 않음)

---

### ❌ 문제 7: DynamoDB 테이블 리전 불일치

**증상**: `ResourceNotFoundException: Requested resource not found`

**원인**: 앱 실행 리전과 DynamoDB 테이블 리전이 다름

**해결**:
- Amplify 앱과 DynamoDB 테이블을 **동일 리전**에 생성
- `AWS_REGION` 환경변수를 테이블이 있는 리전으로 설정

---

## 부록: 전체 체크리스트

배포 완료 전 확인 항목:

- [ ] **AWS 계정 생성** — 인계받는 분 이메일 + 본인 결제 카드 등록
- [ ] **루트 계정 MFA** 설정 완료
- [ ] **IAM 사용자** 생성 (`ci-course-admin`) + Access Key CSV 안전 보관
- [ ] GitHub 저장소 포크 완료 (`[인계받는분계정]/CI-Course`)
- [ ] 로컬 클론 + `npm run dev` 동작 확인
- [ ] DynamoDB 테이블 `cost-sim-rooms` 생성 (`ACTIVE` 상태)
- [ ] Amplify 앱 생성 (Platform: `WEB_COMPUTE`)
- [ ] `amplify.yml` 에 `appRoot: projects/cost-sim-v2.1` 설정 확인
- [ ] IAM 역할에 DynamoDB 정책 추가
- [ ] Amplify Compute role 연결
- [ ] 환경변수 `DYNAMODB_TABLE_NAME`, `AWS_REGION` 설정
- [ ] 배포 성공 (`✓ Verify` 확인)
- [ ] `/api/rooms` POST 테스트 성공
- [ ] DynamoDB 콘솔에서 데이터 확인
- [ ] 새 라이브 URL 공유 (강의 운영팀에 전달)
