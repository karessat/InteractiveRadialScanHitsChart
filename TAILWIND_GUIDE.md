# Tailwind CSS Quick Reference

This project now uses Tailwind CSS for rapid prototyping and styling.

## What Changed

- ✅ Installed Tailwind CSS, PostCSS, and Autoprefixer
- ✅ Created `tailwind.config.js` and `postcss.config.js`
- ✅ Updated `src/index.css` with Tailwind directives
- ✅ Converted all component styles to Tailwind utility classes
- ✅ Minimized custom CSS files

## Common Tailwind Patterns Used

### Layout
```jsx
<div className="w-full max-w-[1400px] mx-auto p-8">
  // Full width, max 1400px, centered, padding 2rem (8)
</div>
```

### Flexbox
```jsx
<div className="flex justify-center items-center">
  // Display flex, center horizontally and vertically
</div>
```

### Spacing
- `p-8` = padding: 2rem
- `m-4` = margin: 1rem
- `mb-8` = margin-bottom: 2rem
- `mt-6` = margin-top: 1.5rem

### Colors
- `bg-gray-50` = Very light gray background
- `text-gray-800` = Dark gray text
- `bg-white` = White background

### Typography
- `text-3xl` = font-size: 1.875rem
- `font-bold` = font-weight: 700
- `text-center` = text-align: center

### Effects
- `rounded-lg` = border-radius: 0.5rem
- `shadow-md` = Medium box shadow
- `transition-all duration-300` = Smooth transitions

### Hover States
- `hover:fill-gray-800` = Change fill color on hover
- `hover:font-semibold` = Make bold on hover

### Custom Values
Use square brackets for arbitrary values:
```jsx
className="max-w-[1400px]"  // max-width: 1400px
```

## Extending Tailwind

Edit `tailwind.config.js` to add custom colors, spacing, etc:

```js
theme: {
  extend: {
    colors: {
      'unicef-blue': '#1CABE2',
    },
  },
}
```

## VS Code IntelliSense

Install "Tailwind CSS IntelliSense" extension for autocomplete and class name suggestions.

## Resources

- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Tailwind Play](https://play.tailwindcss.com) - Online playground

