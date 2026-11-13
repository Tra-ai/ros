# ROS Revival Backend — Vercel Starter (v1.1)

នេះជា Backend API ដំបូងសម្រាប់ ROS Revival ថ្មី។ វាមិនមែនជា Server របស់ NetEase និងមិនអាចភ្ជាប់ APK ROS ដើមដោយផ្ទាល់បានទេ។

## អ្វីដែលមាន
| Endpoint | មុខងារ | Auth |
|---|---|---|
| `GET /api/health` | ពិនិត្យ API | — |
| `POST /api/auth/register` | ចុះឈ្មោះ | — |
| `POST /api/auth/login` | ចូលគណនី | — |
| `GET /api/players/me` | Profile | Bearer |
| `GET /api/leaderboard` | Top 50 តាម rank_points | — |
| `GET /api/matches` | បញ្ជី match ដែលកំពុងរង់ចាំ (មាន `player_count`) | — |
| `POST /api/matches` | បង្កើត match (host ចូលដោយស្វ័យប្រវត្តិ) | Bearer |
| `GET /api/matches/:id` | ព័ត៌មាន match + បញ្ជីអ្នកលេង | — |
| `POST /api/matches/:id/join` | ចូល match | Bearer |
| `POST /api/matches/:id/leave` | ចាកចេញពី match | Bearer |

## អ្វីដែលបានកែ (v1.1)
- Token ខុស/ផុតកំណត់ ឥឡូវបាន `401` (ពីមុនបាន `500`)។
- Register: ដោះស្រាយ race condition (ចុះឈ្មោះស្ទួនព្រមគ្នា) ហើយ DB ការពារ email/username ស្ទួនមិនប្រកាន់អក្សរធំ/តូច។
- Login: ដាក់ rate limit (តាម IP និងតាម email) និងការពារការទាយថា email មាន ឬអត់ (timing)។
- Rate limit ក្នុង Postgres (ដំណើរការលើ Vercel ច្រើន instance)។
- Match: validate `mapName`, កំណត់ host ឲ្យមាន match រង់ចាំអតិបរមា 3, ចូល/ចាកចេញ ដោយ lock ការពារ match ពេញលើស។
- CORS ជម្រើស (`ALLOWED_ORIGIN`), security headers, `.gitignore`, `lib/db.js` មិន crash ពេលមិនមាន `DATABASE_URL`។

## Deploy
1. Neon PostgreSQL → ចូល SQL Editor ហើយ run `database/schema.sql` **ឡើងវិញ** (run លើ database ចាស់បានដោយសុវត្ថិភាព)។
2. Push ទៅ GitHub ហើយ Import ក្នុង Vercel។
3. Vercel > Settings > Environment Variables: `DATABASE_URL`, `JWT_SECRET` (≥32 តួអក្សរ), និង `ALLOWED_ORIGIN` (បើចាំបាច់)។
4. Deploy ឡើងវិញ។

## Test
`GET https://YOUR-APP.vercel.app/api/health`

Register: `{"username":"player_one","email":"player@example.com","password":"change-this-password"}`
Login: `{"email":"player@example.com","password":"change-this-password"}`
Header: `Authorization: Bearer YOUR_TOKEN`
Create match: `{"mode":"squad","mapName":"island","maxPlayers":50}`

## ដែនកំណត់ដែលនៅសល់
- មិនទាន់មាន email verification, refresh token, reset password, admin roles, authoritative gameplay ឬ anti-cheat ទេ។
- Vercel Functions មិនមែនជា persistent WebSocket game server ទេ។ Multiplayer real-time ត្រូវការ game server ដាច់ដោយឡែក។
- `maxPlayers` គឺជា config ប៉ុណ្ណោះ មិនធានាថា server ទ្រទ្រង់បានទេ។
- កុំដាក់ `.env` ឬ Secret ក្នុង GitHub។
