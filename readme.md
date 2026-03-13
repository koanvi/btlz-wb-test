# btlz-wb-test

## Что делает сервис

- Получает тарифы коробов из WB API
- Сохраняет актуальные данные в PostgreSQL
- Выгружает их в Google Sheets
- Работает как long-running процесс через scheduler

## Что нужно в `.env`

- `WB_API_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_IDS`
- `GOOGLE_SPREADSHEET_SHEET_NAME`
- `WB_TARIFFS_SYNC_CRON`
- `WB_TARIFFS_SYNC_RUN_ON_START`
- `GOOGLE_SHEETS_SYNC_CRON`
- `GOOGLE_SHEETS_SYNC_RUN_ON_START`

## Пример

```bash
GOOGLE_SPREADSHEET_IDS=id1,id2
GOOGLE_SPREADSHEET_SHEET_NAME=stocks_coefs
WB_TARIFFS_SYNC_CRON=0 * * * *
WB_TARIFFS_SYNC_RUN_ON_START=true
GOOGLE_SHEETS_SYNC_CRON=*/15 * * * *
GOOGLE_SHEETS_SYNC_RUN_ON_START=true
```

## Запуск

```bash
docker compose up
```

## Что происходит при старте

- поднимается PostgreSQL
- приложение ждёт готовности БД
- применяет миграции
- делает initial sync
- запускает scheduler

## Важно

- БД в Docker всегда стартует с:
- `POSTGRES_DB=postgres`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres`
- лист создаётся автоматически, если его нет
- повторная выгрузка не дублирует строки
