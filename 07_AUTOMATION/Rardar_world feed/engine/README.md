# Radar World Feed — Engine

Рабочий код Radar / World Feed Dance Content Engine.

Движок использует принцип BOS World Feed: реальные внешние источники → сбор → нормализация → классификация → оценка релевантности → сохранение.

Важно: это предметно-адаптированный движок Dance Content Engine, а не копия BOS Strategic Radar.

## Запуск

Из папки `engine`:

```cmd
node radar_engine.js
```

Или из папки `Rardar_world feed`:

```cmd
node engine/radar_engine.js
```

Результаты текущего запуска сохраняются в `runtime/latest.json`, история — в `runtime/history/`.

## Первый этап

В v1 используется rule-based классификация без обязательного подключения LLM. Это позволяет сначала проверить качество самого потока данных. AI-классификацию можно подключить позже, не меняя формат результата.
