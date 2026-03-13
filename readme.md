# btlz-wb-test

## Что делает сервис

- Получает тарифы коробов из WB API
- Сохраняет актуальный срез в PostgreSQL
- Выгружает данные в одну или несколько Google Sheets
- Работает как long-running процесс через scheduler

## Как работает

- При старте применяются миграции
- Затем запускаются фоновые задачи
- Задача `wb-tariffs-sync`
  - получает тарифы WB
  - обновляет данные за текущую дату в БД
- Задача `google-sheets-sync`
  - читает актуальные данные из БД
  - проверяет наличие листа
  - очищает лист
  - записывает данные целиком заново

## Стек

- Node.js
- TypeScript
- PostgreSQL
- Knex
- Google Sheets API
- Docker Compose

## Обязательные env

- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `WB_API_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_IDS`
- `GOOGLE_SPREADSHEET_SHEET_NAME`
- `WB_TARIFFS_SYNC_CRON`
- `WB_TARIFFS_SYNC_RUN_ON_START`
- `GOOGLE_SHEETS_SYNC_CRON`
- `GOOGLE_SHEETS_SYNC_RUN_ON_START`

## Пример расписания

- загрузка тарифов раз в час
```bash
WB_TARIFFS_SYNC_CRON=0 * * * *
```

- выгрузка в таблицы каждые 15 минут
```bash
GOOGLE_SHEETS_SYNC_CRON=*/15 * * * *
```

- запускать обе задачи сразу после старта
```bash
WB_TARIFFS_SYNC_RUN_ON_START=true
GOOGLE_SHEETS_SYNC_RUN_ON_START=true
```

## Подготовка Google Sheets

- Создай одну или несколько Google таблиц
- Открой доступ service account на редактирование
- Укажи все `spreadsheetId` через запятую

```bash
GOOGLE_SPREADSHEET_IDS=id1,id2
GOOGLE_SPREADSHEET_SHEET_NAME=stocks_coefs
```

## Запуск через Docker

- поднять сервисы
```bash
docker compose up --build
```

- остановить сервисы
```bash
docker compose down
```

## Локальный запуск

- собрать проект
```bash
npm run build
```

- применить миграции
```bash
env NODE_ENV=production POSTGRES_HOST=localhost node dist/utils/knex.js migrate latest
```

- запустить приложение
```bash
env NODE_ENV=production POSTGRES_HOST=localhost node dist/app.js
```

## Полезные команды

- проверить типизацию
```bash
npm run tsc:check
```

- собрать проект
```bash
npm run build
```

## Формат выгрузки

- Лист берется из `GOOGLE_SPREADSHEET_SHEET_NAME`
- Если листа нет, он создается автоматически
- Данные сортируются по:
- `box_delivery_coef_expr asc nulls last`
- `warehouse_name asc`

## Идемпотентность

- Повторный запрос WB за ту же дату не создает дубли в БД
- Повторная выгрузка в Google Sheets не удваивает строки
- Лист очищается и перезаписывается целиком
