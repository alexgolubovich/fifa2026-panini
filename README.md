# FIFA 2026 Panini — моя коллекция

Статическое веб-приложение для трекинга стикеров.

## Локально

```bash
python3 -m http.server 8000
# открой http://localhost:8000/
```

## Два режима

- `index.html` — редактируемая версия. Состояние хранится в `localStorage` твоего браузера.
- `index.html?view=1` — режим просмотра. Загружает «зашитый» снимок из `view-state.js`,
  все клики и кнопки редактирования отключены. Эту ссылку можно публиковать.

## Деплой на GitHub Pages

```bash
cd app
git init
git add .
git commit -m "init FIFA 2026 Panini collection app"

# Создай пустой репо на github.com/new — например, fifa2026 (Public)
git branch -M main
git remote add origin https://github.com/<твой-юзер>/fifa2026.git
git push -u origin main
```

Затем:
1. Открой репо на github.com → **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / `/ (root)` → Save
4. Через 1-2 минуты будет доступно:
   - редактируемая (для себя): `https://<юзер>.github.io/fifa2026/`
   - публичная (для других): `https://<юзер>.github.io/fifa2026/?view=1`

## Обновление публичного снимка

Когда хочешь, чтобы публичный `?view=1` показывал свежее состояние:

1. Открой свою редактируемую версию (она же `localhost` или твоя приватная вкладка).
2. Кнопка **«Скачать .json»** → получишь файл `fifa2026-snapshot-YYYY-MM-DD.json`.
3. Открой `view-state.js`, замени значение `VIEW_STATE.collected` на `collected` из скачанного JSON
   и обнови `generatedAt` на дату из файла.
4. `git add view-state.js && git commit -m "update view snapshot" && git push`
5. Через минуту публичная ссылка обновится.

## Структура

```
app/
├── index.html        # разметка
├── style.css         # стили
├── data.js           # структура альбома (980 + 12 Coca-Cola = 992)
├── app.js            # логика
├── view-state.js     # снимок для ?view=1
└── snapshots/        # бэкапы как файлы
```
