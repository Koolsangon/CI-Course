# DynamoDB 설정 가이드

이 문서는 `cost-sim-v2.1` 의 DynamoDB 테이블 생성, IAM 정책 설정,
Amplify 환경변수 구성 방법을 설명합니다.

---

## 1. 사전 준비

```bash
# AWS CLI 설치 확인
aws --version

# 자격증명 확인
aws sts get-caller-identity
```

> **리전**: 기본 `ap-northeast-2` (서울). 아래 명령어에서 `--region` 값을 환경에 맞게 변경하세요.

---

## 2. DynamoDB 테이블 생성

### 2-1. AWS CLI 명령어

```bash
# 환경변수 설정 (편의용)
export AWS_REGION=ap-northeast-2
export TABLE_NAME=cost-sim-rooms

# 테이블 생성
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION"
```

> **`PAY_PER_REQUEST`** (온디맨드) 모드를 사용하므로 트래픽이 없으면 비용이 발생하지 않습니다.

### 2-2. 생성 확인

```bash
aws dynamodb describe-table \
  --table-name cost-sim-rooms \
  --region ap-northeast-2 \
  --query "Table.TableStatus"
# "ACTIVE" 가 출력되면 정상
```

### 2-3. 테이블 스키마 구조

| PK | SK | 내용 |
|---|---|---|
| `ROOM#{code}` | `META` | RoomMeta (방 설정) |
| `ROOM#{code}` | `PLAYER#{id}` | 플레이어 정보 |
| `ROOM#{code}` | `ROUND#{N:3pad}` | 라운드 데이터 |
| `ROOM#{code}` | `ROUND#{N:3pad}#PLAYER#{id}` | 제출 결과 |

---

## 3. IAM 정책 — Amplify SSR Lambda 역할에 부여

Amplify는 SSR Next.js Lambda를 실행할 때 자동 생성된 IAM 역할을 사용합니다.
그 역할에 아래 정책을 추가해야 DynamoDB에 접근할 수 있습니다.

### 3-1. 정책 JSON

```json
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
        "arn:aws:dynamodb:ap-northeast-2:YOUR_ACCOUNT_ID:table/cost-sim-rooms"
      ]
    }
  ]
}
```

> `YOUR_ACCOUNT_ID` 를 실제 AWS 계정 ID로 교체하세요 (`aws sts get-caller-identity --query Account`).

### 3-2. Amplify Lambda 역할 이름 확인

Amplify 콘솔 → 해당 앱 → **Hosting** → **Compute role** 에서 역할 이름 확인.
또는 AWS CLI:

```bash
# Amplify 앱 ID 확인
aws amplify list-apps --region ap-northeast-2 --query "apps[*].[appId,name]"

# 역할 이름은 보통: amplifyconsole-backend-role 또는 AmplifySSRLoggingRole-...
# IAM 콘솔에서 "amplify" 검색
```

### 3-3. 정책 추가 (AWS CLI)

```bash
# 정책 파일 저장
cat > /tmp/dynamodb-policy.json << 'EOF'
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
        "arn:aws:dynamodb:ap-northeast-2:YOUR_ACCOUNT_ID:table/cost-sim-rooms"
      ]
    }
  ]
}
EOF

# 인라인 정책으로 역할에 추가
aws iam put-role-policy \
  --role-name YOUR_AMPLIFY_ROLE_NAME \
  --policy-name CostSimDynamoDBPolicy \
  --policy-document file:///tmp/dynamodb-policy.json
```

---

## 4. Amplify 환경변수 설정

Amplify 콘솔에서 다음 환경변수를 설정합니다.

### 4-1. 콘솔 경로

```
AWS Amplify → 앱 선택 → App settings → Environment variables → Manage variables
```

### 4-2. 설정할 변수

| 변수명 | 값 | 설명 |
|---|---|---|
| `DYNAMODB_TABLE_NAME` | `cost-sim-rooms` | DynamoDB 테이블 이름 |
| `AWS_REGION` | `ap-northeast-2` | 리전 (Lambda 실행 리전과 동일하게) |

> **주의**: Amplify SSR Lambda는 실행 리전의 IAM 역할 자격증명을 자동 사용합니다.
> `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` 를 **직접 입력하지 마세요**.

### 4-3. 변수 적용

환경변수 저장 후 **Save and deploy** (또는 다음 배포 시 자동 적용).

---

## 5. 동작 확인

### 5-1. 배포 후 방 생성 테스트

```bash
# 방 생성 (강사용 API)
curl -X POST https://YOUR_AMPLIFY_URL/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"settings": {"timeCapSec": 600, "teamCount": 5, "hintPenaltyEnabled": true, "announcementMode": "full"}}'
```

정상 응답 예시:
```json
{
  "code": "AB12",
  "adminToken": "...",
  "status": "waiting"
}
```

### 5-2. DynamoDB 콘솔에서 직접 확인

```
DynamoDB 콘솔 → Tables → cost-sim-rooms → Explore items
→ PK: ROOM#AB12, SK: META 아이템 확인
```

### 5-3. AWS CLI로 확인

```bash
aws dynamodb query \
  --table-name cost-sim-rooms \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk": {"S": "ROOM#AB12"}}' \
  --region ap-northeast-2
```

---

## 6. 로컬 개발 시 DynamoDB 비활성화

`DYNAMODB_TABLE_NAME` 환경변수를 설정하지 않으면 자동으로 in-memory 모드로 동작합니다.

```bash
# .env.local — DYNAMODB_TABLE_NAME 을 주석 처리하면 in-memory 사용
# DYNAMODB_TABLE_NAME=cost-sim-rooms
```

---

## 7. 비용 예상

| 항목 | 예상 |
|---|---|
| 쓰기 요청 (1 WCU/요청) | 월 100만 건 = $1.25 |
| 읽기 요청 (0.5 RCU/요청) | 월 100만 건 = $0.25 |
| 스토리지 | 25GB 무료 티어 |

**교육용 소규모 운영 기준 월 $1 미만** 예상.

---

## 8. 테이블 삭제 (정리 시)

```bash
aws dynamodb delete-table \
  --table-name cost-sim-rooms \
  --region ap-northeast-2
```
