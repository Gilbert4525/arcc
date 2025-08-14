# Adding the Futuristic Cityscape Hero Image

## 🎯 **What You Need to Do:**

### **Step 1: Download the Image**
1. **Visit:** https://www.awwwards.com/sites/resultex-iodo
2. **Find the hero image** (futuristic cityscape with person overlooking the city)
3. **Right-click** on the image
4. **Select "Save Image As..."**
5. **Save it as:** `futuristic-cityscape-hero.jpg` (or `.png` if it's PNG)

### **Step 2: Add to Your Project**
1. **Copy the downloaded image**
2. **Paste it into:** `app/public/images/` folder
3. **Make sure the filename is exactly:** `futuristic-cityscape-hero.jpg`

### **Step 3: Verify It Works**
1. **Start your development server:** `npm run dev`
2. **Visit your homepage**
3. **You should see the futuristic cityscape background** in the hero section

## 📁 **File Structure Should Look Like:**
```
app/
├── public/
│   ├── images/
│   │   └── futuristic-cityscape-hero.jpg  ← Your image goes here
│   ├── boardmix-logo.svg
│   └── ...other files
└── src/
    └── components/
        └── AnimatedHomePage.tsx  ← Already updated to use your image
```

## 🖼️ **Image Format Recommendations:**

### **Best Format: JPG**
- ✅ **Smaller file size** (faster loading)
- ✅ **Good for photographs** with many colors
- ✅ **Widely supported**

### **Alternative: PNG**
- ✅ **Higher quality** but larger file size
- ✅ **Supports transparency** (not needed for background)

### **Not Recommended: SVG**
- ❌ **Too large** for complex images like photographs
- ❌ **Better for simple graphics/icons**

## 🔧 **If You Use a Different Filename:**

If you save the image with a different name, update this line in `AnimatedHomePage.tsx`:

```tsx
backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.2)), url("/images/YOUR_FILENAME_HERE.jpg")'
```

## ✅ **What's Already Done:**
- ✅ Created `app/public/images/` folder
- ✅ Updated `AnimatedHomePage.tsx` to use the local image
- ✅ Set up proper gradient overlay for text readability
- ✅ Configured responsive background properties

## 🎨 **Current Setup:**
- **Background position:** Center
- **Background size:** Cover (fills entire section)
- **Overlay:** Dark gradient for text readability
- **Text colors:** White with drop shadows for visibility

Once you add the image file, your homepage will have the exact futuristic cityscape background from the Resultex website!