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
        
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
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
        Load monitor data from CSV file.
        
        Args:
            monitor_file_path: Path to the monitor CSV file
            
        Returns:
            List of dictionaries containing monitor data rows
        """
        logger.info(f"📂 Loading monitor data from: {monitor_file_path}")
        
        if not os.path.exists(monitor_file_path):
            raise FileNotFoundError(f"Monitor file not found: {monitor_file_path}")
        
        monitor_data = []
        with open(monitor_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row_idx, row in enumerate(reader):
                row['_row_index'] = row_idx
                monitor_data.append(row)
        
        logger.info(f"✅ Loaded {len(monitor_data)} monitor data points")
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
            # Clean up temp directory
            if temp_dir.exists():
                for file in temp_dir.glob("*.csv"):
                    file.unlink()
                temp_dir.rmdir()
        
        logger.info("🎉 Streaming simulation completed!")
    
    async def _send_monitor_batch(self, baseline_id: int, csv_file_path: Path):
        """Send a batch of monitor data to the API."""
        data = FormData()
        with open(csv_file_path, 'rb') as f:
            file_content = f.read()
            data.add_field('file', file_content, filename=csv_file_path.name)
        
        async with self.session.post(f"{self.api_base_url}/monitor/{baseline_id}", data=data) as response:
            if response.status not in (200, 201):
                error_text = await response.text()
                logger.error(f"❌ Failed to send monitor batch: {error_text}")
                raise Exception(f"Failed to send monitor batch: {error_text}")
            
            result = await response.json()
            logger.debug(f"✅ Batch sent successfully: {result}")
    
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
            "status": "streaming",
            "baseline_id": self.baseline_id,
            "total_points": len(self.monitor_data),
            "streamed_points": current_points,
            "progress_percentage": (current_points / len(self.monitor_data)) * 100 if self.monitor_data else 0,
            "baseline_points": len(self.baseline_coordinates[0]) if self.baseline_coordinates else 0
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
    parser.add_argument('--api-url', type=str, default='http://localhost:8080/api/v1',
                       help='Base API URL (default: http://localhost:8080/api/v1)')
    
    args = parser.parse_args()
    
    try:
        async with StreamingSimulator(args.api_url) as simulator:
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
