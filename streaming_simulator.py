#!/usr/bin/env python3
"""
D'insight Real-Time Streaming Simulator

Simulates streaming sensor data by sending monitor data point-by-point
to the backend API, enabling real-time visualization of machine health.

Usage:
    python3 streaming_simulator.py --baseline-id 1
    python3 streaming_simulator.py --baseline-file "test-data/Store D Line A - Baseline.csv"
"""

import argparse
import asyncio
import csv
import json
import logging
import os
import re
import sys
import time
from typing import Dict, List, Optional, Tuple
from pathlib import Path

import aiohttp
# import pandas as pd  # Not needed for basic CSV operations
from aiohttp import ClientSession, FormData

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('streaming_simulator.log')
    ]
)
logger = logging.getLogger(__name__)

class StreamingSimulator:
    """Simulates real-time sensor data streaming for D'insight analysis."""
    
    def __init__(self, api_base_url: str = "http://localhost:8080/api/v1"):
        self.api_base_url = api_base_url
        self.session: Optional[ClientSession] = None
        self.baseline_id: Optional[int] = None
        self.baseline_coordinates: Optional[Tuple[List[float], List[float]]] = None
        self.monitor_data: List[Dict] = []
        self.stream_progress = 0
        self.is_streaming = False
        self.latest_glow_count = 10
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    def detect_dataset_family(self, headers: List[str]) -> str:
        """
        Auto-detect dataset family by header patterns.
        
        Args:
            headers: List of column headers from the CSV file
            
        Returns:
            Dataset family identifier ('store_d' or 'generic')
        """
        header_str = ','.join(headers).lower()  # Use lowercase for pattern matching
        
        # Store D pattern: freq_X.XX format with many decimal places
        freq_pattern = r'freq_\d+\.\d{2,}'
        freq_matches = len(re.findall(freq_pattern, header_str))
        
        # Generic pattern: f_X format (simple integer suffixes)
        f_pattern = r'\bf_\d+\b'
        f_matches = len(re.findall(f_pattern, header_str))
        
        logger.info(f"📊 Schema detection: freq_X.XX matches={freq_matches}, f_X matches={f_matches}")
        
        if freq_matches > f_matches and freq_matches > 50:  # Store D has hundreds of freq_ columns
            return 'store_d'
        elif f_matches > 10:  # Generic has many f_ columns
            return 'generic'
        else:
            logger.warning(f"⚠️  Unknown schema pattern, defaulting to generic")
            return 'generic'
    
    def normalize_headers(self, headers: List[str], dataset_family: str) -> List[str]:
        """
        Normalize headers to match expected API format.
        
        Args:
            headers: Original column headers
            dataset_family: Dataset family ('store_d' or 'generic')
            
        Returns:
            Normalized headers that match API expectations
        """
        normalized = []
        
        for header in headers:
            # Clean header: remove BOM and strip whitespace, but preserve case!
            clean_header = header.strip()
            
            # Remove BOM (Byte Order Mark) if present
            if clean_header.startswith('\ufeff'):
                clean_header = clean_header[1:]
            
            # For API compatibility, we need to preserve the original case
            # but ensure consistency between baseline and monitor files
            if dataset_family == 'store_d':
                # Store D: preserve original case, just clean BOM
                normalized.append(clean_header)
            elif dataset_family == 'generic':
                # Generic: preserve original case, just clean BOM  
                normalized.append(clean_header)
            else:
                # Unknown family: preserve original case, just clean BOM
                normalized.append(clean_header)
        
        logger.info(f"🔄 Header normalization: {len(headers)} -> {len(normalized)} columns")
        logger.debug(f"🧹 BOM cleaning: first header '{headers[0]}' -> '{normalized[0]}'")
        return normalized
    
    def extract_feature_columns(self, headers: List[str]) -> List[str]:
        """
        Extract only the feature columns (f_X or freq_X.XX) from headers.
        
        Args:
            headers: List of column headers
            
        Returns:
            List of feature column names only
        """
        feature_cols = []
        for header in headers:
            header_lower = header.lower().strip()
            if header_lower.startswith('f_') or header_lower.startswith('freq_'):
                feature_cols.append(header)  # Keep original case
        
        logger.info(f"🎯 Extracted {len(feature_cols)} feature columns")
        return feature_cols
    
    def validate_vector_length(self, data_row: Dict, expected_length: int) -> bool:
        """
        Validate that the feature vector has the expected length.
        
        Args:
            data_row: Dictionary containing row data
            expected_length: Expected number of features
            
        Returns:
            True if vector length matches, False otherwise
        """
        feature_values = []
        for key, value in data_row.items():
            key_lower = key.lower().strip()
            if key_lower.startswith('f_') or key_lower.startswith('freq_'):
                try:
                    float(value)  # Validate it's a number
                    feature_values.append(value)
                except (ValueError, TypeError):
                    logger.warning(f"⚠️  Invalid feature value: {key}={value}")
                    return False
        
        actual_length = len(feature_values)
        if actual_length != expected_length:
            logger.error(f"❌ Vector length mismatch: expected={expected_length}, actual={actual_length}")
            return False
        
        return True
    
    async def upload_baseline_file(self, baseline_file_path: str) -> int:
        """
        Upload baseline file and get the dinsight_id.
        
        Args:
            baseline_file_path: Path to the baseline CSV file
            
        Returns:
            dinsight_id: The ID of the processed baseline data
        """
        logger.info(f"📂 Uploading baseline file: {baseline_file_path}")
        
        if not os.path.exists(baseline_file_path):
            raise FileNotFoundError(f"Baseline file not found: {baseline_file_path}")
        
        # Upload the baseline file
        data = FormData()
        with open(baseline_file_path, 'rb') as f:
            file_content = f.read()
            data.add_field('files', file_content, filename=os.path.basename(baseline_file_path))
        
        async with self.session.post(f"{self.api_base_url}/analyze", data=data) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Failed to upload baseline file: {error_text}")
            
            result = await response.json()
            upload_id = result.get('data', {}).get('id')
            
            if not upload_id:
                raise Exception("No upload ID returned from baseline upload")
        
        logger.info(f"✅ Baseline uploaded successfully. Upload ID: {upload_id}")
        
        # Poll for processing completion
        logger.info("⏳ Waiting for baseline processing to complete...")
        dinsight_id = await self._poll_for_processing_completion(upload_id)
        
        logger.info(f"🎯 Baseline processing completed. D'insight ID: {dinsight_id}")
        return dinsight_id
    
    async def _poll_for_processing_completion(self, upload_id: int, max_attempts: int = 60) -> int:
        """Poll the API until processing is complete and coordinates are available."""
        attempt = 0
        
        while attempt < max_attempts:
            try:
                # Check all available dinsight datasets to find our processed data
                async with self.session.get(f"{self.api_base_url}/dinsight/{upload_id}") as response:
                    if response.status == 200:
                        result = await response.json()
                        data = result.get('data')
                        
                        if (data and 
                            data.get('dinsight_x') and 
                            data.get('dinsight_y') and
                            len(data.get('dinsight_x', [])) > 0 and
                            len(data.get('dinsight_y', [])) > 0):
                            return data.get('dinsight_id') or upload_id
                
            except Exception as e:
                logger.debug(f"Polling attempt {attempt + 1} failed: {e}")
            
            attempt += 1
            await asyncio.sleep(2)  # Wait 2 seconds between polls
            
            if attempt % 10 == 0:
                logger.info(f"⏳ Still waiting for processing... ({attempt}/{max_attempts} attempts)")
        
        raise TimeoutError("Baseline processing did not complete within expected time")
    
    async def load_baseline_coordinates(self, baseline_id: int) -> Tuple[List[float], List[float]]:
        """
        Load baseline coordinates from an existing dinsight_id.
        
        Args:
            baseline_id: The dinsight_id of the baseline data
            
        Returns:
            Tuple of (dinsight_x, dinsight_y) coordinate arrays
        """
        logger.info(f"📊 Loading baseline coordinates for ID: {baseline_id}")
        
        async with self.session.get(f"{self.api_base_url}/dinsight/{baseline_id}") as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Failed to load baseline coordinates: {error_text}")
            
            result = await response.json()
            data = result.get('data')
            
            if not data:
                raise Exception("No baseline data found")
            
            dinsight_x = data.get('dinsight_x', [])
            dinsight_y = data.get('dinsight_y', [])
            
            if not dinsight_x or not dinsight_y:
                raise Exception("Baseline coordinates are empty or invalid")
            
            logger.info(f"✅ Loaded {len(dinsight_x)} baseline coordinate points")
            return dinsight_x, dinsight_y
    
    def load_monitor_data(self, monitor_file_path: str) -> List[Dict]:
        """
        Load monitor data from CSV file with schema normalization.
        
        Args:
            monitor_file_path: Path to the monitor CSV file
            
        Returns:
            List of dictionaries containing normalized monitor data rows
        """
        logger.info(f"📂 Loading monitor data from: {monitor_file_path}")
        
        if not os.path.exists(monitor_file_path):
            raise FileNotFoundError(f"Monitor file not found: {monitor_file_path}")
        
        monitor_data = []
        with open(monitor_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Get original headers and detect dataset family
            original_headers = reader.fieldnames
            if not original_headers:
                raise ValueError("CSV file has no headers")
            
            dataset_family = self.detect_dataset_family(original_headers)
            logger.info(f"🔍 Detected dataset family: {dataset_family}")
            
            # Normalize headers for API compatibility
            normalized_headers = self.normalize_headers(original_headers, dataset_family)
            
            # Extract feature columns for vector length validation
            feature_columns = self.extract_feature_columns(original_headers)
            expected_vector_length = len(feature_columns)
            logger.info(f"📏 Expected vector length: {expected_vector_length}")
            
            # Load data with validation
            for row_idx, row in enumerate(reader):
                # Create normalized row
                normalized_row = {}
                for orig_header, norm_header in zip(original_headers, normalized_headers):
                    normalized_row[norm_header] = row[orig_header]
                
                # Validate vector length for first few rows
                if row_idx < 3:  # Check first 3 rows for consistency
                    if not self.validate_vector_length(row, expected_vector_length):
                        raise ValueError(f"Vector length validation failed at row {row_idx + 1}")
                
                normalized_row['_row_index'] = row_idx
                monitor_data.append(normalized_row)
        
        logger.info(f"✅ Loaded {len(monitor_data)} monitor data points (family: {dataset_family})")
        logger.info(f"🔄 Schema normalization complete: {len(original_headers)} -> {len(normalized_headers)} columns")
        return monitor_data
    
    async def simulate_streaming(
        self, 
        baseline_id: int, 
        monitor_file_path: str,
        delay_seconds: float = 1.0,
        batch_size: int = 1
    ):
        """
        Simulate real-time streaming by sending monitor data point-by-point.
        
        Args:
            baseline_id: The dinsight_id to stream monitoring data to
            monitor_file_path: Path to the monitor CSV file
            delay_seconds: Delay between sending data points (simulates sensor frequency)
            batch_size: Number of points to send in each batch
        """
        self.baseline_id = baseline_id
        self.monitor_data = self.load_monitor_data(monitor_file_path)
        
        # Load baseline coordinates for comparison
        self.baseline_coordinates = await self.load_baseline_coordinates(baseline_id)
        
        # Update streaming configuration in backend
        await self._update_streaming_config(baseline_id, self.latest_glow_count, batch_size, delay_seconds)
        
        # Set streaming state
        self.is_streaming = True
        
        logger.info(f"🎬 Starting streaming simulation...")
        logger.info(f"   📊 Baseline ID: {baseline_id}")
        logger.info(f"   📈 Monitor points: {len(self.monitor_data)}")
        logger.info(f"   ⏱️  Delay: {delay_seconds}s per {batch_size} point(s)")
        logger.info(f"   📍 Baseline coordinates: {len(self.baseline_coordinates[0])} points")
        
        # Create a temporary CSV file for each batch
        temp_dir = Path("temp_streaming")
        temp_dir.mkdir(exist_ok=True)
        
        try:
            for i in range(0, len(self.monitor_data), batch_size):
                batch = self.monitor_data[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (len(self.monitor_data) + batch_size - 1) // batch_size
                
                # Create temporary CSV file for this batch
                temp_csv_path = temp_dir / f"monitor_batch_{batch_num}.csv"
                
                # Write batch to temporary CSV
                with open(temp_csv_path, 'w', newline='', encoding='utf-8') as f:
                    if batch:
                        fieldnames = [k for k in batch[0].keys() if k != '_row_index']
                        writer = csv.DictWriter(f, fieldnames=fieldnames)
                        writer.writeheader()
                        
                        for row in batch:
                            row_data = {k: v for k, v in row.items() if k != '_row_index'}
                            writer.writerow(row_data)
                
                # Send batch to API
                logger.info(f"🚀 Sending batch {batch_num}/{total_batches} ({len(batch)} points)")
                await self._send_monitor_batch(baseline_id, temp_csv_path)
                
                # Update progress
                self.stream_progress = i + len(batch)
                progress_pct = (self.stream_progress / len(self.monitor_data)) * 100
                logger.info(f"📊 Streaming progress: {self.stream_progress}/{len(self.monitor_data)} ({progress_pct:.1f}%)")
                
                # Clean up temporary file
                temp_csv_path.unlink()
                
                # Wait before sending next batch (simulate real-time frequency)
                if i + batch_size < len(self.monitor_data):
                    logger.info(f"⏳ Waiting {delay_seconds}s before next batch...")
                    await asyncio.sleep(delay_seconds)
        
        finally:
            # Set streaming state to completed
            self.is_streaming = False
            
            # Clean up temp directory
            if temp_dir.exists():
                for file in temp_dir.glob("*.csv"):
                    file.unlink()
                temp_dir.rmdir()
        
        logger.info("🎉 Streaming simulation completed!")
    
    async def _update_streaming_config(self, baseline_id: int, latest_glow_count: int, batch_size: int, delay_seconds: float):
        """Update the streaming configuration in the backend."""
        config_data = {
            "latest_glow_count": latest_glow_count,
            "batch_size": batch_size,
            "delay_seconds": delay_seconds
        }
        
        try:
            async with self.session.put(
                f"{self.api_base_url}/streaming/{baseline_id}/config",
                json=config_data
            ) as response:
                if response.status in (200, 201):
                    result = await response.json()
                    logger.info(f"✅ Streaming configuration updated: latest_glow_count={latest_glow_count}")
                else:
                    # Log warning but continue - config update is not critical
                    error_text = await response.text()
                    logger.warning(f"⚠️  Failed to update streaming config: {error_text}")
        except Exception as e:
            # Log warning but continue - config update is not critical
            logger.warning(f"⚠️  Could not update streaming config: {e}")
    
    async def _send_monitor_batch(self, baseline_id: int, csv_file_path: Path):
        """Send a batch of monitor data to the API with enhanced error handling."""
        
        # Pre-flight validation: read the CSV and check vector lengths
        try:
            with open(csv_file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames
                
                # Extract feature columns and count
                feature_count = 0
                for header in headers:
                    if header.lower().startswith('f_') or header.lower().startswith('freq_'):
                        feature_count += 1
                
                # Validate first row
                first_row = next(reader, None)
                if first_row and not self.validate_vector_length(first_row, feature_count):
                    logger.error(f"❌ Pre-flight check failed: vector length mismatch in batch CSV")
                    raise ValueError(f"Vector length validation failed for batch {csv_file_path.name}")
                    
                logger.debug(f"✅ Pre-flight check passed: {feature_count} features, vector length validated")
                
        except StopIteration:
            logger.error(f"❌ Empty CSV file: {csv_file_path.name}")
            raise ValueError(f"Empty CSV file: {csv_file_path.name}")
        
        # Send the batch to API
        data = FormData()
        with open(csv_file_path, 'rb') as f:
            file_content = f.read()
            data.add_field('file', file_content, filename=csv_file_path.name)
        
        async with self.session.post(f"{self.api_base_url}/monitor/{baseline_id}", data=data) as response:
            if response.status not in (200, 201):
                error_text = await response.text()
                
                # Enhanced error analysis
                if "baseline matrix empty" in error_text.lower():
                    logger.error(f"❌ Baseline configuration issue: baseline_id={baseline_id} not properly initialized")
                elif "dimension mismatch" in error_text.lower():
                    logger.error(f"❌ Vector dimension mismatch: monitor CSV features don't match baseline configuration")
                elif response.status == 400:
                    logger.error(f"❌ Bad request (400): CSV format or data validation failed")
                elif response.status == 500:
                    logger.error(f"❌ Server error (500): API processing failed")
                else:
                    logger.error(f"❌ HTTP {response.status}: {error_text}")
                
                # Debug: Save failed batch for inspection
                debug_path = f"debug_failed_batch_{baseline_id}.csv"
                import shutil
                shutil.copy2(csv_file_path, debug_path)
                logger.error(f"� Failed batch saved to: {debug_path}")
                logger.error(f"📄 Full API error response: {error_text}")
                
                raise Exception(f"Failed to send monitor batch (HTTP {response.status}): {error_text}")
            
            result = await response.json()
            logger.debug(f"✅ Batch sent successfully: {result}")
            return result
    
    async def get_streaming_status(self) -> Dict:
        """Get current streaming status for frontend display."""
        if not self.baseline_id:
            return {"status": "not_started"}
        
        # Get current monitor data count
        try:
            async with self.session.get(f"{self.api_base_url}/monitor/{self.baseline_id}/coordinates") as response:
                if response.status == 200:
                    result = await response.json()
                    current_points = len(result.get('dinsight_x', []))
                else:
                    current_points = 0
        except:
            current_points = 0
        
        return {
            "status": "streaming" if self.is_streaming else "completed",
            "baseline_id": self.baseline_id,
            "total_points": len(self.monitor_data),
            "streamed_points": current_points,
            "progress_percentage": (current_points / len(self.monitor_data)) * 100 if self.monitor_data else 0,
            "baseline_points": len(self.baseline_coordinates[0]) if self.baseline_coordinates else 0,
            "latest_glow_count": self.latest_glow_count,
            "is_streaming": self.is_streaming
        }


async def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description='D\'insight Real-Time Streaming Simulator')
    
    # Baseline data source (either existing ID or file to upload)
    baseline_group = parser.add_mutually_exclusive_group(required=True)
    baseline_group.add_argument('--baseline-id', type=int, 
                               help='Use existing baseline dinsight_id from database')
    baseline_group.add_argument('--baseline-file', type=str,
                               help='Upload new baseline file and use its dinsight_id')
    
    # Monitor data file (required)
    parser.add_argument('--monitor-file', type=str, 
                       default='test-data/Store D Line A - Monitor.csv',
                       help='Path to monitor CSV file (default: test-data/Store D Line A - Monitor.csv)')
    
    # Streaming parameters
    parser.add_argument('--delay', type=float, default=2.0,
                       help='Delay in seconds between data points (default: 2.0)')
    parser.add_argument('--batch-size', type=int, default=1,
                       help='Number of points to send per batch (default: 1)')
    parser.add_argument('--latest-glow-count', type=int, default=10,
                       help='Number of latest points to highlight with yellow glow during streaming (default: 10)')
    parser.add_argument('--api-url', type=str, default='http://localhost:8080/api/v1',
                       help='Base API URL (default: http://localhost:8080/api/v1)')
    
    args = parser.parse_args()
    
    try:
        async with StreamingSimulator(args.api_url) as simulator:
            # Set the latest glow count
            simulator.latest_glow_count = args.latest_glow_count
            
            # Determine baseline_id
            if args.baseline_id:
                baseline_id = args.baseline_id
                logger.info(f"🎯 Using existing baseline ID: {baseline_id}")
            else:
                baseline_id = await simulator.upload_baseline_file(args.baseline_file)
                logger.info(f"📤 Uploaded baseline file and got ID: {baseline_id}")
            
            # Start streaming simulation
            await simulator.simulate_streaming(
                baseline_id=baseline_id,
                monitor_file_path=args.monitor_file,
                delay_seconds=args.delay,
                batch_size=args.batch_size
            )
            
    except KeyboardInterrupt:
        logger.info("⏹️  Streaming simulation interrupted by user")
    except Exception as e:
        logger.error(f"❌ Streaming simulation failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
