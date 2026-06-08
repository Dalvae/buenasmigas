# 🎨 Design System — Buenas Migas

Guía de identidad visual para alinear la app interna con la marca de la panadería
**Buenas Migas** (referencia: [buenasmigas.cl](https://www.buenasmigas.cl/)).

> Los colores están **derivados del logo y la imagen de marca** (el sitio es tipo Wix y no
> expone su CSS). Son fieles al look pero afinables con el hex exacto del manual de marca.

---

## 1. Personalidad de marca

Panadería/pastelería chilena, artesanal y cálida. Estética **limpia, blanca, con foto de
producto** y un **café chocolate** como color insignia. Titulares con **serif robusto** (el
logo), cuerpo en **sans-serif** legible, y **llamados a la acción en negro** sólido.

- Tagline: *"Somos la mejor panadería de Chile"*
- Navegación: Inicio · Sobre Nosotros · Productos · Quiero ser cliente · Contacto
- Secciones: Panadería · Bollería · Pastelería

---

## 2. Paleta de color (tokens)

| Token | Rol | HEX | oklch (para shadcn) |
|---|---|---|---|
| **Cacao** | Marca / primario | `#4A2A1A` | `oklch(0.33 0.055 48)` |
| Cacao claro | Hover / bordes marca | `#7A4A2E` | `oklch(0.47 0.07 52)` |
| Caramelo | Acento secundario | `#B07B4F` | `oklch(0.62 0.075 60)` |
| Dorado pan | Acento / highlights | `#D9A24B` | `oklch(0.76 0.11 75)` |
| Negro | Acciones / CTA | `#111111` | `oklch(0.18 0 0)` |
| Crema | Fondo cálido | `#FBF8F4` | `oklch(0.985 0.006 75)` |
| Blanco | Fondo / cards | `#FFFFFF` | `oklch(1 0 0)` |
| Tinta | Texto principal | `#2A1B12` | `oklch(0.25 0.03 48)` |
| Gris cálido | Texto secundario / nav | `#8A7F77` | `oklch(0.62 0.012 60)` |
| Borde | Líneas / inputs | `#E8E1D9` | `oklch(0.92 0.008 75)` |
| Rojo | Destructivo / error | `#C0392B` | `oklch(0.58 0.20 27)` |

**Gráficos (Recharts)** — paleta cálida de panadería en vez del azul por defecto:

| | HEX | oklch |
|---|---|---|
| chart-1 (cacao) | `#5A3220` | `oklch(0.40 0.06 48)` |
| chart-2 (caramelo) | `#B07B4F` | `oklch(0.62 0.09 60)` |
| chart-3 (dorado) | `#D9A24B` | `oklch(0.78 0.12 80)` |
| chart-4 (terracota) | `#9C5A3C` | `oklch(0.55 0.10 45)` |
| chart-5 (avena) | `#C9B79C` | `oklch(0.80 0.03 80)` |

---

## 3. CSS listo para pegar

Sobrescribe el theme en `packages/ui/src/styles/globals.css` (bloque `:root`) con estos
valores de marca (mismas variables shadcn que ya usa el proyecto):

```css
:root {
	--background: oklch(0.985 0.006 75);      /* crema cálida */
	--foreground: oklch(0.25 0.03 48);        /* tinta café */
	--card: oklch(1 0 0);
	--card-foreground: oklch(0.25 0.03 48);
	--popover: oklch(1 0 0);
	--popover-foreground: oklch(0.25 0.03 48);
	--primary: oklch(0.33 0.055 48);          /* CACAO (marca) */
	--primary-foreground: oklch(0.985 0.006 75);
	--secondary: oklch(0.95 0.012 75);        /* crema más oscura */
	--secondary-foreground: oklch(0.33 0.055 48);
	--muted: oklch(0.95 0.012 75);
	--muted-foreground: oklch(0.50 0.02 55);  /* gris cálido */
	--accent: oklch(0.92 0.03 75);            /* caramelo suave */
	--accent-foreground: oklch(0.33 0.055 48);
	--destructive: oklch(0.58 0.20 27);
	--border: oklch(0.92 0.008 75);
	--input: oklch(0.92 0.008 75);
	--ring: oklch(0.47 0.07 52);              /* cacao claro */
	--chart-1: oklch(0.40 0.06 48);
	--chart-2: oklch(0.62 0.09 60);
	--chart-3: oklch(0.78 0.12 80);
	--chart-4: oklch(0.55 0.10 45);
	--chart-5: oklch(0.80 0.03 80);
	--radius: 0.375rem;                       /* esquinas más sobrias (marca) */
}
```

> El sitio usa **CTA negros**. Si prefieres ese look para los botones principales, cambia
> `--primary` a `oklch(0.18 0 0)` y deja el cacao para enlaces/acentos.

---

## 4. Tipografía

| Uso | Fuente | Por qué |
|---|---|---|
| **Marca + títulos** | **Zilla Slab** (700) — alt: Rokkitt / Bitter | Serif slab robusto, igual al logo "Buenas Migas" |
| **UI + cuerpo** | **Inter** (ya en el theme) | Sans limpio y legible para formularios/tablas |
| Números/datos | Inter (tabular-nums) | Tablas y % alineados |

Setup (Google Fonts) en `globals.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&display=swap");

@theme inline {
	--font-sans: "Inter Variable", sans-serif;
	--font-display: "Zilla Slab", Georgia, serif;   /* nuevo: titulares de marca */
}
```

Uso: `class="font-display"` en `<h1>`, el wordmark del header y los títulos de sección.
Titulares en mayúsculas como la web (`BIENVENIDO`, `tracking-tight`).

---

## 5. Componentes

- **Botones primarios:** fondo cacao (o negro), texto crema, esquinas sobrias (`rounded-md`),
  peso medio. Hover: cacao claro. Sin sombras exageradas.
- **Cards:** fondo blanco sobre crema, borde `--border` 1px, radio `--radius`, padding generoso.
- **Header/nav:** wordmark "Buenas Migas" en `font-display` cacao; links en mayúsculas, gris
  cálido, activo en cacao.
- **Inputs:** borde `--input`, foco con `--ring` (cacao claro). Labels en gris cálido.
- **Tablas (consultas):** cabecera en crema (`--secondary`), filas zebra muy sutiles, números
  `tabular-nums`.
- **Gráficos:** usar `--chart-1..5` (paleta cálida); 1 color por gráfico (línea elaboración =
  cacao, envasado = caramelo, PNC = dorado).

---

## 6. Principios

- **Cálido y limpio:** mucho blanco/crema, café como acento, no saturar de color.
- **Foto de producto** cuando aplique (login/landing); la app operativa prioriza claridad.
- **Contraste AA:** cacao sobre crema/blanco cumple; evitar texto café claro sobre crema.
- **Consistencia:** todo color desde tokens (no hex sueltos en componentes).
