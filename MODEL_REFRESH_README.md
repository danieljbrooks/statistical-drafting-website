# Model Refresh Script

This script automatically pulls the latest models and card data from the [statistical-drafting Python repository](https://github.com/danieljbrooks/statistical-drafting) and updates the website.

## Features

- ✅ **Automatic Set Detection**: Reads the most recent set from the GitHub data tracker
- ✅ **Manual Set Selection**: `--set` handles sets the tracker never sees
- ✅ **Smart Updates**: Only updates if the set is new (unless forced)
- ✅ **File Validation**: Checks if required files exist on GitHub before attempting download
- ✅ **Safe Operations**: Dry-run mode to preview changes before applying them
- ✅ **Dynamic Script Updates**: Automatically updates `script.js` with new sets
- ✅ **Comprehensive Logging**: Detailed output with timestamps

## Usage

### Basic Usage
```bash
# Check for updates and apply them
python3 model_refresh.py

# Preview what would be done (recommended first)
python3 model_refresh.py --dry-run

# Force update even if set already exists
python3 model_refresh.py --force

# Refresh a specific set instead of the tracker's most recent one
python3 model_refresh.py --set HOB

# Combine flags
python3 model_refresh.py --dry-run --force
python3 model_refresh.py --dry-run --set HOB
```

### Command Line Options

- `--dry-run`: Show what would be done without making any changes
- `--force`: Force update even if the set already exists
- `--set CODE`: Refresh this set instead of the tracker's `most_recent_set`

### Sets that are on S3 but not on the 17lands website

17lands sometimes publishes a set's draft data to S3 without listing it on its
[public datasets page](https://www.17lands.com/public_datasets). The upstream
`refresh_models.py` discovers sets by reading that page, so an unlisted set never becomes
`most_recent_set` in `data_tracker.json` — and without `--set` this script had no way to
ask for it.

`--set` skips the tracker lookup and runs the identical download-and-update path:

```bash
python3 model_refresh.py --dry-run --set HOB   # check first
python3 model_refresh.py --set HOB
```

The set's files still have to be trained and pushed to `main` in the
statistical-drafting repo first, since everything is fetched from GitHub raw rather than
from a local checkout. HOB was added this way. in availableSets

## What It Does

1. **Fetches Data Tracker**: Downloads the latest `data_tracker.json` from GitHub
2. **Identifies Latest Set**: Extracts the `most_recent_set` value
3. **Checks Current Sets**: Parses `script.js` to see what sets are already available
4. **Validates Files**: Requires `data/cards/{SET}.csv`, then probes GitHub for whichever
   model variants exist and takes only those:
   - `data/onnx/{SET}_Premier.onnx` (the usual case)
   - `data/onnx/{SET}_PickTwo.onnx` (fallback when Premier was not trained)
   - `data/onnx/{SET}_Trad.onnx`, `data/onnx/{SET}_PickTwoTrad.onnx` (legacy; Traditional
     models are no longer trained upstream, so recent sets are Premier-only)
5. **Downloads Files**: Copies the files to local directories
6. **Updates Code**: Adds the new set to `availableSets` in `script.js`

## File Structure

The script expects and maintains this structure:
```
statistical-drafting-website/
├── model_refresh.py          # This script
├── script.js                 # Updated with new sets
├── data/
│   ├── cards/
│   │   └── {SET}.csv          # Card data files
│   └── onnx/
│       ├── {SET}_Premier.onnx # Premier draft models
│       └── {SET}_Trad.onnx    # Traditional models, older sets only
```

## Example Output

```bash
$ python3 model_refresh.py --dry-run

[2025-08-30 21:51:34] INFO: Fetching data tracker from GitHub...
[2025-08-30 21:51:35] INFO: Most recent set from GitHub: EOE
[2025-08-30 21:51:35] INFO: Current available sets: ['EOE', 'FIN', 'TDM', ...]
[2025-08-30 21:51:35] INFO: Set 'EOE' already exists. Use --force to update anyway.
```

```bash
$ python3 model_refresh.py --dry-run --set HOB

[2026-09-04 18:23:14] INFO: Using set given on the command line: HOB
[2026-09-04 18:23:14] INFO: Current available sets: ['MSH', 'SOS', 'TMT', ...]
[2026-09-04 18:23:15] INFO: Found 1 draft mode variant(s): ['Premier']
[2026-09-04 18:23:15] INFO: [DRY RUN] Would download .../data/cards/HOB.csv
[2026-09-04 18:23:15] INFO: [DRY RUN] Would download .../data/onnx/HOB_Premier.onnx
[2026-09-04 18:23:15] INFO: [DRY RUN] Would add 'HOB' to availableSets in script.js
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
- **Models**: `data/onnx/{SET}_Premier.onnx`, plus `_PickTwo`, `_Trad` and `_PickTwoTrad`
  where they exist - ONNX model files

## Automation

You can automate this script using cron jobs or GitHub Actions to keep your website automatically updated:

```bash
# Run daily at 6 AM
0 6 * * * cd /path/to/statistical-drafting-website && python3 model_refresh.py
```
