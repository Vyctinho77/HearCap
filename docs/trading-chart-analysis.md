# Análise do gráfico de candles e estrutura do canvas

## Visão geral atual
- O componente `HearCapCandles` encapsula o embed de candles em um `<iframe>`, monta a URL com os parâmetros de símbolo/timeframe e, quando em `tradingMode`, assume altura `100%` para preencher o contêiner pai, com fallback de 640px em outros contextos.【F:src/components/chart/HearCapCandles.tsx†L5-L104】
- O layout de trading organiza a área principal em grid, com a célula do gráfico composta por uma barra de ferramentas e um painel flex que deixa o contêiner `.chartCanvas` crescer (`flex: 1`) e herdar a altura disponível, no qual o `HearCapCandles` recebe classes `w-full h-full`.【F:src/components/trading/TradingLayout.tsx†L19-L171】【F:src/components/trading/TradingLayout.module.css†L71-L200】

## Arquitetura do canvas embutido
- O embed de trading constrói uma hierarquia de contêineres (`.app` → `.chart-blueprint` → `.chart-main` → `.chart-stage` → `.chart-canvas`) todos com `width`/`height` de 100% e `min-height: 0`, garantindo que os elementos flex possam encolher sem cortar o conteúdo.【F:public/candles/embed-trading.html†L1-L146】
- Dentro de `.chart-canvas` há quatro camadas de `<canvas>` empilhadas absolutamente (`chart`, `chart-overlay`, `drawing-layer`, `price-scale`) e uma `<div>` de tooltip, permitindo separar renderização base, overlays de interação, desenho e escala de preços sem interferência de z-index ou clipping.【F:public/candles/embed-trading.html†L125-L146】

## Estratégia de dimensionamento e responsividade do canvas
- O script principal registra um `ResizeObserver` no contêiner do canvas; em cada evento ele repassa as dimensões observadas para `resizeCanvases`, invalida caches de viewport e agenda novo render com `requestAnimationFrame`, além de recalibrar densidade de UI.【F:public/candles/src/main.js†L579-L630】
- A função `resizeCanvases` normaliza largura/altura para pelo menos 1px, ajusta estilos CSS e dimensões reais de todos os canvases considerando o `devicePixelRatio`, e sincroniza a escala do eixo de preços tanto no modo acoplado quanto separado.【F:public/candles/src/main.js†L1185-L1230】
- No `init`, as dimensões iniciais são lidas do `getBoundingClientRect` do contêiner (ou `clientWidth/clientHeight` como fallback), aplicadas a `resizeCanvases`, e o `ResizeObserver` é ativado; há também um listener global de `resize` que reaplica dimensionamento, invalida caches e atualiza densidade quando o `devicePixelRatio` muda ou em cinem mode.【F:public/candles/src/main.js†L4092-L4170】

## Pontos fortes atuais
- A pilha de camadas de canvas isolada por responsabilidades reduz rerenderizações desnecessárias (e.g., desenho vs. overlay) e facilita composições de interações avançadas.【F:public/candles/embed-trading.html†L125-L146】
- O pipeline de dimensionamento combina `ResizeObserver` com ajustes por `devicePixelRatio`, mantendo nitidez em monitores hi-DPI e evitando artefatos de blur em redimensionamentos rápidos.【F:public/candles/src/main.js†L579-L630】【F:public/candles/src/main.js†L1185-L1230】
- O layout de trading usa `min-height: 0` em contêineres de grid/flex para que o iframe herde altura integral sem overflow, mitigando cortes por restrições de flexbox.【F:src/components/trading/TradingLayout.module.css†L71-L200】

## Riscos e possíveis falhas futuras
- O wrapper do trading ocupa `height: 100vh`; em navegadores móveis com barras dinâmicas, `vh` pode exceder o viewport real, levando a cortes ou scroll não desejado no canvas/iframe.【F:src/components/trading/TradingLayout.module.css†L1-L18】
- O `ResizeObserver` só reage a mudanças de tamanho; variações de `devicePixelRatio` (zoom ou mudança de monitor) não disparam o observer. Hoje o recálculo do DPR ocorre apenas no handler de `window.resize`, que pode não ser emitido em alterações de escala sem resize, deixando o canvas com densidade defasada até a próxima alteração de tamanho explícita.【F:public/candles/src/main.js†L579-L630】【F:public/candles/src/main.js†L4092-L4111】
- Se o contêiner pai do iframe receber altura colapsada (por exemplo, layouts sem `min-height` ou sem definir a linha do grid), `resizeCanvases` aceitará dimensões mínimas de 1px, resultando em um canvas efetivamente invisível; o fallback de altura padrão existe apenas no componente React quando `tradingMode` é `false`.【F:src/components/chart/HearCapCandles.tsx†L5-L104】【F:public/candles/src/main.js†L1185-L1230】
- A hierarquia de quatro canvases absolutos compartilha o mesmo tamanho; qualquer divergência de DPI ou sincronização de `width/height` entre eles pode causar desalinhamento de overlays (por exemplo, se algum redimensionamento falhar em atualizar uma camada), já que não há verificação cruzada após `resizeCanvases`.【F:public/candles/embed-trading.html†L125-L146】【F:public/candles/src/main.js†L1185-L1230】

## Recomendações alinhadas a melhores práticas
1. Substituir `height: 100vh` por `min-height: 100dvh`/`height: 100dvh` com fallback, garantindo aderência ao viewport real em browsers móveis e reduzindo o risco de corte ou scroll inesperado.【F:src/components/trading/TradingLayout.module.css†L1-L18】
2. Adicionar listener de `matchMedia('(resolution: Xdppx)')` ou monitor de `devicePixelRatio` para reaplicar `resizeCanvases` mesmo quando o tamanho do contêiner não muda, mantendo nitidez em trocas de monitor ou zoom sem resize.【F:public/candles/src/main.js†L579-L630】【F:public/candles/src/main.js†L4092-L4111】
3. Definir um `min-height` contextual (por exemplo, `min-height: 320px`) na `.chartCanvas` ou fornecer prop de altura mínima no `HearCapCandles` quando `tradingMode` for `true`, evitando colapsos acidentais em layouts futuros que reutilizem o componente.【F:src/components/trading/TradingLayout.module.css†L86-L160】【F:src/components/chart/HearCapCandles.tsx†L79-L104】
4. Criar um watchdog de sincronização das camadas (verificando se `width/height` de todas as canvases coincidem após `resizeCanvases`) e logar divergências, prevenindo desalinhamentos silenciosos de overlays em caso de falha de atualização de uma camada específica.【F:public/candles/embed-trading.html†L125-L146】【F:public/candles/src/main.js†L1185-L1230】
