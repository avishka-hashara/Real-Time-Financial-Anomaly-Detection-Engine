import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, RepeatVector, TimeDistributed, Dense
from sklearn.preprocessing import StandardScaler
import joblib
import os

print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

print("1. Loading engineered dataset...")
df = pd.read_csv('creditcard_engineered.csv')

pca_features = [f'V{i}' for i in range(1, 29)]
behavioral_features = [
    'amount_zscore', 'hour_of_day', 'is_new_merchant',
    'merchant_country_change', 'txn_velocity_1h', 'time_since_last_txn_mins', 'Amount'
]
feature_cols = pca_features + behavioral_features

print("2. Scaling features...")
scaler = StandardScaler()
# We fit the scaler ONLY on normal transactions to prevent fraud from skewing the mean/std
normal_df = df[df['Class'] == 0]
scaler.fit(normal_df[feature_cols])

df_scaled = df.copy()
df_scaled[feature_cols] = scaler.transform(df[feature_cols])

print("3. Building temporal sequences (Window Size = 10)...")
SEQ_LEN = 10

def create_sequences(user_df):
    data = user_df[feature_cols].values
    labels = user_df['Class'].values
    seqs, seq_labels = [], []
    
    # Create sliding windows of length 10
    for i in range(len(data) - SEQ_LEN):
        seqs.append(data[i : i + SEQ_LEN])
        seq_labels.append(labels[i + SEQ_LEN - 1]) # Label is based on the last transaction in the window
        
    return seqs, seq_labels

# Group by user and create sequences
all_seqs, all_labels = [], []
for user_id, group in df_scaled.groupby('user_id'):
    if len(group) > SEQ_LEN:
        s, l = create_sequences(group)
        all_seqs.extend(s)
        all_labels.extend(l)

X_seq = np.array(all_seqs)
y_seq = np.array(all_labels)

# Separate normal and fraud sequences
X_normal = X_seq[y_seq == 0]
X_fraud = X_seq[y_seq == 1]

print(f"   -> Normal Sequences: {X_normal.shape}")
print(f"   -> Fraud Sequences: {X_fraud.shape}")

print("4. Building LSTM Autoencoder Architecture...")
def build_autoencoder(seq_len, n_features, encoding_dim=32):
    inputs = Input(shape=(seq_len, n_features))
    encoded = LSTM(encoding_dim, activation='relu')(inputs)
    repeated = RepeatVector(seq_len)(encoded)
    decoded = LSTM(encoding_dim, activation='relu', return_sequences=True)(repeated)
    output = TimeDistributed(Dense(n_features))(decoded)
    
    model = Model(inputs, output)
    model.compile(optimizer='adam', loss='mae')
    return model

model = build_autoencoder(SEQ_LEN, len(feature_cols))
model.summary()

print("5. Training LSTM (Only on Normal Transactions)...")
# We use a validation split to monitor reconstruction error on unseen normal data
history = model.fit(
    X_normal, X_normal, # Autoencoder predicts its own input
    epochs=10,          # Keep epochs low for the sprint, increase later if needed
    batch_size=256,
    validation_split=0.1,
    verbose=1
)

print("6. Calculating Anomaly Threshold...")
# Predict on validation data to find the normal distribution of errors
X_val = X_normal[-int(len(X_normal)*0.1):] 
val_predictions = model.predict(X_val)
val_mae = np.mean(np.abs(val_predictions - X_val), axis=(1, 2))

# Threshold: mean + 3 standard deviations 
threshold = np.mean(val_mae) + 3 * np.std(val_mae)
print(f"   -> Reconstruction Error Threshold: {threshold:.4f}")

print("7. Saving LSTM Model and Scaler...")
os.makedirs('models', exist_ok=True)
model.save('models/lstm_autoencoder.h5')
joblib.dump(scaler, 'models/lstm_scaler.pkl')
# Save the threshold so we can use it in our live stream later
with open('models/threshold.txt', 'w') as f:
    f.write(str(threshold))

print("Phase 3 Complete! LSTM ready for real-time scoring.")