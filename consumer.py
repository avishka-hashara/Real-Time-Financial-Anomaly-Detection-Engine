import redis
import json
import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model

print("1. Loading Models and Thresholds...")
iso_forest = joblib.load('models/iso_forest.pkl')['model']
iso_scaler = joblib.load('models/iso_forest.pkl')['scaler']

lstm_model = load_model('models/lstm_autoencoder.h5', compile=False)
lstm_scaler = joblib.load('models/lstm_scaler.pkl')

with open('models/threshold.txt', 'r') as f:
    LSTM_THRESHOLD = float(f.read())

pca_features = [f'V{i}' for i in range(1, 29)]
behavioral_features = ['amount_zscore', 'hour_of_day', 'is_new_merchant', 'merchant_country_change', 'txn_velocity_1h', 'time_since_last_txn_mins', 'Amount']
feature_cols = pca_features + behavioral_features

print("2. Connecting to Redis...")
r = redis.Redis(host='localhost', port=6379, decode_responses=True)
stream_name = 'txn_stream'

# In-memory state to hold the last 10 transactions per user for the LSTM
user_history = {}

def ensemble_score(tx_data):
    user_id = tx_data['user_id']
    
    # --- 1. ISOLATION FOREST (Single Transaction Scoring) ---
    tx_df = pd.DataFrame([tx_data])
    tx_scaled_iso = iso_scaler.transform(tx_df[feature_cols])
    
    # IF returns -1 for anomaly, 1 for normal. We convert to a 0-100 risk score.
    iso_raw = iso_forest.decision_function(tx_scaled_iso)[0]
    iso_risk = max(0, min(100, (0.5 - iso_raw) * 100))
    
    # --- 2. LSTM AUTOENCODER (Sequential Scoring) ---
    lstm_risk = 0
    if user_id not in user_history:
        user_history[user_id] = []
        
    user_history[user_id].append(tx_data)
    
    # Keep only the last 10 transactions
    if len(user_history[user_id]) > 10:
        user_history[user_id].pop(0)
        
    if len(user_history[user_id]) == 10:
        # We have enough history to run the LSTM
        seq_df = pd.DataFrame(user_history[user_id])
        seq_scaled = lstm_scaler.transform(seq_df[feature_cols])
        
        # Reshape for LSTM: (1 batch, 10 timesteps, 35 features)
        X_seq = np.expand_dims(seq_scaled, axis=0)
        
        pred = lstm_model.predict(X_seq, verbose=0)
        mae = np.mean(np.abs(pred - X_seq))
        
        # Scale MAE to a 0-100 risk score based on the threshold
        lstm_risk = min(100, (mae / LSTM_THRESHOLD) * 50)
        
    # --- 3. ENSEMBLE LOGIC ---
    # Combine scores (e.g., 40% IF, 60% LSTM)
    final_risk = (iso_risk * 0.4) + (lstm_risk * 0.6)
    
    return final_risk, tx_data['Class']

print("3. Listening for transactions...")
last_id = '0'

while True:
    try:
        # Read up to 10 messages from the stream
        messages = r.xread({stream_name: last_id}, count=10, block=1000)
        
        if messages:
            for stream, msg_list in messages:
                for msg_id, msg_data in msg_list:
                    tx = json.loads(msg_data['data'])
                    
                    risk_score, true_class = ensemble_score(tx)
                    
                    # Print alert if risk is high or if it's an actual fraud case to verify
                    if risk_score > 70 or true_class == 1:
                        alert = "[ALERT] HIGH RISK" if risk_score > 70 else "[WARNING] FRAUD MISSED?"
                        print(f"{alert} | User: {tx['user_id']} | Amt: ${tx['Amount']:.2f} | Risk Score: {risk_score:.1f}/100 | Actual Fraud: {'Yes' if true_class == 1 else 'No'}")
                    
                    last_id = msg_id
    except KeyboardInterrupt:
        print("\nConsumer stopped.")
        break