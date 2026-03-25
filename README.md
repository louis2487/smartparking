# SmartParking (내 차 위치 저장)

주차장에서 **내 차의 위치(구역/번호/메모)**를 저장하고, 홈에서 바로 확인하며, 저장 기록(히스토리)을 볼 수 있는 Expo 앱입니다.

## 실행 방법

### 1) 백엔드(myapi) 실행

`myapi`는 FastAPI 기반이며 아래 API를 제공합니다.

- `GET /parking/location?device_id=...`
- `POST /parking/location`
- `GET /parking/location/history?device_id=...`
- `DELETE /parking/location?device_id=...`

일반적인 실행 예시:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) 프론트(smartparking) 실행

```bash
npm install
npx expo start
```

## API 주소 설정(EXPO_PUBLIC_API_BASE_URL)

기본값은 `http://localhost:8000` 입니다.

- **Android 에뮬레이터**: 앱에서 `localhost`를 자동으로 `10.0.2.2`로 치환합니다.
- **실제 휴대폰**: PC의 LAN IP로 지정해야 합니다. (예: `http://192.168.0.10:8000`)

설정은 `.env.example`를 참고해 `.env`를 만들면 됩니다.
