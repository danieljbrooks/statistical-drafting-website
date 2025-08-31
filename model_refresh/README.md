# Model Refresh Script

This script automatically pulls the latest models and card data from the [statistical-drafting Python repository](https://github.com/danieljbrooks/statistical-drafting) and updates the website.

## Features

- ✅ **Automatic Set Detection**: Reads the most recent set from the GitHub data tracker
- ✅ **Smart Updates**: Only updates if the set is new (unless forced)
- ✅ **File Validation**: Checks if required files exist on GitHub before attempting download
- ✅ **Safe Operations**: Dry-run mode to preview changes before applying them
- ✅ **Dynamic Script Updates**: Automatically updates `script.js` with new sets
- ✅ **Comprehensive Logging**: Detailed output with timestamps

## Usage

### Basic Usage
```bash
# Navigate to the model_refresh directory
cd model_refresh

# Check for updates and apply them
python3 model_refresh.py

# Preview what would be done (recommended first)
python3 model_refresh.py --dry-run

# Force update even if set already exists
python3 model_refresh.py --force

# Combine flags
python3 model_refresh.py --dry-run --force
```

### Alternative: Run from Project Root
```bash
# Run from the project root directory
python3 model_refresh/model_refresh.py --dry-run
```

### Command Line Options

- `--dry-run`: Show what would be done without making any changes
- `--force`: Force update even if the set already exists in availableSets

## What It Does

1. **Fetches Data Tracker**: Downloads the latest `data_tracker.json` from GitHub
2. **Identifies Latest Set**: Extracts the `most_recent_set` value
3. **Checks Current Sets**: Parses `script.js` to see what sets are already available
4. **Validates Files**: Ensures required files exist on GitHub:
   - `data/cards/{SET}.csv`
   - `data/onnx/{SET}_Premier.onnx` 
   - `data/onnx/{SET}_Trad.onnx`
5. **Downloads Files**: Copies the files to local directories
6. **Updates Code**: Adds the new set to `availableSets` in `script.js`

## File Structure

The script expects and maintains this structure:
```
statistical-drafting-website/
├── model_refresh/
│   ├── model_refresh.py      # This script
│   └── README.md            # This documentation
├── script.js                # Updated with new sets
├── data/
│   ├── cards/
│   │   └── {SET}.csv        # Card data files
│   └── onnx/
│       ├── {SET}_Premier.onnx # Premier draft models
│       └── {SET}_Trad.onnx    # Traditional draft models
```

## Example Output

```bash
$ python3 model_refresh.py --dry-run

[2025-08-30 21:51:34] INFO: Fetching data tracker from GitHub...
[2025-08-30 21:51:35] INFO: Most recent set from GitHub: EOE
[2025-08-30 21:51:35] INFO: Current available sets: ['EOE', 'FIN', 'TDM', ...]
[2025-08-30 21:51:35] INFO: Set 'EOE' already exists. Use --force to update anyway.
```

## Error Handling

The script includes comprehensive error handling for:
- Network connectivity issues
- Missing files on GitHub
- JSON parsing errors
- File system permissions
- Invalid `script.js` format

## Integration with GitHub

The script pulls data from the [statistical-drafting repository](https://github.com/danieljbrooks/statistical-drafting) using the GitHub raw file API. It specifically monitors:

- **Data Tracker**: `model_refresh/data_tracker.json` - Contains the most recent set information
- **Card Data**: `data/cards/{SET}.csv` - Card information and ratings
- **Models**: `data/onnx/{SET}_Premier.onnx` and `data/onnx/{SET}_Trad.onnx` - ONNX model files

## Automation

You can automate this script using cron jobs or GitHub Actions to keep your website automatically updated:

```bash
# Run daily at 6 AM
0 6 * * * cd /path/to/statistical-drafting-website/model_refresh && python3 model_refresh.py
```

## Troubleshooting

### Common Issues

1. **"Could not find availableSets array"**: The script.js format may have changed
2. **"Failed to fetch data tracker"**: Check internet connection and GitHub availability
3. **"Missing files on GitHub"**: The set may not have all required files yet

### Debug Mode

Use `--dry-run` to see exactly what the script would do without making changes.
