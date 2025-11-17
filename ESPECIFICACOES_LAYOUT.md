# 📐 Especificações do Layout - HearCap

## 🎯 Resolução Alvo: 1920 × 1080

Layout otimizado para aplicação web em Full HD.

---

## 📦 Dimensões dos Cards

### 📌 Cards Laterais (Esquerda e Direita)
```
┌─────────────┐
│   383px     │  Largura
│             │
│   722px     │  Altura
│             │
└─────────────┘
```

- **Largura:** `383px`
- **Altura:** `722px`
- **Background:** `#171717`
- **Border Radius:** `30px`

### 📌 Card Central
```
┌───────────────────────┐
│      1098px           │  Largura
│                       │
│      722px            │  Altura
│                       │
└───────────────────────┘
```

- **Largura (sidebar aberta):** `1098px`
- **Largura (sidebar fechada):** `1406px`
- **Altura:** `722px`
- **Background:** `#171717`
- **Border Radius:** `30px`

---

## 🎨 Layout Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    [Search 600px × 50px]                    │
│                                                 [Bell][Login]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──383px──┐ 14px ┌──────1098px──────┐ 14px ┌──383px──┐   │
│  │         │      │                  │      │         │   │
│  │  Left   │      │     Central      │      │  Right  │   │
│  │  Card   │      │      Card        │      │  Card   │   │
│  │         │      │                  │      │         │   │
│  │  722px  │      │     722px        │      │  722px  │   │
│  │    ↕    │      │       ↕          │      │    ↕    │   │
│  │         │      │                  │      │         │   │
│  └─────────┘      └──────────────────┘      └─────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    [Player 95% × 90px]                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Tabela de Medidas

| Elemento | Largura | Altura | Observação |
|----------|---------|--------|------------|
| **Card Esquerdo** | 383px | 722px | Sidebar com playlists |
| **Card Central** | 1098px | 722px | Conteúdo principal |
| **Card Direito** | 383px | 722px | TOP 4 Ativos + Global |
| **Search Bar** | 600px | 50px | Barra de busca |
| **Player Footer** | 95% | 90px | Controles de música |
| **Gap entre Cards** | 14px | - | Espaçamento |
| **Margin Top** | - | 80px | Do topo até os cards |
| **Margin Bottom** | - | 110px | Dos cards até o footer |

---

## 🔄 Estados da Sidebar

### Expandida (Padrão)
```
Sidebar:  383px
Central:  1098px
Total:    383 + 14 + 1098 + 14 + 383 = 1892px
```

### Recolhida
```
Sidebar:  75px
Central:  1406px  (ganha 308px)
Total:    75 + 14 + 1406 + 14 + 383 = 1892px
```

---

## 🎨 Cores

```css
Background Principal: #000000
Cards: #171717
Search Bar: #1c1c1c
Roxo Principal: #C750FF
Texto Primário: #ffffff
Texto Secundário: #b3b3b3
```

---

## 📏 Espaçamentos

```
Top Bar (Search):
- Posição: top: 14px
- Centralizado horizontalmente

Cards:
- Margin Top: 80px
- Margin Bottom: 110px
- Gap entre cards: 14px

Footer:
- Posição: bottom: 14px
- Largura: 95% (max-width: 1600px)
- Altura: 90px
```

---

## 🧮 Cálculos de Largura Total

### Cards + Gaps
```
383px (left) + 14px + 1098px (center) + 14px + 383px (right)
= 1892px de conteúdo

Espaço disponível: 1920px
Conteúdo: 1892px
Margem lateral: (1920 - 1892) / 2 = 14px de cada lado ✅
```

### Altura Total
```
Search: 50px
Margin Top: 80px
Cards: 722px
Margin Bottom: 110px
Footer: 90px
Gap footer: 14px

Total aproximado: ~1066px
Viewport: 1080px

Os cards se encaixam perfeitamente! ✅
```

---

## 🎯 Resumo Visual

```
       1920px (largura total)
┌─────────────────────────────┐
│ 14px │  1892px  │ 14px      │
│ marg │  cards   │ marg      │
└─────────────────────────────┘

Cards: 383 + 14 + 1098 + 14 + 383 = 1892px ✅
```

---

## ✅ Checklist de Implementação

- [x] Sidebar esquerda: 383px × 722px
- [x] Card central: 1098px × 722px  
- [x] Card direito: 383px × 722px
- [x] Gaps de 14px entre cards
- [x] Search bar: 600px × 50px
- [x] Footer: 95% × 90px
- [x] Layout centralizado
- [x] Sidebar recolhível funcionando

---

## 🎨 Para Ajustar

Edite `src/styles/responsive.css`:

```css
:root {
  --sidebar-width-expanded: 346px;    /* Largura sidebar */
  --center-width-expanded: 1098px;    /* Largura centro */
  --right-panel-width: 346px;         /* Largura direita */
  --panel-height: 911px;              /* Altura cards */
  --gap-panels: 14px;                 /* Espaço entre cards */
}
```

---

**Layout otimizado para 1920×1080!** 🎉

