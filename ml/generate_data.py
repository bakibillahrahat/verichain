import numpy as np
import pandas as pd
import os

np.random.seed(42)

def generate_genuine(n=2000):
    data = []
    for _ in range(n):
        scan_count = np.clip(np.random.normal(2, 1), 1, 5)
        scan_frequency = np.random.normal(0.1, 0.05)
        min_interval = np.random.normal(86400, 43200)
        interval_std = np.random.normal(21600, 10800)
        unique_locations = np.random.randint(1, 3)
        max_spread = np.random.normal(20, 15)
        impossible_travel = 0
        path_length = np.random.randint(3, 6)
        path_deviation = 0
        manufacturer_valid = 1
        unique_scanners = np.random.randint(1, 3)
        post_sale_anomaly = 0
        
        data.append([
            scan_count, scan_frequency, min_interval, interval_std,
            unique_locations, max_spread, impossible_travel, path_length,
            path_deviation, manufacturer_valid, unique_scanners, post_sale_anomaly, 0
        ])
    return data

def generate_counterfeits():
    data = []
    for _ in range(200): # S1 Basic clone
        data.append([np.random.uniform(5, 50), np.random.uniform(1, 10), np.random.uniform(100, 10000), np.random.uniform(100, 10000), np.random.uniform(3, 20), np.random.uniform(100, 5000), 1 if np.random.rand() < 0.3 else 0, np.random.randint(3, 6), 0, 1, np.random.randint(3, 20), 0, 1])
    for _ in range(200): # S2 Sophisticated clone
        data.append([np.random.uniform(3, 10), np.random.uniform(0.1, 2), np.random.uniform(1000, 50000), np.random.uniform(1000, 20000), np.random.randint(2, 6), np.random.uniform(5, 50), 0, np.random.randint(3, 6), 0, 1, np.random.randint(2, 6), 0, 1])
    for _ in range(200): # S3 Replay
        data.append([np.random.uniform(10, 100), np.random.uniform(10, 100), np.random.uniform(1, 100), np.random.uniform(1, 100), 1, 0, 0, np.random.randint(3, 6), 0, 1, 1, 0, 1])
    for _ in range(200): # S4 Supply chain insertion
        data.append([np.random.uniform(1, 3), np.random.uniform(0.01, 0.1), np.random.uniform(86400, 100000), np.random.uniform(0, 1000), 1, 0, 0, 1, 1, 1 if np.random.rand() < 0.5 else 0, 1, 0, 1])
    for _ in range(200): # S5 Fake manufacturer
        data.append([np.random.uniform(1, 5), np.random.uniform(0.01, 0.5), np.random.uniform(10000, 100000), np.random.uniform(1000, 10000), np.random.randint(1, 4), np.random.uniform(10, 100), 0, np.random.randint(2, 5), 1, 0, np.random.randint(1, 4), 0, 1])
    for _ in range(200): # S6 Impossible travel
        data.append([np.random.uniform(2, 10), np.random.uniform(1, 20), np.random.uniform(10, 1000), np.random.uniform(10, 1000), np.random.uniform(5, 10), np.random.uniform(1000, 10000), 1, np.random.randint(3, 6), 0, 1, np.random.uniform(5, 10), 0, 1])
    for _ in range(200): # S7 Post-sale anomaly
        data.append([np.random.uniform(10, 50), np.random.uniform(1, 10), np.random.uniform(100, 10000), np.random.uniform(100, 10000), np.random.randint(2, 5), np.random.uniform(10, 50), 0, np.random.randint(3, 6), 0, 1, np.random.randint(2, 5), 1, 1])
    for _ in range(200): # S8 Unauthorized retailer
        data.append([np.random.uniform(1, 5), np.random.uniform(0.01, 0.5), np.random.uniform(10000, 100000), np.random.uniform(1000, 10000), np.random.randint(1, 3), np.random.uniform(10, 50), 0, np.random.randint(3, 6), 1, 1, np.random.randint(1, 3), 0, 1])
    for _ in range(200): # S9 Mass duplication
        data.append([np.random.uniform(20, 100), np.random.uniform(5, 50), np.random.uniform(10, 1000), np.random.uniform(10, 1000), np.random.uniform(10, 50), np.random.uniform(1000, 20000), 1 if np.random.rand() < 0.8 else 0, np.random.randint(3, 6), 0, 1, np.random.uniform(10, 50), 1 if np.random.rand() < 0.5 else 0, 1])
    for _ in range(200): # S10 Slow clone
        data.append([np.random.uniform(3, 8), np.random.uniform(0.001, 0.05), np.random.uniform(100000, 1000000), np.random.uniform(10000, 100000), np.random.randint(2, 6), np.random.uniform(50, 500), 0, np.random.randint(3, 6), 0, 1, np.random.randint(2, 6), 1 if np.random.rand() < 0.2 else 0, 1])
    return data

def main():
    print("Generating synthetic dataset...")
    genuine = generate_genuine(2000)
    counterfeits = generate_counterfeits()
    
    data = genuine + counterfeits
    df = pd.DataFrame(data, columns=[
        'scan_count', 'scan_frequency', 'min_interval', 'interval_std',
        'unique_locations', 'max_spread', 'impossible_travel', 'path_length',
        'path_deviation', 'manufacturer_valid', 'unique_scanners', 'post_sale_anomaly', 'label'
    ])
    
    for col in ['scan_count', 'scan_frequency', 'min_interval', 'interval_std', 'unique_locations', 'max_spread', 'path_length', 'unique_scanners']:
        noise = np.random.normal(0, 0.1 * df[col].std(), size=len(df))
        df[col] = np.maximum(0, df[col] + noise)
    
    os.makedirs('ml/data', exist_ok=True)
    df.to_csv('ml/data/synthetic_dataset.csv', index=False)
    print("Saved to ml/data/synthetic_dataset.csv")

if __name__ == "__main__":
    main()
