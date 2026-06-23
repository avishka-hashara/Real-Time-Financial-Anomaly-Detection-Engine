import pandas as pd
import numpy as np

# Load the Kaggle dataset
print("Loading dataset...")
df = pd.read_csv('creditcard.csv')

# Synthesize mock user and merchant IDs to practice behavioral features
np.random.seed(42)
df['user_id'] = np.random.randint(1, 5000, df.shape[0])
df['merchant_id'] = np.random.randint(1, 1000, df.shape[0])
df['country'] = np.random.choice(['US', 'UK', 'CA', 'AU', 'FR'], df.shape[0])

# Convert the 'Time' column (seconds) to a mock datetime for time-window calculations
start_time = pd.Timestamp('2024-01-01 00:00:00')
df['timestamp'] = start_time + pd.to_timedelta(df['Time'], unit='s')

print(f"Data prepped! Shape: {df.shape}")
print(df[['Amount', 'Class', 'user_id', 'merchant_id', 'timestamp']].head())