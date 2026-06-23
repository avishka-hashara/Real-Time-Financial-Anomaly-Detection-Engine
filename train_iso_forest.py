import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
import joblib
import os

print("1. Loading engineered dataset...")
df = pd.read_csv('creditcard_engineered.csv')

# Define the features we want the model to learn from.
# We combine the original PCA features (V1-V28) with your new behavioral features.
pca_features = [f'V{i}' for i in range(1, 29)]
behavioral_features = [
    'amount_zscore', 'hour_of_day', 'is_new_merchant',
    'merchant_country_change', 'txn_velocity_1h', 'time_since_last_txn_mins', 'Amount'
]
feature_cols = pca_features + behavioral_features

X = df[feature_cols]
y = df['Class']  # Used ONLY for evaluation, not training

print("2. Splitting data (80% train, 20% test)...")
# Stratify ensures our 0.17% fraud rate is proportionally split between train and test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("3. Scaling features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print("4. Training Isolation Forest (this might take 1-3 minutes)...")
iso_forest = IsolationForest(
    n_estimators=200,
    contamination=0.02,  # Assume a 2% anomaly rate for the baseline threshold
    random_state=42,
    n_jobs=-1  # Utilize all CPU cores for faster training
)
iso_forest.fit(X_train_scaled)

print("5. Evaluating model performance...")
# decision_function returns negative values for anomalies and positive for normal data.
# We invert it (multiply by -1) so higher scores = more anomalous, aligning with standard ROC AUC.
y_scores = -iso_forest.decision_function(X_test_scaled)
auc_roc = roc_auc_score(y_test, y_scores)

print(f"--> Isolation Forest AUC-ROC: {auc_roc:.4f}")

print("6. Saving model and scaler...")
os.makedirs('models', exist_ok=True)
joblib.dump({'model': iso_forest, 'scaler': scaler}, 'models/iso_forest.pkl')
print("Phase 2 Complete! Model saved to models/iso_forest.pkl")