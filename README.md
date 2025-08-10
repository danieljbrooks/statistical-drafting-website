# Statistical Drafting Website

A static website for the Statistical Drafting Assistant that shows recommended card ratings based on your current card collection.

## Features

- **Set Selection**: Choose from available Magic: The Gathering sets
- **Recommended Pick Order**: View cards ordered by their recommended rating (0-100 scale)
- **Collection Management**: Add/remove cards from your collection and see how it affects recommendations
- **Real-time Updates**: Pick order updates automatically when you modify your collection
- **ONNX Model Integration**: Uses trained neural network models for accurate card ratings

## Quick Start

### Option 1: GitHub Pages (Recommended)
The website is hosted at: [statisticaldrafting.com](https://statisticaldrafting.com)

### Option 2: Local Development
1. **Clone the repository**:
   ```bash
   git clone https://github.com/danieljbrooks/statistical-drafting-website.git
   cd statistical-drafting-website
   ```

2. **Open index.html** directly in your browser, or use a local server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. **Navigate to** `http://localhost:8000` (if using a server)

## Usage

### Selecting a Set
1. Use the dropdown menu at the top of the page to select a Magic: The Gathering set
2. The system will automatically load the card data and neural network model for that set
3. The recommended pick order table will populate with all cards in the set

### Managing Your Collection
1. Click the "Find Card" button to open the card search modal
2. Type the name of a card to search for it
3. Click on a card in the search results to add it to your collection
4. Use the "Remove" button in the collection table to remove cards
5. Use the "New Draft" button to remove all cards at once

### Understanding the Ratings
- **Rating**: Current recommended rating (0-100) based on your collection
- **Synergy**: Difference between current rating and baseline rating (shows how much your collection improves the card)

### Color Coding
- **High Rating** (70+): Green
- **Medium Rating** (50-69): Yellow  
- **Low Rating** (<50): Red

## Technical Details

### Architecture
- **Frontend**: Pure HTML/CSS/JavaScript
- **ONNX Models**: Neural network models converted to ONNX format for browser compatibility
- **Card Data**: CSV files containing card information for each set
- **Hosting**: Static website deployable to GitHub Pages or any static hosting service

### File Structure
```
statistical-drafting-website/
├── index.html              # Main HTML file
├── styles.css              # CSS styles
├── script.js               # JavaScript application logic
├── favicon.svg             # Website favicon
├── README.md               # This file
└── data/                   # Data files for GitHub Pages
    ├── cards/              # CSV files for each set
    └── onnx/               # ONNX model files
```

### Model Information
The website uses neural network models trained on draft data to predict card ratings. Models are available for:
- **Premier Draft**: Fast-paced competitive drafting
- **Traditional Draft**: Slower, more strategic drafting

Models are automatically selected based on the set and format.

## Development

### Adding New Sets
1. Add the CSV file to `data/cards/`
2. Add the ONNX model to `data/onnx/`
3. Update the hardcoded sets list in `script.js`

### Modifying Styles
Edit `styles.css` to customize the appearance. The design uses a modern, clean aesthetic with:
- Clean layouts
- Card-based designs
- Responsive design
- Color-coded ratings and rarities

### Extending Functionality
The main application logic is in `script.js`. Key classes and methods:
- `DraftingAssistant`: Main application class
- `loadCardData()`: Loads card information from CSV
- `loadModel()`: Loads ONNX neural network model
- `getCardRatings()`: Calculates ratings using the model
- `updatePickOrder()`: Updates the pick order display

## Deployment

### GitHub Pages
1. Push your code to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to "Deploy from a branch" and select your main branch
4. Configure custom domain if desired

### Other Static Hosting
The website can be deployed to any static hosting service:
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any web server

## Troubleshooting

### Common Issues
1. **Models not loading**: Ensure the ONNX files are in the correct location (`data/onnx/`)
2. **Card data not loading**: Ensure CSV files are in the correct location (`data/cards/`)
3. **Slow performance**: Large sets may take a moment to load initially

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires WebAssembly support for ONNX Runtime.

## License

This project is part of the Statistical Drafting Assistant. See the main repository for licensing information.
