# Plano de testes de desempenho e responsividade do gráfico

## Matriz de telas e orientação
- **Desktop 1920×1080 / 1366×768**, **tablet 768×1024**, **smartphone 480×800**, **monitor 4K**.
- Exercitar **retrato e paisagem** validando que o contêiner do gráfico preenche a altura disponível sem gerar scroll inesperado (100dvh + min-height ativos).
- Alternar **cinema mode** e layouts padrões para verificar que o `ResizeObserver` mantém o canvas alinhado após mudanças de grade/flex.

## Mudanças de DPI e zoom
- Simular **zoom do navegador** (Ctrl/Cmd ±) e mover a janela entre monitores com DPIs distintos.
- Confirmar que a nitidez permanece estável e que o watcher de `devicePixelRatio` dispara um novo `resizeCanvases` (comparar `canvas.width/height` com o CSS via DevTools).

## Testes de colapso e min-height
- Forçar alturas extremas no contêiner do gráfico: `1px`, `100px`, `1000px`.
- Esperado: o contêiner respeita `min-height` (>=320px) e a escala Y continua funcional; nenhuma camada do canvas some.
- Validar também contêineres pais em grid/flex com `min-height: 0` para garantir ausência de overflow.

## Intervalo vertical e centralização
- Usar datasets com valores extremos/indicadores longos (MA/EMA/WMA/Bandas) e verificar que `calculateSmartPriceRange` considera overlays.
- Comparar a distância entre topo do gráfico e último fechamento vs. fundo: diferença <= 20% com zoom normal.
- Ativar debug: `window.HC_DEBUG_YRANGE = true` para desenhar guias de min/max/center.

## Performance e decimação
- Carregar datasets de **100**, **1.000** e **10.000** candles; medir render inicial e FPS durante pan/zoom.
- Registrar tempo médio de recálculo do range vertical usando `window.HC_PERF.rangeLastDuration` e `rangeSamples`.
- Comparar versões **com/sem decimação** e **com/sem OffscreenCanvas**:
  - Alternar com `window.HC_DISABLE_DECIMATION = true/false` e `window.HC_USE_OFFSCREEN_BUFFERS = true/false`, seguido de `resizeCanvases()`.
  - Usar `window.HC_TESTS.sampleFps()` para medir FPS e `measureRangePerformance()` para checar latência do y-range em diferentes tamanhos de dataset.

## APIs de apoio para testes
- `window.HC_TESTS.measureRangePerformance({ sizes, iterations, height })`: gera séries sintéticas (candles + overlays) e mede tempo médio/máximo do cálculo do range.
- `window.HC_TESTS.sampleFps(durationMs)`: coleta FPS e média de recálculo do range durante o período.
- `window.HC_TESTS.resizeForTest(width, height, minHeight)` / `restoreSize(snapshot)`: aplicar e reverter tamanhos extremos do contêiner.
- `window.HC_PERF`: expõe `fps`, `lastFrameDuration`, `rangeLastDuration`, `rangeSamples`, `rangeMaxDuration` para inspeção em runtime.

## Observações finais
- Repetir testes em iOS/Android garantindo que 100dvh elimina cortes/scroll fantasma.
- Nos cenários de falha, coletar capturas com `HC_DEBUG_YRANGE` ativo para comparar min/max/center entre ciclos de render.
