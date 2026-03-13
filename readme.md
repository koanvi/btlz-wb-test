# btlz-wb-test

## Что делает сервис

- Получает тарифы коробов из WB API
- Сохраняет актуальный срез в PostgreSQL
- Выгружает данные в одну или несколько Google Sheets
- Работает как long-running процесс через scheduler

## Какую задачу решает

- Автоматизирует регулярный сбор тарифов WB
- Хранит актуальные данные в БД
- Поддерживает повторяемую выгрузку в Google Sheets без дублей

## Какие процессы запускаются

- `initial wb tariffs sync`
- `initial google sheets sync`
- `scheduler job`
  `wb-tariffs-sync`
- `scheduler job`
  `google-sheets-sync`

## Какие таблицы создаются в БД

- `warehouses`
  справочник складов WB
- `tariff_box_snapshots`
  дневные снимки тарифов
- `tariff_box_warehouse_tariffs`
  тарифы по складам внутри снимка
- `spreadsheets`
  список целевых Google-таблиц
- `job_runs`
  история выполнения фоновых задач

## Какие переменные окружения нужны

- `WB_API_TOKEN`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_IDS`
- `GOOGLE_SPREADSHEET_SHEET_NAME`
- `WB_TARIFFS_SYNC_CRON`
- `WB_TARIFFS_SYNC_RUN_ON_START`
- `GOOGLE_SHEETS_SYNC_CRON`
- `GOOGLE_SHEETS_SYNC_RUN_ON_START`

## Обязательные настройки БД в Docker

- `POSTGRES_DB=postgres`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=postgres`

## Пример `.env`

```bash
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

WB_API_TOKEN=your-wb-token

GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_IDS=id1,id2
GOOGLE_SPREADSHEET_SHEET_NAME=stocks_coefs

WB_TARIFFS_SYNC_CRON=0 * * * *
WB_TARIFFS_SYNC_RUN_ON_START=true
GOOGLE_SHEETS_SYNC_CRON=*/15 * * * *
GOOGLE_SHEETS_SYNC_RUN_ON_START=true
```

## Как подготовить Google service account

- Создать service account в Google Cloud
- Включить `Google Sheets API`
- Скачать JSON-ключ service account
- Взять из него:
  `client_email`
- Взять из него:
  `private_key`
- Перенести эти значения в `.env`

## Как расшарить тестовые Google-таблицы

- Открыть нужную Google-таблицу
- Нажать `Поделиться`
- Добавить `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- Выдать роль `Редактор`
- Повторить для всех таблиц из `GOOGLE_SPREADSHEET_IDS`

## Как запустить проект

- запуск проекта
```bash
docker compose up
```

- запуск с пересборкой
```bash
docker compose up --build
```

- остановка проекта
```bash
docker compose down
```

## Что происходит при старте

- Поднимается PostgreSQL
- Приложение ждёт готовности БД
- Применяются migrations
- Выполняется initial sync тарифов WB
- Выполняется initial sync в Google Sheets
- Запускается scheduler

## Как проверить, что всё работает

- посмотреть состояние контейнеров
```bash
docker compose ps
```

- посмотреть логи приложения
```bash
docker compose logs -f app
```

- в логах должны быть этапы:
  `Database connection initialized`
- в логах должны быть этапы:
  `Migrations completed`
- в логах должны быть этапы:
  `Initial WB tariffs sync completed`
- в логах должны быть этапы:
  `Initial Google Sheets sync completed`
- в логах должны быть этапы:
  `Scheduler started`

## Как проверить данные в БД

- открыть psql в контейнере postgres
```bash
docker compose exec postgres psql -U postgres -d postgres
```

- посмотреть таблицы
```sql
\dt
```

- проверить снимки тарифов
```sql
select id, tariff_date, last_fetched_at
from tariff_box_snapshots
order by id desc;
```

- проверить строки тарифов
```sql
select count(*) from tariff_box_warehouse_tariffs;
```

- проверить историю джоб
```sql
select job_name, status, started_at, finished_at
from job_runs
order by id desc
limit 20;
```

## Как проверить выгрузку в Google Sheets

- Открыть таблицы из `GOOGLE_SPREADSHEET_IDS`
- Проверить наличие листа `GOOGLE_SPREADSHEET_SHEET_NAME`
- Проверить наличие заголовков в первой строке
- Проверить наличие данных ниже заголовков
- Повторно запустить sync и убедиться, что строки не удваиваются

- повторный запуск проекта
```bash
docker compose restart app
```

## Важные свойства решения

- Приложение не поднимает HTTP-сервер
- Long-running процессом является scheduler
- Повторный sync WB за тот же день не создаёт дубли в БД
- Повторная выгрузка в Google Sheets не удваивает строки
- Лист очищается и перезаписывается целиком
