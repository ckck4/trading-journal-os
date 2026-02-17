# Components & Design System

## 1. Design Tokens

### Colors

```css
/* Base palette — luxury dark minimalist */
--bg-primary:       #0D0F14;    /* Main background */
--bg-secondary:     #14171E;    /* Card/panel background */
--bg-tertiary:      #1A1E28;    /* Elevated surfaces */
--bg-hover:         #1F2433;    /* Hover state */
--bg-active:        #252A38;    /* Active/pressed state */

--border-subtle:    #1E2230;    /* Subtle borders */
--border-default:   #2A2F3E;    /* Default borders */

--text-primary:     #E8EAF0;    /* Primary text */
--text-secondary:   #8B92A8;    /* Secondary/muted text */
--text-tertiary:    #5A6178;    /* Dimmed text */

--accent-primary:   #6C63FF;    /* Primary accent (indigo) */
--accent-hover:     #7B73FF;    /* Accent hover */
--accent-muted:     rgba(108, 99, 255, 0.15);

--green:            #22C55E;    /* Profit / Win */
--green-muted:      rgba(34, 197, 94, 0.15);
--red:              #EF4444;    /* Loss */
--red-muted:        rgba(239, 68, 68, 0.15);
--yellow:           #EAB308;    /* Warning */
--yellow-muted:     rgba(234, 179, 8, 0.15);
--blue:             #3B82F6;    /* Info / neutral */
```

### Typography

```css
--font-family:      'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:        'JetBrains Mono', 'Fira Code', monospace;

--text-xs:          0.75rem;    /* 12px */
--text-sm:          0.8125rem;  /* 13px */
--text-base:        0.875rem;   /* 14px — base */
--text-lg:          1rem;       /* 16px */
--text-xl:          1.25rem;    /* 20px */
--text-2xl:         1.5rem;     /* 24px */
--text-3xl:         2rem;       /* 32px */

--weight-normal:    400;
--weight-medium:    500;
--weight-semibold:  600;
--weight-bold:      700;
```

### Spacing

```css
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
```

### Borders & Radius

```css
--radius-sm:   4px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-xl:   16px;
--radius-full: 9999px;
```

### Shadows

```css
--shadow-sm:   0 1px 2px rgba(0,0,0,0.3);
--shadow-md:   0 4px 12px rgba(0,0,0,0.4);
--shadow-lg:   0 8px 24px rgba(0,0,0,0.5);
--shadow-glow: 0 0 20px rgba(108, 99, 255, 0.2);  /* accent glow */
```

### Transitions

```css
--ease-default:  cubic-bezier(0.4, 0, 0.2, 1);
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
```

---

## 2. Component Library

### Layout Components

| Component | Description | Props |
|-----------|-------------|-------|
| `AppShell` | Sidebar + toolbar + main content area | — |
| `Sidebar` | Collapsible left nav with icon+label items | collapsed, items, activeItem |
| `GlobalToolbar` | Top bar with account/date/session/instrument/strategy filters | filters, onFilterChange |
| `PageHeader` | Page title + description + actions | title, subtitle, actions[] |
| `WidgetGrid` | Configurable grid for Command Center | widgets[], columns, editable |
| `SlidePanel` | Right slide-over panel (trade detail) | open, width, onClose |

### Data Display

| Component | Description | Key Props |
|-----------|-------------|-----------|
| `KpiCard` | Single metric card with value, label, trend | value, label, trend, prefix, suffix |
| `DataTable` | Sortable, filterable table | columns[], data[], onSort, onFilter |
| `TradeRow` | Compact trade list row | trade, onClick, selected |
| `DayGroup` | Day header + trade rows | date, trades[], pnlTotal |
| `HeatmapCalendar` | GitHub-style calendar grid | data[], metric, onClick |
| `MatrixHeatmap` | 2D heatmap (day×hour, etc.) | xLabels, yLabels, data, onClick |
| `ProgressGauge` | Radial/linear progress indicator | value, max, label, severity |
| `Badge` | Status/count badge | label, variant (success/warning/error/info) |
| `TagChip` | Colored tag chip | name, color, removable |
| `GradeBadge` | Letter grade badge with color | grade, size |

### Charts (wrapper components)

| Component | Chart Type | Library |
|-----------|-----------|---------|
| `EquityCurve` | Line | Recharts or Nivo |
| `BarChart` | Vertical/horizontal bar | Recharts |
| `Histogram` | Distribution histogram | Recharts |
| `ScatterPlot` | X-Y scatter | Recharts |
| `AreaChart` | Filled area (drawdown) | Recharts |

### Form Components

| Component | Description |
|-----------|-------------|
| `Select` | Dropdown with search, single/multi-select |
| `DateRangePicker` | Calendar-based date range selector with presets |
| `NumberInput` | Numeric input with optional prefix/suffix |
| `TextArea` | Auto-save textarea |
| `Toggle` | On/off toggle switch |
| `Slider` | Score slider (0–10) with labels |
| `CheckboxList` | Vertical checkbox list (confluences) |
| `FileDropZone` | Drag-drop area for screenshots/CSV |
| `ChipInput` | Tag input with autocomplete |

### Navigation Components

| Component | Description |
|-----------|-------------|
| `SidebarItem` | Nav item with icon, label, badge |
| `FilterPill` | Active filter indicator (removable) |
| `TabBar` | Horizontal tab switcher |
| `CommandPalette` | Cmd+K search/navigate modal |

### Feedback Components

| Component | Description |
|-----------|-------------|
| `Toast` | Auto-dismiss notification |
| `AlertBanner` | Persistent alert (prop violation, import status) |
| `ConfirmDialog` | Action confirmation modal |
| `EmptyState` | Zero-data placeholder with CTA |
| `LoadingSkeleton` | Content loading placeholder |

---

## 3. Interaction Patterns

### Micro-Animations
- **Page transitions**: Slide-in from right (200ms ease)
- **Panel open/close**: Slide + fade (300ms)
- **Widget reorder**: Spring animation on drag
- **KPI value change**: Number counter animation
- **Badge pulse**: Subtle pulse on new notifications
- **Chart data load**: Staggered bar/line draw animation
- **Hover states**: Background + shadow transition (150ms)

### Drag & Drop
- **Dashboard widgets**: Reorder / resize via drag handles
- **Screenshot attach**: Drag file onto drop zone
- **CSV import**: Drag file onto import modal

### Keyboard Navigation
- Tab focus management across all interactive elements
- Escape closes any modal/panel
- Arrow keys navigate trade list
- Enter opens selected trade detail

---

## 4. Responsive Grid

```
Desktop (≥1440px): 12-column grid, 24px gutter
Tablet (1024-1439px): 8-column grid, 16px gutter
Mobile (768-1023px): 4-column grid, 16px gutter
Phone (<768px): 4-column grid, 12px gutter
```

### Widget Grid (Command Center)

| Breakpoint | Columns | Default |
|-----------|---------|---------|
| ≥1440px | 3 | 3×2 widgets above fold |
| 1024-1439px | 2 | 2×3 widgets |
| <1024px | 1 | Single column stack |

---

## 5. Theming

The app ships with **Dark mode only** (luxury dark minimalist). Future: light mode via CSS custom property override. All colors referenced through tokens, never hardcoded.
