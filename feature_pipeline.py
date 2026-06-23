import pandas as pd
import numpy as np

print("1. Loading dataset and generating base columns...")
df = pd.read_csv('creditcard.csv')

# Synthesize mock user/merchant IDs and timestamps (from your previous step)
np.random.seed(42)
df['user_id'] = np.random.randint(1, 5000, df.shape[0])
df['merchant_id'] = np.random.randint(1, 1000, df.shape[0])
df['country'] = np.random.choice(['US', 'UK', 'CA', 'AU', 'FR'], df.shape[0])
start_time = pd.Timestamp('2024-01-01 00:00:00')
df['timestamp'] = start_time + pd.to_timedelta(df['Time'], unit='s')

print("2. Sorting data chronologically by user...")
# Critical step: Time-series features require data to be sorted by time per user
df = df.sort_values(by=['user_id', 'timestamp']).reset_index(drop=True)

print("3. Generating behavioral features...")
# Feature 1: Hour of day
df['hour_of_day'] = df['timestamp'].dt.hour

# Feature 2: Time since last transaction (in minutes)
df['time_since_last_txn_mins'] = df.groupby('user_id')['timestamp'].diff().dt.total_seconds() / 60.0
df['time_since_last_txn_mins'] = df['time_since_last_txn_mins'].fillna(0)

# Feature 3: Is this a new merchant for the user?
# If the user_id + merchant_id combination hasn't been seen yet, it's new.
df['is_new_merchant'] = (~df.duplicated(subset=['user_id', 'merchant_id'])).astype(int)

# Feature 4: Merchant Country Change
# 1 if the country is different from the user's previous transaction country
df['merchant_country_change'] = (df['country'] != df.groupby('user_id')['country'].shift(1)).astype(int)
df.loc[df.groupby('user_id').head(1).index, 'merchant_country_change'] = 0 # Fix first transaction

# Feature 5: Transaction Velocity (Count in last hour)
print("   -> Calculating rolling velocity...")
df.set_index('timestamp', inplace=True)
df['txn_velocity_1h'] = df.groupby('user_id')['Amount'].transform(lambda x: x.rolling('1h').count())
df.reset_index(inplace=True)

# Feature 6: Amount Z-Score (Using an expanding window to simulate real-time knowledge)
print("   -> Calculating Z-Scores...")
df['expanding_mean'] = df.groupby('user_id')['Amount'].transform(lambda x: x.expanding().mean().shift(1))
df['expanding_std'] = df.groupby('user_id')['Amount'].transform(lambda x: x.expanding().std().shift(1))

# Avoid division by zero warnings by using np.where
df['amount_zscore'] = np.where(
    df['expanding_std'].isna() | (df['expanding_std'] == 0), 
    0, 
    (df['Amount'] - df['expanding_mean']) / df['expanding_std']
)

# Clean up temporary columns
df.drop(columns=['expanding_mean', 'expanding_std'], inplace=True)

print("4. Saving feature-engineered dataset...")
# Save this to a new CSV so we don't have to re-run this in Phase 2
output_file = 'creditcard_engineered.csv'
df.to_csv(output_file, index=False)

print(f"Phase 1 Complete! Data saved to {output_file}.")
print(df[['user_id', 'Amount', 'amount_zscore', 'txn_velocity_1h', 'time_since_last_txn_mins']].head(10))