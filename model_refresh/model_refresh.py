#!/usr/bin/env python3
"""
Model Refresh Script for Statistical Drafting Website

This script automatically pulls the latest models and data from the 
statistical-drafting Python repository and updates the website.

Usage:
    python3 model_refresh.py [--dry-run] [--force]
    
Options:
    --dry-run    Show what would be done without making changes
    --force      Force update even if set already exists
"""

import os
import sys
import json
import requests
import argparse
from pathlib import Path
from datetime import datetime

# Configuration
GITHUB_REPO = "danieljbrooks/statistical-drafting"
RAW_BASE_URL = f"https://raw.githubusercontent.com/{GITHUB_REPO}/main"
DATA_TRACKER_URL = f"{RAW_BASE_URL}/model_refresh/data_tracker.json"

# Local paths (script is now in model_refresh/ subdirectory)
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent  # Go up one level to the project root
DATA_DIR = PROJECT_ROOT / "data"
CARDS_DIR = DATA_DIR / "cards"
ONNX_DIR = DATA_DIR / "onnx"
SCRIPT_JS_PATH = PROJECT_ROOT / "script.js"

class ModelRefreshError(Exception):
    """Custom exception for model refresh errors"""
    pass

class ModelRefresher:
    def __init__(self, dry_run=False, force=False):
        self.dry_run = dry_run
        self.force = force
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Statistical-Drafting-Website/1.0'
        })
        
    def log(self, message, level="INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def fetch_data_tracker(self):
        """Fetch the data tracker JSON from GitHub"""
        try:
            self.log("Fetching data tracker from GitHub...")
            response = self.session.get(DATA_TRACKER_URL)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise ModelRefreshError(f"Failed to fetch data tracker: {e}")
        except json.JSONDecodeError as e:
            raise ModelRefreshError(f"Failed to parse data tracker JSON: {e}")
    
    def get_current_available_sets(self):
        """Extract current available sets from script.js"""
        try:
            with open(SCRIPT_JS_PATH, 'r') as f:
                content = f.read()
            
            # Find the availableSets array
            start_marker = "this.availableSets = ["
            end_marker = "];"
            
            start_idx = content.find(start_marker)
            if start_idx == -1:
                raise ModelRefreshError("Could not find availableSets array in script.js")
            
            start_idx += len(start_marker)
            end_idx = content.find(end_marker, start_idx)
            if end_idx == -1:
                raise ModelRefreshError("Could not find end of availableSets array in script.js")
            
            # Extract and parse the array content
            array_content = content[start_idx:end_idx].strip()
            # Remove quotes and split by comma
            sets = [s.strip().strip("'\"") for s in array_content.split(',') if s.strip()]
            
            return sets
        except FileNotFoundError:
            raise ModelRefreshError("script.js not found")
        except Exception as e:
            raise ModelRefreshError(f"Failed to parse availableSets from script.js: {e}")
    
    def update_available_sets(self, new_set):
        """Add new set to availableSets in script.js"""
        if self.dry_run:
            self.log(f"[DRY RUN] Would add '{new_set}' to availableSets in script.js")
            return
            
        try:
            with open(SCRIPT_JS_PATH, 'r') as f:
                content = f.read()
            
            # Find the availableSets array
            start_marker = "this.availableSets = ["
            end_marker = "];"
            
            start_idx = content.find(start_marker)
            if start_idx == -1:
                raise ModelRefreshError("Could not find availableSets array in script.js")
            
            start_idx += len(start_marker)
            end_idx = content.find(end_marker, start_idx)
            if end_idx == -1:
                raise ModelRefreshError("Could not find end of availableSets array in script.js")
            
            # Extract current array content
            array_content = content[start_idx:end_idx].strip()
            current_sets = [s.strip().strip("'\"") for s in array_content.split(',') if s.strip()]
            
            # Add new set at the beginning (newest first)
            if new_set not in current_sets:
                current_sets.insert(0, new_set)
                
                # Rebuild the array string
                new_array_content = "'" + "', '".join(current_sets) + "'"
                
                # Replace in content
                new_content = (
                    content[:start_idx] + 
                    new_array_content + 
                    content[end_idx:]
                )
                
                # Write back to file
                with open(SCRIPT_JS_PATH, 'w') as f:
                    f.write(new_content)
                    
                self.log(f"Added '{new_set}' to availableSets in script.js")
            else:
                self.log(f"Set '{new_set}' already exists in availableSets")
                
        except Exception as e:
            raise ModelRefreshError(f"Failed to update availableSets: {e}")
    
    def download_file(self, url, dest_path):
        """Download a file from URL to destination path"""
        if self.dry_run:
            self.log(f"[DRY RUN] Would download {url} to {dest_path}")
            return
            
        try:
            self.log(f"Downloading {url}...")
            response = self.session.get(url)
            response.raise_for_status()
            
            # Ensure destination directory exists
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(dest_path, 'wb') as f:
                f.write(response.content)
                
            self.log(f"Downloaded to {dest_path}")
            
        except requests.RequestException as e:
            raise ModelRefreshError(f"Failed to download {url}: {e}")
    
    def check_file_exists_on_github(self, path):
        """Check if a file exists on GitHub"""
        url = f"{RAW_BASE_URL}/{path}"
        try:
            response = self.session.head(url)
            return response.status_code == 200
        except requests.RequestException:
            return False
    
    def get_draft_mode_variants(self, set_name):
        """Get available draft mode variants for a set"""
        variants = []
        
        # Check for old format (Premier/Trad)
        premier_path = f"data/onnx/{set_name}_Premier.onnx"
        trad_path = f"data/onnx/{set_name}_Trad.onnx"
        
        if self.check_file_exists_on_github(premier_path):
            variants.append(("Premier", premier_path))
        if self.check_file_exists_on_github(trad_path):
            variants.append(("Trad", trad_path))
        
        # Check for new format (PickTwo/PickTwoTrad)
        picktwo_path = f"data/onnx/{set_name}_PickTwo.onnx"
        picktwotrad_path = f"data/onnx/{set_name}_PickTwoTrad.onnx"
        
        if self.check_file_exists_on_github(picktwo_path):
            variants.append(("PickTwo", picktwo_path))
        if self.check_file_exists_on_github(picktwotrad_path):
            variants.append(("PickTwoTrad", picktwotrad_path))
        
        return variants
    
    def refresh_models(self):
        """Main method to refresh models"""
        try:
            # Fetch data tracker
            data_tracker = self.fetch_data_tracker()
            most_recent_set = data_tracker.get('most_recent_set')
            
            if not most_recent_set:
                raise ModelRefreshError("No 'most_recent_set' found in data tracker")
            
            self.log(f"Most recent set from GitHub: {most_recent_set}")
            
            # Get current available sets
            current_sets = self.get_current_available_sets()
            self.log(f"Current available sets: {current_sets}")
            
            # Check if set already exists
            if most_recent_set in current_sets and not self.force:
                self.log(f"Set '{most_recent_set}' already exists. Use --force to update anyway.")
                return
            
            # Check for cards CSV file
            cards_url_path = f"data/cards/{most_recent_set}.csv"
            cards_csv_path = CARDS_DIR / f"{most_recent_set}.csv"
            
            if not self.check_file_exists_on_github(cards_url_path):
                self.log(f"WARNING: Missing cards file on GitHub: {cards_url_path}")
                if not self.force:
                    self.log("Use --force to proceed anyway")
                    return
            
            # Get available draft mode variants
            variants = self.get_draft_mode_variants(most_recent_set)
            
            if not variants:
                self.log(f"WARNING: No ONNX model files found for set '{most_recent_set}'")
                if not self.force:
                    self.log("Use --force to proceed anyway")
                    return
            
            self.log(f"Found {len(variants)} draft mode variant(s): {[v[0] for v in variants]}")
            
            # Download cards file
            if self.check_file_exists_on_github(cards_url_path):
                cards_url = f"{RAW_BASE_URL}/{cards_url_path}"
                self.download_file(cards_url, cards_csv_path)
            
            # Download model files
            for mode, github_path in variants:
                local_path = ONNX_DIR / f"{most_recent_set}_{mode}.onnx"
                model_url = f"{RAW_BASE_URL}/{github_path}"
                self.download_file(model_url, local_path)
            
            # Update availableSets in script.js
            if most_recent_set not in current_sets:
                self.update_available_sets(most_recent_set)
            
            self.log(f"Model refresh completed successfully for set '{most_recent_set}'")
            
            if not self.dry_run:
                self.log("Don't forget to refresh your browser to see the new set!")
            
        except ModelRefreshError:
            raise
        except Exception as e:
            raise ModelRefreshError(f"Unexpected error during model refresh: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="Refresh models from statistical-drafting repository",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument(
        '--dry-run', 
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--force', 
        action='store_true',
        help='Force update even if set already exists'
    )
    
    args = parser.parse_args()
    
    try:
        refresher = ModelRefresher(dry_run=args.dry_run, force=args.force)
        refresher.refresh_models()
        
    except ModelRefreshError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nOperation cancelled by user", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
