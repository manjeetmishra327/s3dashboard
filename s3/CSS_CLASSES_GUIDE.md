# 🎨 CSS Classes Guide - Stunning Dashboard

## Quick Reference for All New CSS Classes

### 🌟 Background Elements

```css
.dashboard-bg-elements     /* Container for floating shapes */
.floating-shape           /* Animated floating shapes */
.shape-1, .shape-2, .shape-3  /* Individual shapes with different colors */
```

**Effect**: Animated gradient circles floating in the background

---

### 🎯 Hero Section

```css
.hero-section            /* Main welcome section */
.gradient-text          /* Animated gradient text effect */
.page-title             /* Large title with shadow */
.page-subtitle          /* Subtitle text */
```

**Effect**: Animated gradient text that shifts colors smoothly

---

### 💎 Modern Cards

```css
.modern-card            /* Glass-morphism card with blur */
.glass-effect          /* Additional glass effect */
```

**Features**:
- Semi-transparent background
- Backdrop blur (20px)
- Rounded corners (24px)
- Shimmer effect on hover
- Elevation animation

---

### 📊 Stat Cards

```css
.stat-card             /* Enhanced stat card */
.stat-card-header      /* Header with icon and trend */
.stat-card-icon        /* Gradient icon with pulse animation */
.stat-trend            /* Trend indicator (+12%) */
.stat-value            /* Large number display */
.stat-title            /* Card title */
.stat-subtitle         /* Description text */
.stat-progress         /* Bottom progress bar */
```

**Gradients Available**:
- `from-blue-500 to-blue-600`
- `from-green-500 to-green-600`
- `from-purple-500 to-purple-600`
- `from-orange-500 to-orange-600`

---

### 📝 Card Headers

```css
.card-title            /* Title with icon */
.modern-btn            /* Gradient button */
```

**Effect**: Professional header with icon and action button

---

### 🎬 Activity Items

```css
.activity-item         /* Activity list item */
.activity-icon         /* Gradient icon */
.activity-icon.resume  /* Blue gradient */
.activity-icon.welcome /* Purple gradient */
.activity-icon.upload  /* Green gradient */
.activity-content      /* Text content */
.activity-text         /* Main text */
.activity-time         /* Timestamp */
.activity-score        /* Score badge */
```

**Hover Effect**: Slides right and elevates

---

### 💡 Insight Items

```css
.insight-item          /* Insight list item */
.insight-content       /* Text content */
.insight-text          /* Main text */
.insight-time          /* Subtitle */
.insight-score         /* Emoji score */
```

**Hover Effect**: Scales up slightly

---

### 📈 Resume Strength

```css
.resume-strength-section  /* Container */
.strength-chart          /* Chart container */
.strength-circle         /* Animated circular chart */
.strength-value          /* Percentage display */
.strength-label          /* Label text */
.strength-breakdown      /* Progress bars container */
.strength-item           /* Individual bar */
.strength-bar            /* Bar background */
.strength-fill           /* Animated fill with shimmer */
```

**Animations**:
- Pulse effect on circle
- Shimmer on progress bars
- Smooth width transitions

---

### 🚀 Action Buttons

```css
.actions-grid          /* 2-column grid */
.modern-action-btn     /* Action button */
.action-icon           /* Gradient icon */
```

**Gradient Options**:
- `from-blue-500 to-blue-600` (Upload)
- `from-green-500 to-green-600` (Find Jobs)
- `from-purple-500 to-purple-600` (Schedule)
- `from-pink-500 to-pink-600` (Ask AI)

**Hover Effect**: Scale up, border color change

---

### 🎭 Special States

```css
.no-resumes            /* Empty state */
.loading-placeholder   /* Loading skeleton */
```

**Effects**:
- Gradient text for icons
- Shimmer animation on loading

---

### 🎨 Animations Reference

| Animation | Duration | Effect |
|-----------|----------|--------|
| `float` | 20s | Floating shapes movement |
| `gradientShift` | 3s | Text gradient animation |
| `iconPulse` | 2s | Icon scale pulse |
| `pulse` | 3s | Shadow pulse effect |
| `shimmer` | 2s | Light sweep effect |
| `loading` | 1.5s | Skeleton animation |

---

### 🎯 Framer Motion Props

```jsx
// Fade in from top
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6 }}

// Fade in from left
initial={{ opacity: 0, x: -20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ duration: 0.6, delay: 0.4 }}

// Fade in from right
initial={{ opacity: 0, x: 20 }}
animate={{ opacity: 1, x: 0 }}
transition={{ duration: 0.6, delay: 0.4 }}

// Staggered entrance
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, delay: index * 0.1 }}

// Hover animation
whileHover={{ y: -8, transition: { duration: 0.2 } }}

// Scale animation
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```

---

### 🌈 Color Palette

#### Primary Colors
```css
--purple-500: #8b5cf6
--purple-600: #7c3aed
--blue-500: #3b82f6
--blue-600: #2563eb
--green-500: #10b981
--green-600: #059669
--orange-500: #f97316
--orange-600: #ea580c
--pink-500: #ec4899
--pink-600: #db2777
```

#### Gradients
```css
/* Purple to Pink */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Blue */
background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);

/* Green */
background: linear-gradient(135deg, #10b981 0%, #059669 100%);

/* Orange */
background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);

/* Pink */
background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
```

---

### 📱 Responsive Breakpoints

```css
@media (max-width: 768px) {
  /* Mobile styles */
  .stats-overview { grid-template-columns: 1fr; }
  .dashboard-content { grid-template-columns: 1fr; }
  .actions-grid { grid-template-columns: 1fr; }
  .floating-shape { display: none; }
}
```

---

### 🎪 Usage Examples

#### Stat Card
```jsx
<motion.div 
  className="stat-card modern-card"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.1 }}
  whileHover={{ y: -8 }}
>
  <div className="stat-card-icon bg-gradient-to-br from-blue-500 to-blue-600">
    <i className="fas fa-file-alt"></i>
  </div>
  <div className="stat-value gradient-text">85%</div>
  <div className="stat-title">Resume Score</div>
</motion.div>
```

#### Action Button
```jsx
<motion.button 
  className="action-btn modern-action-btn"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <div className="action-icon bg-gradient-to-br from-blue-500 to-blue-600">
    <i className="fas fa-upload"></i>
  </div>
  <span>Upload Resume</span>
</motion.button>
```

---

### 💫 Pro Tips

1. **Layering**: Use multiple shadows for depth
2. **Timing**: Stagger animations by 0.1s per item
3. **Easing**: Use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth motion
4. **Performance**: Use `transform` and `opacity` for animations
5. **Accessibility**: Maintain color contrast ratios

---

### 🎬 Animation Best Practices

- **Entrance**: 0.5-0.6s duration
- **Hover**: 0.2-0.3s for instant feedback
- **Stagger**: 0.1s delay between items
- **Background**: 20s+ for subtle effects
- **Pulse**: 2-3s for gentle rhythm

---

**All classes are production-ready and optimized for performance! 🚀**
