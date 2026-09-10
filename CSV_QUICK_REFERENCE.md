# 📋 CSV Quick Reference Card

## 📄 Template Files Available

1. **`csv-template-blank.csv`** - Empty, ready to fill
2. **`csv-template-with-example.csv`** - Has example row

---

## ✅ Required Columns (Must Fill)

```csv
name,category,price,stock,imageUrl
"Product Name","Category",189,50,"image.jpg"
```

| Column | Type | Example |
|--------|------|---------|
| name | Text | `"Mountain Print"` |
| category | Text | `"Art Prints"` |
| price | Number | `189` |
| stock | Number | `50` |
| imageUrl | Text | `"mountain.jpg"` |

---

## 💡 Optional Columns (Can Skip)

```csv
description,cost,videoUrl
"Product description",85,"https://example.com/video.mp4"
```

---

## 📝 Format Rules

### ✅ DO:
```csv
"Text in quotes",Numbers not quoted,189,50,"filename.jpg"
```

### ❌ DON'T:
```csv
Text without quotes,"189","50",folder/filename.jpg
```

---

## 🖼️ Image URL - Just Filename!

```csv
✅ "mountain.jpg"
❌ "1/mountain.jpg"
❌ "product-images/1/mountain.jpg"
```

---

## 📋 Example CSV

```csv
name,category,price,stock,imageUrl,description,cost,videoUrl
"Mountain Print","Art Prints",189,50,"mountain.jpg","Beautiful mountain",85,
"Ocean Print","Art Prints",189,45,"ocean.jpg","Dramatic ocean",85,
"Forest Print","Art Prints",189,40,"forest.jpg","Peaceful forest",85,
```

---

## 🚀 Import Process

1. Fill out CSV template
2. Save as `.csv` file
3. `npm run dev`
4. Login to admin
5. Collection → IMPORT CSV
6. Select file
7. Done! ✨

---

## 💡 Remember

- Each row = 1 product with 8 size variations
- Text needs quotes: `"text"`
- Numbers no quotes: `123`
- Image filename must match uploaded file exactly

---

**Full Guide:** `CSV_TEMPLATE_GUIDE.md`
