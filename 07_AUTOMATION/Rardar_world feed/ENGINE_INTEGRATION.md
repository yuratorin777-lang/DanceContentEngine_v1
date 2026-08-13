# Radar / World Feed Engine v1.1

Это обновление классификатора существующего движка Radar / World Feed.

## Что изменилось

- движок сбора не переписывался;
- добавлен профиль предметной области `RADAR_PROFILE_DANCE_SERPUKHOV.md`;
- классификация переведена с простого keyword scoring на relationship scoring;
- добавлены уровни `HIGH / MEDIUM / LOW`;
- смежные темы сохраняются только при связи с активностью, детьми, обучением или танцами;
- World Feed сохраняет международные танцевальные события отдельно;
- широкий сбор сохраняется: Radar не обязан отбрасывать материал только потому, что он не HIGH.

## Запуск

Из `Rardar_world feed`:

```cmd
node engine\radar_engine.js
```

Результат:

```text
runtime\latest.json
```

История:

```text
runtime\history\
```
