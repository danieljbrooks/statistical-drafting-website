# Statistical Drafting Website

A static website for the Statistical Drafting Assistant that shows recommended card ratings based on your current card collection.

## Features

- **Set Selection**: Choose from available Magic: The Gathering sets
- **Recommended Pick Order**: View cards ordered by their recommended rating (0-100 scale)
- **Collection Management**: Add/remove cards from your collection and see how it affects recommendations
- **Real-time Updates**: Pick order updates automatically when you modify your collection
- **ONNX Model Integration**: Uses trained neural network models for accurate card ratings

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/danieljbrooks/statistical-drafting-website.git
   cd statistical-drafting-website
   ```

2. **Start the server**:
   ```bash
   python3 server.py
   ```

3. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

### Selecting a Set
1. Use the dropdown menu at the top of the page to select a Magic: The Gathering set
2. The system will automatically load the card data and neural network model for that set
3. The recommended pick order table will populate with all cards in the set

### Managing Your Collection
1. Click the "Add Card" button to open the card search modal
2. Type the name of a card to search for it
3. Click on a card in the search results to add it to your collection
4. Use the "Remove" button in the collection table to remove cards
5. Use the "Clear Collection" button to remove all cards at once

### Understanding the Ratings
- **Rating**: Current recommended rating (0-100) based on your collection
- **P1P1 Rating**: First pick, first pack rating (baseline rating)
- **Synergy**: Difference between current rating and P1P1 rating (shows how much your collection improves the card)

### Color Coding
- **High Rating** (70+): Green
- **Medium Rating** (50-69): Yellow  
- **Low Rating** (<50): Red

## Technical Details

### Architecture
- **Frontend**: Pure HTML/CSS/JavaScript
- **ONNX Models**: Neural network models converted to ONNX format for browser compatibility
- **Card Data**: CSV files containing card information for each set
- **Server**: Simple Python HTTP server with CORS support

### File Structure
```
statistical-drafting-website/
├── index.html              # Main HTML file
├── styles.css              # CSS styles
├── script.js               # JavaScript application logic
├── server.py               # Python HTTP server
├── README.md               # This file
└── statistical-drafting/   # Cloned repository with models and data
    ├── data/
    │   ├── cards/          # CSV files for each set
    │   └── onnx/           # ONNX model files
    └── ...
```

### Model Information
The website uses neural network models trained on draft data to predict card ratings. Models are available for:
- **Premier Draft**: Fast-paced competitive drafting
- **Traditional Draft**: Slower, more strategic drafting

Models are automatically selected based on the set and format.

## Development

### Adding New Sets
1. Add the CSV file to `statistical-drafting/data/cards/`
2. Add the ONNX model to `statistical-drafting/data/onnx/`
3. Update the hardcoded sets list in `script.js`

### Modifying Styles
Edit `styles.css` to customize the appearance. The design uses a modern, clean aesthetic with:
- Gradient backgrounds
- Card-based layouts
- Responsive design
- Color-coded ratings and rarities

### Extending Functionality
The main application logic is in `script.js`. Key classes and methods:
- `DraftingAssistant`: Main application class
- `loadCardData()`: Loads card information from CSV
- `loadModel()`: Loads ONNX neural network model
- `getCardRatings()`: Calculates ratings using the model
- `updatePickOrder()`: Updates the pick order display

## Troubleshooting

### Common Issues
1. **Models not loading**: Ensure the ONNX files are in the correct location
2. **CORS errors**: Make sure you're using the Python server, not opening files directly
3. **Slow performance**: Large sets may take a moment to load initially

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires WebAssembly support for ONNX Runtime.

## License

This project is part of the Statistical Drafting Assistant. See the main repository for licensing information.
