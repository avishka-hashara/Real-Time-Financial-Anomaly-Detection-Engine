import pandas as pd
import redis
import json
import time

print("1. Connecting to Redis...")
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

print("2. Loading dataset...")
# Load the engineered data
df = pd.read_csv('creditcard_engineered.csv')

# Convert the dataframe to a list of dictionaries for fast iteration
transactions = df.to_dict(orient='records')

print("3. Starting real-time transaction stream...")
stream_name = 'txn_stream'

try:
    for i, tx in enumerate(transactions):
        # Push transaction to Redis stream
        r.xadd(stream_name, {'data': json.dumps(tx)})
        
        if i % 100 == 0:
            print(f"Pushed {i} transactions to stream...")
            
        time.sleep(0.1) # Simulate 10 transactions per second

except KeyboardInterrupt:
    print("\nProducer stopped.")